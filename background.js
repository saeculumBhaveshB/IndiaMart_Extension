// Listen for web requests to the target API
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    // We're specifically looking for POST requests to getContactList
    if (details.method === "POST" && details.url.includes("getContactList")) {
      // Get the request body if available
      if (details.requestBody && details.requestBody.raw) {
        try {
          const decoder = new TextDecoder();
          const rawData = details.requestBody.raw[0].bytes;
          const requestData = JSON.parse(decoder.decode(rawData));
        } catch (error) {
          // Error parsing request body
        }
      }

      // Notify our content script that an API call was made
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          try {
            chrome.tabs
              .sendMessage(tabs[0].id, {
                action: "API_CALL_DETECTED",
                url: details.url,
              })
              .catch((err) => {
                // Content script might not be ready yet, this is expected in some cases
              });
          } catch (error) {
            // Handle any other errors
          }
        }
      });
    }
  },
  {
    urls: ["https://seller.indiamart.com/lmsreact/getContactList*"],
  },
  ["requestBody"] // We need this to access the request body
);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LEAD_DATA") {
    try {
      // Check if this is a large data notification
      if (message.isLarge) {
        // Store the summary data in local storage
        chrome.storage.local.set(
          { indiamartLeads: message.data, isPartialData: true },
          () => {
            if (chrome.runtime.lastError) {
              sendResponse({
                status: "error",
                message: "Failed to store summary data",
              });
              return;
            }

            // Notify any open popups about the new data
            try {
              chrome.runtime.sendMessage(
                {
                  type: "NEW_LEADS",
                  data: message.data,
                  isPartialData: true,
                  originalSize: message.originalSize,
                  timestamp: new Date().toISOString(),
                  isComplete: message.isComplete || false, // Forward the isComplete flag
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    // No popup listening or error
                  }
                }
              );
            } catch (error) {
              // Error sending message to popup
            }

            sendResponse({
              status: "success",
              message: "Summary data stored successfully",
            });
          }
        );
      } else {
        // Process the data to ensure it has the correct structure
        const processedData = ensureCorrectDataStructure(message.data);

        // Add metadata if not present
        if (!processedData.timestamp) {
          processedData.timestamp = new Date().toISOString();
        }
        if (!processedData.source) {
          processedData.source = "indiamart_api";
        }

        // Preserve originalTotalCount if it exists
        if (message.data && message.data.originalTotalCount) {
          processedData.originalTotalCount = message.data.originalTotalCount;
        }

        // Set totalLeads if not present
        if (!processedData.totalLeads && processedData.data) {
          processedData.totalLeads = processedData.data.length;
        }

        // Include isRefresh if defined
        if (typeof message.isRefresh !== "undefined") {
          processedData.isRefresh = message.isRefresh;
        }

        // Check the size of the data
        const dataSize = JSON.stringify(processedData).length;

        // Store the data in local storage
        chrome.storage.local.set(
          { indiamartLeads: processedData, isPartialData: false },
          () => {
            if (chrome.runtime.lastError) {
              sendResponse({
                status: "error",
                message: "Failed to store data",
              });
              return;
            }

            // Notify any open popups about the new data
            try {
              chrome.runtime.sendMessage(
                {
                  type: "NEW_LEADS",
                  data: processedData,
                  isPartialData: false,
                  timestamp: new Date().toISOString(),
                  isComplete: message.isComplete || false, // Forward the isComplete flag
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    // No popup listening or error
                  }
                }
              );
            } catch (error) {
              // Error sending message to popup
            }

            sendResponse({
              status: "success",
              message: "Data stored successfully",
            });
          }
        );
      }
    } catch (error) {
      console.error("Error in background script:", error);
      sendResponse({
        status: "error",
        message: error.message || "Unknown error in background script",
      });
    }

    return true; // Keep the message channel open for async response
  } else if (message.type === "FETCH_PROGRESS") {
    try {
      // Forward the progress data to any open popups
      chrome.runtime.sendMessage({
        type: "FETCH_PROGRESS_UPDATE",
        data: message.data,
      });

      sendResponse({ status: "success" });
    } catch (error) {
      console.error("Error forwarding progress update:", error);
      sendResponse({ status: "error", message: error.message });
    }

    return true; // Keep the message channel open for async response
  } else if (message.type === "FETCH_ERROR") {
    // Forward error messages to the popup
    try {
      chrome.runtime.sendMessage(
        {
          type: "FETCH_ERROR",
          error: message.error,
          details: message.details || {},
        },
        (response) => {
          if (chrome.runtime.lastError) {
            // No popup listening or error
          }
        }
      );
    } catch (error) {
      // Error sending error to popup
    }

    sendResponse({ status: "success" });
    return true;
  } else if (message.type === "STOP_REFRESH_ANIMATION") {
    // Forward the stop animation message to the popup
    try {
      chrome.runtime.sendMessage(
        {
          type: "STOP_REFRESH_ANIMATION",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            // No popup listening or error
            console.warn(
              "Background: Error forwarding stop animation message to popup:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
    } catch (error) {
      // Error sending message to popup
      console.error(
        "Background: Error forwarding stop animation message:",
        error
      );
    }

    sendResponse({ status: "success" });
    return true;
  } else if (message.type === "API_CANCELLED") {
    try {
      // Forward the cancellation notification to any open popups with high priority
      chrome.runtime.sendMessage({
        type: "API_CANCELLED_NOTIFICATION",
        timestamp: message.timestamp,
        forceUpdate: true,
        success: message.success || true,
        message: message.message || "API calls cancelled",
      });

      // Also clear data from storage to ensure UI is in sync
      chrome.storage.local.remove(["indiamartLeads", "leadData"], function () {
        console.log("Background: Storage cleared after API cancellation");
      });

      // Respond to the content script
      sendResponse({ status: "success" });
    } catch (error) {
      console.error("Error forwarding API cancellation notification:", error);
      sendResponse({ status: "error", message: error.message });
    }

    return true; // Keep the message channel open for async response
  }
});

// Function to ensure data has the correct structure
function ensureCorrectDataStructure(data) {
  // If data is null or undefined, return an empty structure
  if (!data) {
    return { data: [] };
  }

  // If data is already in the correct format, return it as is
  if (data.data && Array.isArray(data.data)) {
    return data;
  }

  // If data itself is an array, wrap it in the expected structure
  if (Array.isArray(data)) {
    return { data: data };
  }

  // Look for arrays in the response that might contain the leads
  if (typeof data === "object") {
    // Check common field names in IndiaMart API responses
    const possibleArrayFields = [
      "data",
      "leads",
      "records",
      "items",
      "results",
      "contacts",
      "queries",
    ];

    // First check the common field names
    for (const field of possibleArrayFields) {
      if (data[field] && Array.isArray(data[field])) {
        return { data: data[field] };
      }
    }

    // If not found in common fields, check all fields
    for (const key in data) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        return { data: data[key] };
      }
    }

    // If we still haven't found an array, check if there's a nested structure
    for (const key in data) {
      if (
        data[key] &&
        typeof data[key] === "object" &&
        !Array.isArray(data[key])
      ) {
        // Recursively check this object
        const result = ensureCorrectDataStructure(data[key]);
        if (result.data && Array.isArray(result.data)) {
          return result;
        }
      }
    }
  }

  // If we couldn't find any arrays, create an empty structure
  return { data: [] };
}

// Listen for tab updates to detect when we're on the IndiaMart Lead Manager page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when the page is fully loaded
  if (changeInfo.status === "complete" && tab.url) {
    // Check if we're on the IndiaMart Lead Manager page
    if (
      tab.url.includes("seller.indiamart.com") &&
      (tab.url.includes("messagecentre") || tab.url.includes("lead-manager"))
    ) {
      // Execute our content script to extract lead data
      try {
        chrome.scripting
          .executeScript({
            target: { tabId: tabId },
            function: () => {
              // This will be executed in the context of the page
              // Our content script should already be injected via manifest.json
              // This is just a backup to ensure it's running
              if (window.indiamartExtensionInitialized) {
                return;
              }
              window.indiamartExtensionInitialized = true;

              // Dispatch a custom event that our content script can listen for
              document.dispatchEvent(
                new CustomEvent("INDIAMART_EXTENSION_INITIALIZED")
              );
            },
          })
          .catch((err) => {
            // Error executing script
          });
      } catch (error) {
        // Error with scripting API
      }
    }
  }
});

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  // Check if we have existing data in storage
  chrome.storage.local.get(["indiamartLeads"], (result) => {
    if (result.indiamartLeads) {
      // Fix the structure of the stored data if needed
      const processedData = ensureCorrectDataStructure(result.indiamartLeads);

      // Update the storage with the fixed structure
      chrome.storage.local.set({ indiamartLeads: processedData });
    } else {
      // No existing data
    }
  });
});
