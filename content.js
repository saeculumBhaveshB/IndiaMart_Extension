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

          // Check if the data has the expected structure
          if (!data || !data.data) {
            console.error(
              "IndiaMart Extension: Unexpected data format, missing data array"
            );
            console.log("IndiaMart Extension: Actual data:", data);

            // Try to fix the data structure if needed
            let fixedData = data;
            if (data && Array.isArray(data)) {
              // If the data is already an array, wrap it in the expected structure
              fixedData = { data: data };
              console.log(
                "IndiaMart Extension: Fixed data structure by wrapping array"
              );
            } else if (data && typeof data === "object") {
              // Look for arrays in the response that might contain the leads
              for (const key in data) {
                if (Array.isArray(data[key]) && data[key].length > 0) {
                  // This might be the leads array
                  fixedData = { data: data[key] };
                  console.log(
                    `IndiaMart Extension: Found potential leads array in key "${key}"`
                  );
                  break;
                }
              }
            }

            data = fixedData;
          }

          // Log some information about the data
          if (data.data && Array.isArray(data.data)) {
            console.log(`IndiaMart Extension: Found ${data.data.length} leads`);
            if (data.data.length > 0) {
              console.log(
                "IndiaMart Extension: First lead sample:",
                data.data[0]
              );
            }
          }

          // Send the data to the background script
          try {
            chrome.runtime.sendMessage(
              {
                action: "STORE_LEADS_DATA",
                data: data,
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

  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    this._method = method;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._url && this._url.includes("getContactList")) {
      console.log("IndiaMart Extension: Detected getContactList XHR request");

      // Check if this is a POST request with the expected payload format
      if (this._method === "POST" && body) {
        try {
          const requestData = JSON.parse(body);
          console.log("IndiaMart Extension: Request data:", requestData);
        } catch (e) {
          // Not JSON or couldn't parse
        }
      }

      const xhr = this;

      // Store the original onreadystatechange
      const originalOnReadyStateChange = xhr.onreadystatechange;

      // Override onreadystatechange
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log(
              "IndiaMart Extension: Successfully captured Lead Manager data via XHR"
            );
            console.log(
              "IndiaMart Extension: Response structure:",
              Object.keys(data)
            );

            // Check if the data has the expected structure
            let processedData = data;
            if (!data || !data.data) {
              console.error(
                "IndiaMart Extension: Unexpected data format, missing data array"
              );
              console.log("IndiaMart Extension: Actual data:", data);

              // Try to fix the data structure if needed
              if (data && Array.isArray(data)) {
                // If the data is already an array, wrap it in the expected structure
                processedData = { data: data };
                console.log(
                  "IndiaMart Extension: Fixed data structure by wrapping array"
                );
              } else if (data && typeof data === "object") {
                // Look for arrays in the response that might contain the leads
                for (const key in data) {
                  if (Array.isArray(data[key]) && data[key].length > 0) {
                    // This might be the leads array
                    processedData = { data: data[key] };
                    console.log(
                      `IndiaMart Extension: Found potential leads array in key "${key}"`
                    );
                    break;
                  }
                }
              }
            }

            // Log some information about the data
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

  // Create the request data exactly as specified in the curl command
  const requestData = {
    start: 1,
    end: 25,
    type: 0,
    last_contact_date: "",
  };

  // Get cookies from the document
  const cookies = document.cookie;
  console.log(
    "IndiaMart Extension: Cookies available:",
    cookies ? "Yes" : "No"
  );

  // Make the fetch request with all the headers from the curl command
  fetch("https://seller.indiamart.com/lmsreact/getContactList", {
    method: "POST",
    headers: {
      accept: "*/*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
      "content-type": "application/json",
      origin: "https://seller.indiamart.com",
      priority: "u=1, i",
      referer: "https://seller.indiamart.com/messagecentre",
      "sec-ch-ua":
        '"Not A;Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
    credentials: "include", // Important: include cookies
    body: JSON.stringify(requestData),
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

      // Check if the data has the expected structure
      if (!data || !data.data) {
        console.error(
          "IndiaMart Extension: Unexpected data format, missing data array"
        );
        console.log("IndiaMart Extension: Actual data:", data);

        // Try to fix the data structure if needed
        let fixedData = data;
        if (data && Array.isArray(data)) {
          // If the data is already an array, wrap it in the expected structure
          fixedData = { data: data };
          console.log(
            "IndiaMart Extension: Fixed data structure by wrapping array"
          );
        } else if (data && typeof data === "object") {
          // Look for arrays in the response that might contain the leads
          for (const key in data) {
            if (Array.isArray(data[key]) && data[key].length > 0) {
              // This might be the leads array
              fixedData = { data: data[key] };
              console.log(
                `IndiaMart Extension: Found potential leads array in key "${key}"`
              );
              break;
            }
          }
        }

        data = fixedData;
      }

      // Log some information about the data
      if (data.data && Array.isArray(data.data)) {
        console.log(`IndiaMart Extension: Found ${data.data.length} leads`);
        if (data.data.length > 0) {
          console.log("IndiaMart Extension: First lead sample:", data.data[0]);
        }
      }

      // Send the data to the background script
      try {
        chrome.runtime.sendMessage(
          {
            action: "STORE_LEADS_DATA",
            data: data,
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
      console.error(
        "IndiaMart Extension: Error fetching Lead Manager data manually",
        error
      );
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
