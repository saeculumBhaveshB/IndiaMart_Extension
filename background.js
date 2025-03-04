// Listen for web requests to the target API
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    // We're specifically looking for POST requests to getContactList
    if (details.method === "POST" && details.url.includes("getContactList")) {
      console.log(
        "IndiaMart Extension: Detected getContactList API request in background"
      );

      // Get the request body if available
      if (details.requestBody && details.requestBody.raw) {
        try {
          const decoder = new TextDecoder();
          const rawData = details.requestBody.raw[0].bytes;
          const requestData = JSON.parse(decoder.decode(rawData));
          console.log("IndiaMart Extension: Request data:", requestData);
        } catch (error) {
          console.error(
            "IndiaMart Extension: Error parsing request body",
            error
          );
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
                console.log("Could not send message to content script:", err);
              });
          } catch (error) {
            // Handle any other errors
            console.log("Error sending message to content script:", error);
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
  console.log("Background: Received message type:", message.type);

  if (message.type === "LEAD_DATA") {
    console.log("Background: Received lead data");

    try {
      // Process the data to ensure correct structure
      const processedData = ensureCorrectDataStructure(message.data);

      // Log the size of the data for debugging
      const dataSize = JSON.stringify(processedData).length;
      console.log(`Background: Data size: ${dataSize} bytes`);

      // Store the data in local storage
      chrome.storage.local.set({ indiamartLeads: processedData }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Background: Error storing data:",
            chrome.runtime.lastError
          );
          sendResponse({ status: "error", message: "Failed to store data" });
          return;
        }

        console.log("Background: Data stored in local storage");

        // Notify any open popups about the new data
        try {
          chrome.runtime.sendMessage(
            {
              type: "NEW_LEADS",
              data: processedData,
              isRefresh: message.isRefresh || false,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log(
                  "Background: No popup listening or error:",
                  chrome.runtime.lastError
                );
                // This is expected if popup is not open, not an error
              } else {
                console.log(
                  "Background: Popup received data, response:",
                  response
                );
              }
            }
          );

          // Send success response back to content script
          sendResponse({
            status: "success",
            message: "Data stored successfully",
          });
        } catch (error) {
          console.error("Background: Error sending message to popup:", error);
          sendResponse({
            status: "partial",
            message: "Data stored but failed to notify popup",
          });
        }
      });
    } catch (error) {
      console.error("Background: Error processing data:", error);
      sendResponse({ status: "error", message: "Failed to process data" });
    }

    return true; // Keep the message channel open for async response
  }
});

// Function to ensure the data has the correct structure
function ensureCorrectDataStructure(data) {
  try {
    console.log("Background: Ensuring correct data structure");

    // If data is null or undefined, return empty structure
    if (!data) {
      console.log(
        "Background: Data is null or undefined, returning empty structure"
      );
      return {
        data: [],
        timestamp: new Date().toISOString(),
      };
    }

    // If data is already in the correct format, return it
    if (data && data.data && Array.isArray(data.data)) {
      console.log(
        `Background: Data already in correct format with ${data.data.length} items`
      );
      return data;
    }

    // If data is an array, wrap it in the correct structure
    if (Array.isArray(data)) {
      console.log(
        `Background: Data is an array with ${data.length} items, wrapping it`
      );
      return {
        data: data,
        timestamp: new Date().toISOString(),
      };
    }

    // If data is an object but not in the correct format
    if (data && typeof data === "object") {
      // Look for arrays in the data
      for (const key in data) {
        if (Array.isArray(data[key])) {
          console.log(
            `Background: Found array in key "${key}" with ${data[key].length} items`
          );
          return {
            data: data[key],
            timestamp: data.timestamp || new Date().toISOString(),
          };
        }
      }

      // If no arrays found, check if it's a single lead object
      if (
        data.contacts_name ||
        data.contact_name ||
        data.contact_last_product
      ) {
        console.log(
          "Background: Data appears to be a single lead object, wrapping in array"
        );
        return {
          data: [data],
          timestamp: new Date().toISOString(),
        };
      }

      console.log(
        "Background: Data is an object but no arrays found, returning empty structure"
      );
      return {
        data: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Default empty structure
    console.log(
      "Background: Data is not in a recognized format, returning empty structure"
    );
    return {
      data: [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Background: Error in ensureCorrectDataStructure:", error);
    // Return empty structure in case of error
    return {
      data: [],
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
}

// Listen for tab updates to detect when the user navigates to the Lead Manager page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("seller.indiamart.com/messagecentre")
  ) {
    console.log(
      "IndiaMart Extension: Detected navigation to IndiaMart message center"
    );

    // Execute a content script to check if we're on the Lead Manager page
    try {
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          function: () => {
            // This function runs in the context of the page
            console.log(
              "IndiaMart Extension: Checking if on Lead Manager page"
            );

            // Check if we're on the Lead Manager page
            const isLeadManagerPage =
              document.querySelector('[data-testid="lead-manager"]') ||
              document.querySelector(".lead-manager") ||
              document.querySelector('[class*="leadManager"]') ||
              document
                .querySelector("h1, h2, h3, h4, h5")
                ?.textContent?.includes("Lead Manager");

            return isLeadManagerPage !== null;
          },
        })
        .then((results) => {
          if (results && results[0] && results[0].result) {
            console.log("IndiaMart Extension: Lead Manager page detected");

            // Notify the content script
            chrome.tabs
              .sendMessage(tabId, {
                action: "LEAD_MANAGER_PAGE_DETECTED",
              })
              .catch((err) => {
                // Content script might not be ready yet
                console.log("Could not send message to content script:", err);
              });
          }
        })
        .catch((error) => {
          console.error("IndiaMart Extension: Error executing script", error);
        });
    } catch (error) {
      console.error("IndiaMart Extension: Error with scripting API", error);
    }
  }
});

// Initialize when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("IndiaMart Extension: Installed or updated");

  // Check if we already have data stored
  chrome.storage.local.get("indiamartLeads", function (result) {
    if (result.indiamartLeads) {
      console.log("IndiaMart Extension: Found existing data in storage");

      // Ensure the stored data has the correct structure
      const processedData = ensureCorrectDataStructure(result.indiamartLeads);

      // If the structure needed to be fixed, update the storage
      if (processedData !== result.indiamartLeads) {
        console.log("IndiaMart Extension: Fixing structure of stored data");
        chrome.storage.local.set({ indiamartLeads: processedData });
      }

      if (processedData.data && Array.isArray(processedData.data)) {
        console.log(
          `IndiaMart Extension: ${processedData.data.length} leads already stored`
        );
      }
    } else {
      console.log("IndiaMart Extension: No existing data in storage");
    }
  });
});
