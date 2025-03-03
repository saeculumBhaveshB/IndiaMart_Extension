// Function to ensure data has the correct structure
function ensureCorrectDataStructure(data) {
  console.log(
    "IndiaMart Extension: Ensuring correct data structure in content script"
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

// Function to intercept fetch requests
function interceptFetch() {
  const originalFetch = window.fetch;

  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input.url;

    // Check if this is the target API
    if (url.includes("getContactList")) {
      console.log("IndiaMart Extension: Detected getContactList API call");

      // Log request details
      if (init && init.body) {
        try {
          const requestData = JSON.parse(init.body);
          console.log("IndiaMart Extension: Request data:", requestData);
        } catch (e) {
          // Not JSON or couldn't parse
        }
      }

      // Call the original fetch
      const response = await originalFetch.apply(this, arguments);

      // Clone the response so we can read it twice
      const responseClone = response.clone();

      // Process the response
      responseClone
        .json()
        .then((data) => {
          console.log(
            "IndiaMart Extension: Successfully captured Lead Manager data"
          );
          console.log(
            "IndiaMart Extension: Response structure:",
            Object.keys(data)
          );
          console.log(
            "IndiaMart Extension: Raw data sample:",
            JSON.stringify(data).substring(0, 500) + "..."
          );

          // Ensure the data has the correct structure
          const processedData = ensureCorrectDataStructure(data);

          // Log some information about the processed data
          if (processedData.data && Array.isArray(processedData.data)) {
            console.log(
              `IndiaMart Extension: Found ${processedData.data.length} leads`
            );
            if (processedData.data.length > 0) {
              console.log(
                "IndiaMart Extension: First lead sample:",
                processedData.data[0]
              );
            }
          }

          // Send the data to the background script
          try {
            chrome.runtime.sendMessage(
              {
                action: "STORE_LEADS_DATA",
                data: processedData,
              },
              function (response) {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending data to background:",
                    chrome.runtime.lastError
                  );
                  return;
                }
                console.log(
                  "Data sent to background script, response:",
                  response
                );
              }
            );
          } catch (error) {
            console.error("Error sending message to background script:", error);
          }
        })
        .catch((err) => {
          console.error(
            "IndiaMart Extension: Error processing API response",
            err
          );
        });

      // Return the original response
      return response;
    }

    // For all other requests, just pass through
    return originalFetch.apply(this, arguments);
  };
}

// Function to intercept XMLHttpRequest
function interceptXHR() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function () {
    // Store the URL being requested
    this._url = arguments[1];
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    // Check if this is the target API
    if (this._url && this._url.includes("getContactList")) {
      console.log(
        "IndiaMart Extension: Detected getContactList API call via XHR"
      );

      // Store the original onreadystatechange
      const originalOnReadyStateChange = this.onreadystatechange;

      // Override onreadystatechange
      this.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
          try {
            const data = JSON.parse(this.responseText);
            console.log(
              "IndiaMart Extension: Successfully captured Lead Manager data via XHR"
            );
            console.log(
              "IndiaMart Extension: Response structure:",
              Object.keys(data)
            );
            console.log(
              "IndiaMart Extension: Raw data sample:",
              JSON.stringify(data).substring(0, 500) + "..."
            );

            // Ensure the data has the correct structure
            const processedData = ensureCorrectDataStructure(data);

            // Log some information about the processed data
            if (processedData.data && Array.isArray(processedData.data)) {
              console.log(
                `IndiaMart Extension: Found ${processedData.data.length} leads`
              );
              if (processedData.data.length > 0) {
                console.log(
                  "IndiaMart Extension: First lead sample:",
                  processedData.data[0]
                );
              }
            }

            // Send the data to the background script
            try {
              chrome.runtime.sendMessage(
                {
                  action: "STORE_LEADS_DATA",
                  data: processedData,
                },
                function (response) {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Error sending data to background:",
                      chrome.runtime.lastError
                    );
                    return;
                  }
                  console.log(
                    "Data sent to background script, response:",
                    response
                  );
                }
              );
            } catch (error) {
              console.error(
                "Error sending message to background script:",
                error
              );
            }
          } catch (err) {
            console.error(
              "IndiaMart Extension: Error processing XHR response",
              err
            );
          }
        }

        // Call the original onreadystatechange
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, arguments);
        }
      };
    }

    return originalSend.apply(this, arguments);
  };
}

// Function to manually fetch lead data
function fetchLeadData() {
  console.log("IndiaMart Extension: Manually fetching lead data");

  // Create request data
  const requestData = {
    start: 0,
    end: 100,
    type: "all",
    last_contact_date: "",
  };

  console.log("IndiaMart Extension: Request data:", requestData);
  console.log(
    "IndiaMart Extension: Document cookies available:",
    document.cookie ? "Yes" : "No"
  );

  // Make the API request
  fetch("https://seller.indiamart.com/lmsreact/getContactList", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestData),
    credentials: "include", // Include cookies
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log(
        "IndiaMart Extension: Successfully fetched Lead Manager data manually"
      );
      console.log(
        "IndiaMart Extension: Response structure:",
        Object.keys(data)
      );
      console.log(
        "IndiaMart Extension: Raw data sample:",
        JSON.stringify(data).substring(0, 500) + "..."
      );

      // Ensure the data has the correct structure
      const processedData = ensureCorrectDataStructure(data);

      // Log some information about the processed data
      if (processedData.data && Array.isArray(processedData.data)) {
        console.log(
          `IndiaMart Extension: Found ${processedData.data.length} leads`
        );
        if (processedData.data.length > 0) {
          console.log(
            "IndiaMart Extension: First lead sample:",
            processedData.data[0]
          );
        }
      }

      // Send the data to the background script
      try {
        chrome.runtime.sendMessage(
          {
            action: "STORE_LEADS_DATA",
            data: processedData,
          },
          function (response) {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending data to background:",
                chrome.runtime.lastError
              );
              return;
            }
            console.log("Data sent to background script, response:", response);
          }
        );
      } catch (error) {
        console.error("Error sending message to background script:", error);
      }
    })
    .catch((error) => {
      console.error("IndiaMart Extension: Error fetching lead data:", error);
    });
}

// Create a specific request observer for the Lead Manager page
function createLeadManagerObserver() {
  // Flag to track if we've already set up the capture for this page load
  let captureSetup = false;

  // This function will be called when we detect we're on the Lead Manager page
  function setupLeadManagerCapture() {
    // Only set up once per page load
    if (captureSetup) return;
    captureSetup = true;

    console.log("IndiaMart Extension: Lead Manager page detected");

    // Try to manually fetch the data
    fetchLeadData();

    // Also set up a refresh interval to periodically check for new data
    // This is useful if the user stays on the page for a while
    if (window.leadManagerRefreshInterval) {
      clearInterval(window.leadManagerRefreshInterval);
    }

    window.leadManagerRefreshInterval = setInterval(() => {
      console.log("IndiaMart Extension: Refreshing lead data");
      fetchLeadData();
    }, 60000); // Refresh every minute
  }

  // Function to check if we're on the Lead Manager section
  function checkIfLeadManagerPage() {
    // Check for various indicators of the Lead Manager page
    const isLeadManagerPage =
      document.querySelector('[data-testid="lead-manager"]') ||
      document.querySelector(".lead-manager") ||
      document.querySelector('[class*="leadManager"]') ||
      (window.location.href.includes("messagecentre") &&
        document
          .querySelector("h1, h2, h3, h4, h5")
          ?.textContent?.includes("Lead Manager"));

    if (isLeadManagerPage) {
      setupLeadManagerCapture();
      return true;
    }
    return false;
  }

  // Check immediately if we can detect the Lead Manager page
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    checkIfLeadManagerPage();
  }

  // Wait for the page to load
  window.addEventListener("load", function () {
    checkIfLeadManagerPage();
  });

  // Also check for navigation within the SPA
  const observer = new MutationObserver(function (mutations) {
    // Debounce the check to avoid too many checks
    if (window.leadManagerCheckTimeout) {
      clearTimeout(window.leadManagerCheckTimeout);
    }

    window.leadManagerCheckTimeout = setTimeout(() => {
      checkIfLeadManagerPage();
    }, 500);
  });

  // Start observing the document body for changes
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    // If body is not available yet, wait for it
    window.addEventListener("DOMContentLoaded", () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }

  // Also check when URL changes (for SPAs that use history API)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      checkIfLeadManagerPage();
    }
  });

  // Observe the document if it exists
  if (document && document.documentElement) {
    urlObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "API_CALL_DETECTED") {
    console.log("IndiaMart Extension: API call detected by background script");
    // Send an immediate response
    sendResponse({ status: "received" });
  } else if (message.action === "LEAD_MANAGER_PAGE_DETECTED") {
    console.log(
      "IndiaMart Extension: Lead Manager page detected by background script"
    );
    // Try to fetch the lead data
    fetchLeadData();
    sendResponse({ status: "fetching" });
  }
});

// Clean up function to remove intervals when the page is unloaded
window.addEventListener("beforeunload", function () {
  if (window.leadManagerRefreshInterval) {
    clearInterval(window.leadManagerRefreshInterval);
  }
  if (window.leadManagerCheckTimeout) {
    clearTimeout(window.leadManagerCheckTimeout);
  }
});

// Initialize interception
(function () {
  console.log("IndiaMart Extension: Content script loaded");
  interceptFetch();
  interceptXHR();
  createLeadManagerObserver();
})();
