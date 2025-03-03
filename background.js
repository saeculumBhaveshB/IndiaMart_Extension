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

// Function to ensure data has the correct structure
function ensureCorrectDataStructure(data) {
  console.log("IndiaMart Extension: Ensuring correct data structure");
  console.log(
    "IndiaMart Extension: Original data structure:",
    JSON.stringify(data).substring(0, 200) + "..."
  );

  // If data is null or undefined, return an empty structure
  if (!data) {
    console.log(
      "IndiaMart Extension: Data is null or undefined, creating empty structure"
    );
    return { data: [] };
  }

  // If data is already in the correct format, return it as is
  if (data.data && Array.isArray(data.data)) {
    console.log("IndiaMart Extension: Data already has correct structure");
    return data;
  }

  // If data itself is an array, wrap it in the expected structure
  if (Array.isArray(data)) {
    console.log("IndiaMart Extension: Data is an array, wrapping it");
    return { data: data };
  }

  // Look for arrays in the response that might contain the leads
  if (typeof data === "object") {
    console.log("IndiaMart Extension: Data is an object, looking for arrays");

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
        console.log(`IndiaMart Extension: Found array in field "${field}"`);
        return { data: data[field] };
      }
    }

    // If not found in common fields, check all fields
    for (const key in data) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        console.log(`IndiaMart Extension: Found array in field "${key}"`);
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
          console.log(
            `IndiaMart Extension: Found array in nested object "${key}"`
          );
          return result;
        }
      }
    }
  }

  // If we couldn't find any arrays, create an empty structure
  console.log(
    "IndiaMart Extension: Could not find any arrays, creating empty structure"
  );
  return { data: [] };
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "STORE_LEADS_DATA") {
    console.log("IndiaMart Extension: Received lead data from content script");

    // Check if the data is valid
    if (!message.data) {
      console.error(
        "IndiaMart Extension: Invalid data format received (null or undefined)"
      );
      sendResponse({ status: "error", message: "Invalid data format" });
      return true;
    }

    // Ensure the data has the correct structure
    const processedData = ensureCorrectDataStructure(message.data);

    // Store the processed data
    chrome.storage.local.set({ indiamartLeads: processedData }, function () {
      console.log("Lead data stored successfully");

      // Log some information about the data
      if (processedData.data && Array.isArray(processedData.data)) {
        console.log(`Stored ${processedData.data.length} leads`);

        // Log the first lead for debugging
        if (processedData.data.length > 0) {
          console.log("First lead sample:", processedData.data[0]);
        }
      }

      // Notify popup if it's open
      try {
        chrome.runtime
          .sendMessage({
            type: "NEW_LEADS",
            data: processedData,
          })
          .then((response) => {
            console.log("Popup notification response:", response);
          })
          .catch((err) => {
            // Popup might not be open, ignore error
            console.log(
              "Popup notification error (expected if popup is not open):",
              err
            );
          });
      } catch (error) {
        // Handle any other errors
        console.log("Error sending message to popup:", error);
      }

      // Send response back to content script
      sendResponse({ status: "success" });
    });
    return true; // Keep the message channel open for async response
  }
  return false; // Not handling this message asynchronously
});

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
