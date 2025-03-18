// Function to ensure data has the correct structure
function ensureCorrectDataStructure(data) {
  // console.log(
  //   "IndiaMart Extension: Ensuring correct data structure in content script"
  // );

  // If data is null or undefined, return an empty structure
  if (!data) {
    // console.log(
    //   "IndiaMart Extension: Data is null or undefined, creating empty structure"
    // );
    return { data: [] };
  }

  // If data is already in the correct format, return it as is
  if (data.data && Array.isArray(data.data)) {
    // console.log("IndiaMart Extension: Data already has correct structure");
    return data;
  }

  // If data itself is an array, wrap it in the expected structure
  if (Array.isArray(data)) {
    // console.log("IndiaMart Extension: Data is an array, wrapping it");
    return { data: data };
  }

  // Look for arrays in the response that might contain the leads
  if (typeof data === "object") {
    // console.log("IndiaMart Extension: Data is an object, looking for arrays");

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
        // console.log(`IndiaMart Extension: Found array in field "${field}"`);
        return { data: data[field] };
      }
    }

    // If not found in common fields, check all fields
    for (const key in data) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        // console.log(`IndiaMart Extension: Found array in field "${key}"`);
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
          // console.log(
          //   `IndiaMart Extension: Found array in nested object "${key}"`
          // );
          return result;
        }
      }
    }
  }

  // If we couldn't find any arrays, create an empty structure
  // console.log(
  //   "IndiaMart Extension: Could not find any arrays, creating empty structure"
  // );
  return { data: [] };
}

// Global flag to track if API calls should be stopped
let stopApiCalls = false;

// Global flag to track if an API call is in progress
let apiCallInProgress = false;

// Function to stop ongoing API calls
function stopOngoingApiCalls() {
  stopApiCalls = true;
  console.log("IndiaMart Extension: Stopping ongoing API calls");

  // Clear any pending setTimeout calls for next batches
  if (window.pendingBatchTimeout) {
    clearTimeout(window.pendingBatchTimeout);
    window.pendingBatchTimeout = null;
    console.log("IndiaMart Extension: Cleared pending batch timeout");
  }

  // Reset the API call in progress flag
  apiCallInProgress = false;

  return true; // Return true to indicate success
}

// Function to intercept fetch requests
function interceptFetch() {
  const originalFetch = window.fetch;

  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input.url;

    // Check if this is the target API
    if (url.includes("getContactList")) {
      console.log("IndiaMart Extension: Detected getContactList API call", url);

      // Log request details
      if (init && init.body) {
        try {
          const requestData = JSON.parse(init.body);
          //  console.log("IndiaMart Extension: Request parameters:", requestData);
        } catch (e) {
          //  console.log("IndiaMart Extension: Could not parse request body", e);
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
          // console.log(
          //   "IndiaMart Extension: Successfully captured Lead Manager data"
          // );
          // console.log(
          //   "IndiaMart Extension: Response structure:",
          //   Object.keys(data)
          // );
          // console.log(
          //   "IndiaMart Extension: Raw data sample:",
          //   JSON.stringify(data).substring(0, 500) + "..."
          // );

          // Ensure the data has the correct structure
          const processedData = ensureCorrectDataStructure(data);

          // Log some information about the processed data
          if (processedData.data && Array.isArray(processedData.data)) {
            // console.log(
            //   `IndiaMart Extension: Found ${processedData.data.length} leads`
            // );
            if (processedData.data.length > 0) {
              // console.log(
              //   "IndiaMart Extension: First lead sample:",
              //   processedData.data[0]
              // );
            }
          }

          // Send the data to the background script
          try {
            // Check if the data is too large
            const dataSize = JSON.stringify(processedData).length;
            // console.log(`Data size: ${dataSize} bytes`);

            // If data is very large, we need to chunk it
            if (dataSize > 5000000) {
              // 5MB limit
              // console.warn(
              //   "Data is too large to send in one message. Sending summary only."
              // );

              // Create a summary version with limited data
              const summarizedData = {
                timestamp: processedData.timestamp,
                source: processedData.source,
                totalLeads: processedData.totalLeads,
                fetchDuration: processedData.fetchDuration,
                batchesCompleted: processedData.batchesCompleted,
                totalBatches: processedData.totalBatches,
                error:
                  "Data too large to send in one message. Please export directly.",
                dataSize: dataSize,
                sampleFields: processedData.sampleFields,
                // Include only the first 100 leads as a sample
                data: processedData.data.slice(0, 100),
              };

              chrome.runtime.sendMessage(
                {
                  type: "LEAD_DATA",
                  data: summarizedData,
                  isLarge: true,
                  originalSize: dataSize,
                },
                function (response) {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Error sending data to background:",
                      chrome.runtime.lastError
                    );
                    updateProgress({
                      status: "error",
                      error:
                        "Failed to send data to background: " +
                        (chrome.runtime.lastError.message || "Unknown error"),
                    });
                    reject(chrome.runtime.lastError);
                    return;
                  }

                  // console.log(`
                  // ========== IndiaMart Data Sent to Background (Summarized) ==========
                  // Response: ${JSON.stringify(response)}
                  // Time: ${new Date().toISOString()}
                  // ====================================================
                  //                   `);

                  // Store the full data in localStorage for direct access
                  try {
                    localStorage.setItem(
                      "indiamartFullLeads",
                      JSON.stringify(processedData)
                    );
                    // console.log(
                    //   "Full data stored in localStorage for direct access"
                    // );
                  } catch (storageError) {
                    console.error(
                      "Error storing full data in localStorage:",
                      storageError
                    );
                  }

                  updateProgress({
                    status: "complete",
                    message: `Successfully fetched ${processedData.data.length} leads, but only sent summary due to size`,
                  });
                  resolve(processedData);
                }
              );
            } else {
              // Data is small enough to send normally
              chrome.runtime.sendMessage(
                {
                  type: "LEAD_DATA",
                  data: processedData,
                },
                function (response) {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Error sending data to background:",
                      chrome.runtime.lastError
                    );
                    updateProgress({
                      status: "error",
                      error:
                        "Failed to send data to background: " +
                        (chrome.runtime.lastError.message || "Unknown error"),
                    });
                    reject(chrome.runtime.lastError);
                    return;
                  }
                  // console.log(`
                  // ========== IndiaMart Data Sent to Background ==========
                  // Response: ${JSON.stringify(response)}
                  // Time: ${new Date().toISOString()}
                  // =====================================================
                  //                 `);
                  updateProgress({
                    status: "complete",
                    message: `Successfully fetched and processed ${processedData.data.length} leads`,
                  });
                  resolve(processedData);
                }
              );
            }
          } catch (error) {
            console.error("Error sending data to background:", error);
            updateProgress({
              status: "error",
              error:
                "Exception sending data to background: " +
                (error.message || "Unknown error"),
            });
            reject(error);
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
        "IndiaMart Extension: Detected getContactList API call via XHR",
        this._url
      );

      // Try to log request body if it's the first argument and is a string
      if (arguments[0] && typeof arguments[0] === "string") {
        try {
          const requestData = JSON.parse(arguments[0]);
          console.log(
            "IndiaMart Extension: XHR Request parameters:",
            requestData
          );
        } catch (e) {
          console.log(
            "IndiaMart Extension: Could not parse XHR request body",
            e
          );
        }
      }

      // Store the original onreadystatechange
      const originalOnReadyStateChange = this.onreadystatechange;

      // Override onreadystatechange
      this.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
          try {
            const data = JSON.parse(this.responseText);
            // console.log("IndiaMart Extension: XHR Response received:", {
            //   url: this._url,
            //   status: this.status,
            //   responseKeys: Object.keys(data),
            //   responsePreview: JSON.stringify(data).substring(0, 200) + "...",
            // });
            // console.log(
            //   "IndiaMart Extension: Successfully captured Lead Manager data via XHR"
            // );
            // console.log(
            //   "IndiaMart Extension: Response structure:",
            //   Object.keys(data)
            // );
            //   console.log(
            //   "IndiaMart Extension: Raw data sample:",
            //   JSON.stringify(data).substring(0, 500) + "..."
            // );

            // Ensure the data has the correct structure
            const processedData = ensureCorrectDataStructure(data);

            // Log some information about the processed data
            if (processedData.data && Array.isArray(processedData.data)) {
              // console.log(
              //   `IndiaMart Extension: Found ${processedData.data.length} leads`
              // );
              if (processedData.data.length > 0) {
                // console.log(
                //   "IndiaMart Extension: First lead sample:",
                //   processedData.data[0]
                // );
              }
            }

            // Send the data to the background script
            try {
              // Check if the data is too large
              const dataSize = JSON.stringify(processedData).length;
              // console.log(`Data size: ${dataSize} bytes`);

              // If data is very large, we need to chunk it
              if (dataSize > 5000000) {
                // 5MB limit
                // console.warn(
                //   "Data is too large to send in one message. Sending summary only."
                // );

                // Create a summary version with limited data
                const summarizedData = {
                  timestamp: processedData.timestamp,
                  source: processedData.source,
                  totalLeads: processedData.totalLeads,
                  fetchDuration: processedData.fetchDuration,
                  batchesCompleted: processedData.batchesCompleted,
                  totalBatches: processedData.totalBatches,
                  error:
                    "Data too large to send in one message. Please export directly.",
                  dataSize: dataSize,
                  sampleFields: processedData.sampleFields,
                  // Include only the first 100 leads as a sample
                  data: processedData.data.slice(0, 100),
                };

                chrome.runtime.sendMessage(
                  {
                    type: "LEAD_DATA",
                    data: summarizedData,
                    isLarge: true,
                    originalSize: dataSize,
                  },
                  function (response) {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "Error sending data to background:",
                        chrome.runtime.lastError
                      );
                      updateProgress({
                        status: "error",
                        error:
                          "Failed to send data to background: " +
                          (chrome.runtime.lastError.message || "Unknown error"),
                      });
                      reject(chrome.runtime.lastError);
                      return;
                    }

                    //                 console.log(`
                    // ========== IndiaMart Data Sent to Background (Summarized) ==========
                    // Response: ${JSON.stringify(response)}
                    // Time: ${new Date().toISOString()}
                    // =====================================================
                    //                   `);

                    // Store the full data in localStorage for direct access
                    try {
                      localStorage.setItem(
                        "indiamartFullLeads",
                        JSON.stringify(processedData)
                      );
                      //   console.log(
                      //     "Full data stored in localStorage for direct access"
                      // );
                    } catch (storageError) {
                      console.error(
                        "Error storing full data in localStorage:",
                        storageError
                      );
                    }

                    updateProgress({
                      status: "complete",
                      message: `Successfully fetched ${processedData.data.length} leads, but only sent summary due to size`,
                    });

                    // Stop refresh button animation
                    stopRefreshAnimation();

                    resolve(processedData);
                  }
                );
              } else {
                // Data is small enough to send normally
                chrome.runtime.sendMessage(
                  {
                    type: "LEAD_DATA",
                    data: processedData,
                  },
                  function (response) {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "Error sending data to background:",
                        chrome.runtime.lastError
                      );
                      updateProgress({
                        status: "error",
                        error:
                          "Failed to send data to background: " +
                          (chrome.runtime.lastError.message || "Unknown error"),
                      });
                      reject(chrome.runtime.lastError);
                      return;
                    }
                    //                 console.log(`
                    // ========== IndiaMart Data Sent to Background ==========
                    // Response: ${JSON.stringify(response)}
                    // Time: ${new Date().toISOString()}
                    // ====================================================
                    //                 `);
                    updateProgress({
                      status: "complete",
                      message: `Successfully fetched and processed ${processedData.data.length} leads`,
                    });

                    // Stop refresh button animation
                    stopRefreshAnimation();

                    resolve(processedData);
                  }
                );
              }
            } catch (error) {
              console.error("Error sending data to background:", error);
              updateProgress({
                status: "error",
                error:
                  "Exception sending data to background: " +
                  (error.message || "Unknown error"),
              });

              // Stop refresh button animation even on error
              stopRefreshAnimation();

              reject(error);
            }
          } catch (err) {
            console.error(
              "IndiaMart Extension: Error processing XHR response",
              err
            );
            updateProgress({
              status: "error",
              error: err.message || "Error in fallback extraction",
              source: "error",
              endTime: new Date().toISOString(),
            });

            const errorResult = {
              data: [],
              timestamp: new Date().toISOString(),
              source: "error",
              error: err.message,
              isRefresh: isRefresh,
            };

            // Send the error result to the background script
            chrome.runtime.sendMessage(
              {
                type: "LEAD_DATA",
                data: errorResult,
                isRefresh: isRefresh,
              },
              function (response) {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending error data to background:",
                    chrome.runtime.lastError
                  );
                }
                resolve(errorResult);
              }
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
  // Check if an API call is already in progress
  if (apiCallInProgress) {
    console.log(
      "IndiaMart Extension: API call already in progress, not starting a new one"
    );

    // Notify that an API call is already in progress
    try {
      chrome.runtime.sendMessage({
        type: "FETCH_PROGRESS",
        data: {
          status: "already_in_progress",
          message:
            "API call already in progress. Please wait for the current operation to complete.",
          timestamp: new Date().toISOString(),
        },
      });

      // Also try to update the refresh button state
      chrome.runtime.sendMessage({
        type: "API_ALREADY_IN_PROGRESS",
      });
    } catch (error) {
      console.error("Error sending 'already in progress' message:", error);
    }

    // Return a rejected promise to indicate that we didn't start a new fetch
    return Promise.reject(new Error("API call already in progress"));
  }

  // Reset the flags when starting a new fetch sequence
  stopApiCalls = false;
  apiCallInProgress = true; // Mark that an API call is now in progress

  // Reset any pending batch timeout
  if (window.pendingBatchTimeout) {
    clearTimeout(window.pendingBatchTimeout);
    window.pendingBatchTimeout = null;
  }

  // console.log(`
  // ========== IndiaMart Lead Fetch Started ==========
  // Time: ${new Date().toISOString()}
  // Source: Manual fetch
  // ==================================================
  //   `);

  // Track progress for the popup
  let progressData = {
    status: "starting",
    totalLeads: 0,
    fetchedLeads: 0,
    completedBatches: 0,
    totalBatches: 0,
    startTime: new Date().toISOString(),
  };

  // Update progress and notify popup
  function updateProgress(update) {
    // If API calls have been stopped, don't update progress anymore
    if (
      stopApiCalls &&
      update.status !== "error" &&
      update.status !== "complete"
    ) {
      console.log(
        "IndiaMart Extension: Skipping progress update because API calls were stopped"
      );
      return;
    }

    progressData = { ...progressData, ...update };

    try {
      // Create a safe copy of the progress data with size limits
      const safeProgressData = { ...progressData };

      // If there's an error message, make sure it's not too long
      if (
        safeProgressData.error &&
        typeof safeProgressData.error === "string" &&
        safeProgressData.error.length > 1000
      ) {
        safeProgressData.error =
          safeProgressData.error.substring(0, 1000) + "... (truncated)";
      }

      // Remove any circular references or functions
      const cleanData = JSON.parse(JSON.stringify(safeProgressData));

      // Log the progress update
      // console.log("IndiaMart Extension: Progress update:", cleanData);

      chrome.runtime.sendMessage(
        {
          type: "FETCH_PROGRESS",
          data: cleanData,
        },
        function (response) {
          if (chrome.runtime.lastError) {
            console.warn(
              "Warning: Could not send progress update:",
              chrome.runtime.lastError.message
            );
          } else if (response && response.status === "error") {
            console.warn(
              "Error in progress update response:",
              response.message
            );
          }
        }
      );
    } catch (error) {
      console.error("Error sending progress update:", error);
    }
  }

  return new Promise((resolve, reject) => {
    updateProgress({ status: "counting" });

    // First, get the total count of leads
    fetchLeadCount()
      .then((totalCount) => {
        //         console.log(`
        // ========== IndiaMart Lead Count ==========
        // Total Leads: ${totalCount}
        // Time: ${new Date().toISOString()}
        // =========================================
        //         `);

        // Update progress with total count
        const batchSize = 100;
        const numBatches = Math.ceil(totalCount / batchSize);
        updateProgress({
          status: "fetching",
          totalLeads: totalCount,
          totalBatches: numBatches,
        });

        return fetchAllLeads(totalCount, updateProgress);
      })
      .then((allLeads) => {
        const endTime = new Date();
        const startTime = new Date(progressData.startTime);
        const durationSeconds = (endTime - startTime) / 1000;
        const durationMinutes = durationSeconds / 60;

        //         console.log(`
        // ========== IndiaMart Lead Fetch Completed ==========
        // Total Leads Fetched: ${allLeads.length}
        // Expected Leads: ${progressData.totalLeads}
        // Batches Completed: ${progressData.completedBatches}
        // Total Batches: ${progressData.totalBatches}
        // Duration: ${durationSeconds.toFixed(2)} seconds (${durationMinutes.toFixed(
        //           2
        //         )} minutes)
        // Start Time: ${startTime.toISOString()}
        // End Time: ${endTime.toISOString()}
        // ====================================================
        //         `);

        updateProgress({
          status: "processing",
          fetchedLeads: allLeads.length,
        });

        // Process the combined data
        const processedData = {
          data: allLeads,
          timestamp: new Date().toISOString(),
          source: "indiamart_api",
          totalLeads: allLeads.length,
          fetchDuration: durationSeconds,
          batchesCompleted: progressData.completedBatches,
          totalBatches: progressData.totalBatches,
        };

        // Add some metadata to help with debugging
        if (allLeads.length > 0) {
          processedData.sampleFields = Object.keys(allLeads[0]);

          // Log the first and last lead dates
          const firstLeadDate =
            allLeads[0].last_contact_date || allLeads[0].date || "N/A";
          const lastLeadDate =
            allLeads[allLeads.length - 1].last_contact_date ||
            allLeads[allLeads.length - 1].date ||
            "N/A";

          //           console.log(`
          // ========== IndiaMart Lead Date Range ==========
          // First Lead Date: ${firstLeadDate}
          // Last Lead Date: ${lastLeadDate}
          // Number of Fields: ${processedData.sampleFields.length}
          // Sample Fields: ${processedData.sampleFields.slice(0, 10).join(", ")}${
          //             processedData.sampleFields.length > 10 ? "..." : ""
          //           }
          // ==============================================
          //           `);
        }

        updateProgress({
          status: "sending",
          endTime: new Date().toISOString(),
          fetchDuration: processedData.fetchDuration,
        });

        // Send the data to the background script
        try {
          // Check if the data is too large
          const dataSize = JSON.stringify(processedData).length;
          // console.log(`Data size: ${dataSize} bytes`);

          // If data is very large, we need to chunk it
          if (dataSize > 5000000) {
            // 5MB limit
            console.warn(
              "Data is too large to send in one message. Sending summary only."
            );

            // Create a summary version with limited data
            const summarizedData = {
              timestamp: processedData.timestamp,
              source: processedData.source,
              totalLeads: processedData.totalLeads,
              fetchDuration: processedData.fetchDuration,
              batchesCompleted: processedData.batchesCompleted,
              totalBatches: processedData.totalBatches,
              error:
                "Data too large to send in one message. Please export directly.",
              dataSize: dataSize,
              sampleFields: processedData.sampleFields,
              // Include only the first 100 leads as a sample
              data: processedData.data.slice(0, 100),
            };

            chrome.runtime.sendMessage(
              {
                type: "LEAD_DATA",
                data: summarizedData,
                isLarge: true,
                originalSize: dataSize,
                isComplete: true, // Add flag to indicate fetch is complete
              },
              function (response) {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending data to background:",
                    chrome.runtime.lastError
                  );
                  updateProgress({
                    status: "error",
                    error:
                      "Failed to send data to background: " +
                      (chrome.runtime.lastError.message || "Unknown error"),
                  });
                  reject(chrome.runtime.lastError);
                  return;
                }

                //                 console.log(`
                // ========== IndiaMart Data Sent to Background (Summarized) ==========
                // Response: ${JSON.stringify(response)}
                // Time: ${new Date().toISOString()}
                // ====================================================
                //                 `);

                // Store the full data in localStorage for direct access
                try {
                  localStorage.setItem(
                    "indiamartFullLeads",
                    JSON.stringify(processedData)
                  );
                  // console.log(
                  //   "Full data stored in localStorage for direct access"
                  // );
                } catch (storageError) {
                  console.error(
                    "Error storing full data in localStorage:",
                    storageError
                  );
                }

                updateProgress({
                  status: "complete",
                  message: `Successfully fetched ${processedData.data.length} leads, but only sent summary due to size`,
                });

                // Stop refresh button animation
                stopRefreshAnimation();

                resolve(processedData);
              }
            );
          } else {
            // Data is small enough to send normally
            chrome.runtime.sendMessage(
              {
                type: "LEAD_DATA",
                data: processedData,
                isComplete: true, // Add flag to indicate fetch is complete
              },
              function (response) {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending data to background:",
                    chrome.runtime.lastError
                  );
                  updateProgress({
                    status: "error",
                    error:
                      "Failed to send data to background: " +
                      (chrome.runtime.lastError.message || "Unknown error"),
                  });
                  reject(chrome.runtime.lastError);
                  return;
                }
                //                 console.log(`
                // ========== IndiaMart Data Sent to Background ==========
                // Response: ${JSON.stringify(response)}
                // Time: ${new Date().toISOString()}
                // ====================================================
                //                 `);
                updateProgress({
                  status: "complete",
                  message: `Successfully fetched and processed ${processedData.data.length} leads`,
                });

                // Stop refresh button animation
                stopRefreshAnimation();

                resolve(processedData);
              }
            );
          }
        } catch (error) {
          console.error("Error sending data to background:", error);
          updateProgress({
            status: "error",
            error:
              "Exception sending data to background: " +
              (error.message || "Unknown error"),
          });

          // Stop refresh button animation even on error
          stopRefreshAnimation();

          reject(error);
        }
      })
      .catch((error) => {
        console.error(`
========== IndiaMart Lead Fetch Error ==========
Error: ${error.message}
Time: ${new Date().toISOString()}
Progress: ${JSON.stringify(progressData)}
==============================================
        `);
        updateProgress({
          status: "error",
          error: error.message || "Unknown error fetching leads",
          endTime: new Date().toISOString(),
        });

        // Stop refresh button animation on error
        stopRefreshAnimation();

        reject(error);
      });
  });
}

// Function to stop refresh button animation
function stopRefreshAnimation() {
  // Send message to stop animation
  chrome.runtime.sendMessage(
    {
      type: "STOP_REFRESH_ANIMATION",
    },
    function (response) {
      if (chrome.runtime.lastError) {
        console.warn(
          "Warning: Could not send stop animation message:",
          chrome.runtime.lastError.message
        );
      }
    }
  );

  // Also try to find and stop animation in the DOM if this is running in a content script
  try {
    // Look for refresh button with common selectors
    const refreshButtons = document.querySelectorAll(
      '.refresh-btn, .refresh, [class*="refresh"], button[title*="refresh"], button[aria-label*="refresh"]'
    );

    if (refreshButtons.length > 0) {
      refreshButtons.forEach((button) => {
        // Remove any spinning or loading classes
        button.classList.remove(
          "spinning",
          "loading",
          "refreshing",
          "rotate",
          "animated"
        );

        // Stop any CSS animations
        button.style.animation = "none";
        button.style.webkitAnimation = "none";

        // Remove any loading attributes
        button.removeAttribute("data-loading");
        button.removeAttribute("aria-busy");

        // Update any loading text
        if (button.dataset.originalText) {
          button.textContent = button.dataset.originalText;
        } else if (
          button.textContent.includes("Loading") ||
          button.textContent.includes("Refreshing")
        ) {
          button.textContent = "Refresh";
        }

        // Reset tooltip
        button.title = "Refresh Data";

        // Enable the button if it was disabled
        button.disabled = false;
      });

      console.log("Stopped refresh button animation in DOM");
    }
  } catch (error) {
    console.warn("Error trying to stop refresh animation in DOM:", error);
  }
}

// Function to fetch the total count of leads
function fetchLeadCount() {
  return new Promise((resolve, reject) => {
    // If API calls have been stopped, resolve with 0
    if (stopApiCalls) {
      console.log(
        "IndiaMart Extension: Skipping lead count fetch because API calls were stopped"
      );
      resolve(0);
      return;
    }

    console.log(
      "IndiaMart Extension: Fetching total lead count from contactCount API"
    );

    fetch("https://seller.indiamart.com/lmsreact/contactCount", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      credentials: "include", // Include cookies for authentication
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Full API response:", data);

        // Check if we have a response object
        const responseData = data.response || data;

        // First try to get total_unhidden_count which is the primary count we want
        if (
          responseData &&
          typeof responseData.total_unhidden_count !== "undefined"
        ) {
          const count = parseInt(responseData.total_unhidden_count);
          console.log(
            `IndiaMart Extension: Found total_unhidden_count: ${count}`
          );
          resolve(count);
        }
        // Fall back to total_contact_count if total_unhidden_count is not available
        else if (
          responseData &&
          typeof responseData.total_contact_count !== "undefined"
        ) {
          const count = parseInt(responseData.total_contact_count);
          console.log(
            `IndiaMart Extension: Using total_contact_count as fallback: ${count}`
          );
          resolve(count);
        }
        // Fall back to total_count if total_contact_count is not available
        else if (
          responseData &&
          typeof responseData.total_count !== "undefined"
        ) {
          const count = parseInt(responseData.total_count);
          console.log(
            `IndiaMart Extension: Using total_count as fallback: ${count}`
          );
          resolve(count);
        }
        // If none of the expected fields are available, check for other possible count fields
        else if (responseData) {
          // Look for any field that might contain the count
          const possibleCountFields = [
            "count",
            "totalCount",
            "total",
            "recordCount",
            "records_count",
          ];

          for (const field of possibleCountFields) {
            if (typeof responseData[field] !== "undefined") {
              const count = parseInt(responseData[field]);
              console.log(
                `IndiaMart Extension: Using ${field} as count: ${count}`
              );
              resolve(count);
              return;
            }
          }

          // If we still don't have a count, look for any numeric field that might be the count
          for (const key in responseData) {
            if (
              typeof responseData[key] === "number" ||
              !isNaN(parseInt(responseData[key]))
            ) {
              const count = parseInt(responseData[key]);
              if (count > 0) {
                console.log(
                  `IndiaMart Extension: Using ${key} as count: ${count}`
                );
                resolve(count);
                return;
              }
            }

          // Default to 100 if we can't find any count
          console.log(
            "IndiaMart Extension: Could not find any count field, using default of 100"
          );
          resolve(100);
        } else {
          console.log(
            "IndiaMart Extension: Invalid response format, using default of 100"
          );
          resolve(100);
        }
      })
      .catch((error) => {
        console.error("IndiaMart Extension: Error fetching lead count:", error);
        // Default to 100 on error so we at least try to fetch some leads
        console.log(
          "IndiaMart Extension: Using default count of 100 due to error"
        );
        resolve(100);
      });
  });
}

// Function to fetch all leads in batches
function fetchAllLeads(totalCount, updateProgress) {
  // If API calls have been stopped, return empty array immediately
  if (stopApiCalls) {
    console.log(
      "IndiaMart Extension: Skipping lead fetch because API calls were stopped"
    );
    return Promise.resolve([]);
  }

  const batchSize = 100; // Number of leads to fetch per request
  const allLeads = [];
  let lastContactDate = ""; // Initialize with an empty string for the first batch
  let currentStart = 1;
  let currentEnd = batchSize;
  let totalFetched = 0;

  // Helper function to extract last_contact_date from a lead
  function getLastContactDate(lead) {
    // Direct access to last_contact_date field
    if (lead.last_contact_date) {
      return lead.last_contact_date;
    }

    // Try alternative field names
    const possibleFields = [
      "lastContactDate",
      "contact_date",
      "contactDate",
      "date",
      "lead_date",
      "leadDate",
      "query_date",
      "queryDate",
    ];

    for (const field of possibleFields) {
      if (lead[field]) {
        return lead[field];
      }
    }

    // If no date found, return empty string
    return "";
  }

  return new Promise((resolve, reject) => {
    let completedBatches = 0;
    let consecutiveEmptyBatches = 0;
    const maxConsecutiveEmptyBatches = 3; // Stop after this many consecutive empty batches

    // Function to process each batch
    function processBatch(batchNum) {
      // If API calls are stopped, don't continue
      if (stopApiCalls) {
        console.log(
          `API calls have been stopped by user. Aborting batch ${batchNum}.`
        );
        apiCallInProgress = false;
        resolve(allLeads); // Resolve with whatever data we have so far
        return;
      }

      // If an API call is already in progress, don't start another one
      if (apiCallInProgress) {
        console.warn(
          `API call already in progress. Will not start batch ${batchNum} until current one completes.`
        );
        return;
      }

      // Set the flag to indicate an API call is in progress
      apiCallInProgress = true;

      // Check again if API calls were stopped between function entry and here
      if (stopApiCalls) {
        console.log(
          `API calls have been stopped. Aborting batch ${batchNum} before fetch.`
        );
        apiCallInProgress = false;
        resolve(allLeads);
        return;
      }

      console.log(`
========== IndiaMart Batch ${batchNum} Started ==========
Start: ${currentStart}
End: ${currentEnd}
Last Contact Date: ${lastContactDate}
Total Fetched So Far: ${totalFetched}/${totalCount}
Remaining: ${totalCount - totalFetched}
Time: ${new Date().toISOString()}
====================================================
      `);

      // Create request data for the batch
      let requestData = {
        type: 0,
        start: currentStart,
        end: currentEnd,
        last_contact_date: lastContactDate,
      };

      // Make the API request
      fetch("https://seller.indiamart.com/lmsreact/getContactList", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        body: JSON.stringify(requestData),
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `HTTP error! Status: ${response.status} ${response.statusText}`
            );
          }
          return response.json();
        })
        .then((data) => {
          // Mark that the API call is complete
          apiCallInProgress = false;

          // Extract the leads from the response
          let leads = [];

          if (data && data.result && Array.isArray(data.result)) {
            leads = data.result;
          } else if (data && data.data && Array.isArray(data.data)) {
            leads = data.data;
          }

          // Update lastContactDate for the next batch and add leads to collection
          if (leads.length > 0) {
            const lastLead = leads[leads.length - 1];
            lastContactDate = getLastContactDate(lastLead);

            // Add the leads to our collection
            allLeads.push(...leads);
            totalFetched += leads.length;

            // Reset consecutive empty batches counter
            consecutiveEmptyBatches = 0;
          } else {
            consecutiveEmptyBatches++;
          }

          completedBatches++;

          // Update progress for UI
          if (typeof updateProgress === "function") {
            updateProgress({
              completedBatches: completedBatches,
              totalBatches: Math.ceil(totalCount / batchSize),
              fetchedLeads: totalFetched,
            });
          }

          // Determine if we should continue fetching
          const shouldContinue =
            totalFetched < totalCount &&
            consecutiveEmptyBatches < maxConsecutiveEmptyBatches;

          // Add a 2-second delay before processing the next batch
          if (shouldContinue && !stopApiCalls) {
            console.log(
              `Adding a 2-second delay before processing the next batch`
            );

            // Store the timeout reference so we can cancel it if needed
            window.pendingBatchTimeout = setTimeout(() => {
              // Check again if API calls have been stopped before proceeding
              if (stopApiCalls) {
                console.log(
                  "API calls were stopped during timeout, not proceeding with next batch"
                );
                return;
              }

              // Update start and end for the next batch
              currentStart = currentEnd + 1;
              currentEnd = currentStart + batchSize - 1;

              // Process the next batch
              processBatch(batchNum + 1);
            }, 2000); // 2-second delay
          } else {
            // We're done fetching
            resolve(allLeads);
          }
        })
        .catch((error) => {
          // Mark that the API call is complete even if there was an error
          apiCallInProgress = false;

          console.error(`Batch ${batchNum} failed: ${error.message}`);

          completedBatches++;

          // Update progress for UI
          if (typeof updateProgress === "function") {
            updateProgress({
              completedBatches: completedBatches,
              totalBatches: Math.ceil(totalCount / batchSize),
              error: `Batch ${batchNum} failed: ${error.message}`,
            });
          }

          // Determine if we should continue despite the error
          if (
            !stopApiCalls &&
            completedBatches < Math.ceil(totalCount / batchSize) &&
            totalFetched < totalCount
          ) {
            console.log(
              `Adding a 2-second delay before trying the next batch after an error`
            );

            // Store the timeout reference so we can cancel it if needed
            window.pendingBatchTimeout = setTimeout(() => {
              // Check again if API calls have been stopped before proceeding
              if (stopApiCalls) {
                console.log(
                  "API calls were stopped during timeout, not proceeding with next batch after error"
                );
                return;
              }

              // Update start and end for the next batch
              currentStart = currentEnd + 1;
              currentEnd = currentStart + batchSize - 1;

              // Process the next batch
              processBatch(batchNum + 1);
            }, 2000); // 2-second delay
          } else {
            resolve(allLeads);
          }
        });
    }

    // Start processing the first batch
    processBatch(1);
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

    // console.log("IndiaMart Extension: Lead Manager page detected");

    // Try to manually fetch the data
    // We'll use a slight delay to ensure the page is fully loaded
    setTimeout(() => {
      // console.log("IndiaMart Extension: Auto-fetching lead data");
      fetchLeadData()
        .then((result) => {
          // console.log(
          //   `IndiaMart Extension: Auto-fetch completed successfully. Found ${result.data.length} leads.`
          // );
        })
        .catch((error) => {
          console.error("IndiaMart Extension: Auto-fetch failed:", error);
        });
    }, 2000);

    // Also set up a refresh interval to periodically check for new data
    // This is useful if the user stays on the page for a while
    if (window.leadManagerRefreshInterval) {
      clearInterval(window.leadManagerRefreshInterval);
    }

    // Refresh every 5 minutes instead of every minute to avoid rate limiting
    window.leadManagerRefreshInterval = setInterval(() => {
      // console.log("IndiaMart Extension: Auto-refreshing lead data");
      fetchLeadData()
        .then((result) => {
          // console.log(
          //   `IndiaMart Extension: Auto-refresh completed. Found ${result.data.length} leads.`
          // );
        })
        .catch((error) => {
          console.error("IndiaMart Extension: Auto-refresh failed:", error);
        });
    }, 300000); // Refresh every 5 minutes
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
    // console.log(
    //   "IndiaMart Extension: Lead Manager page detected by background script"
    // );
    // Try to fetch the lead data
    fetchLeadData();
    sendResponse({ status: "fetching" });
  } else if (message.action === "STOP_API_CALLS") {
    const result = stopOngoingApiCalls();
    sendResponse({ success: result });
    return true; // Indicate we'll respond asynchronously
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // console.log("Content script received message:", message);

  if (
    message.action === "fetchLeadData" ||
    message.action === "EXTRACT_LEADS"
  ) {
    // console.log(
    //   "Content script: Extracting lead data, isRefresh:",
    //   message.isRefresh
    // );

    // Send immediate response to let popup know we're working on it
    sendResponse({
      status: "fetching",
      message: "Starting lead extraction process...",
      timestamp: new Date().toISOString(),
    });

    // Extract lead data from the page - this is now asynchronous
    extractLeadData(message.isRefresh || message.forceFetch || false)
      .then((result) => {
        // console.log(
        //   "Content script: Lead data extraction completed successfully",
        //   {
        //     totalLeads: result.data.length,
        //     source: result.source,
        //   }
        // );
        // The data is already sent to the background script in the extractLeadData function
      })
      .catch((error) => {
        console.error("Content script: Error extracting lead data:", error);

        // Check if this is the "already in progress" error
        if (error.message === "API call already in progress") {
          // This specific error is already handled by fetchLeadData function
          // which sends the appropriate message to the popup
          return;
        }

        // For other errors, try to notify the popup about the error
        try {
          chrome.runtime.sendMessage({
            type: "FETCH_ERROR",
            error: error.message || "Unknown error during lead extraction",
            timestamp: new Date().toISOString(),
          });
        } catch (sendError) {
          console.error("Failed to send error message to popup:", sendError);
        }
      });

    return true; // Keep the message channel open for async response
  }
});

// Function to extract lead data from the page
function extractLeadData(isRefresh) {
  // console.log("Content script: Extracting lead data, isRefresh:", isRefresh);

  // Track progress for the popup
  let progressData = {
    status: "starting",
    source: "api",
    totalLeads: 0,
    fetchedLeads: 0,
    completedBatches: 0,
    totalBatches: 0,
    startTime: new Date().toISOString(),
    isRefresh: isRefresh,
  };

  // Update progress and notify popup
  function updateProgress(update) {
    progressData = { ...progressData, ...update };

    try {
      // Create a safe copy of the progress data with size limits
      const safeProgressData = { ...progressData };

      // If there's an error message, make sure it's not too long
      if (
        safeProgressData.error &&
        typeof safeProgressData.error === "string" &&
        safeProgressData.error.length > 1000
      ) {
        safeProgressData.error =
          safeProgressData.error.substring(0, 1000) + "... (truncated)";
      }

      // Remove any circular references or functions
      const cleanData = JSON.parse(JSON.stringify(safeProgressData));

      // Log the progress update
      // console.log("IndiaMart Extension: Progress update:", cleanData);

      chrome.runtime.sendMessage(
        {
          type: "FETCH_PROGRESS",
          data: cleanData,
        },
        function (response) {
          if (chrome.runtime.lastError) {
            console.warn(
              "Warning: Could not send progress update:",
              chrome.runtime.lastError.message
            );
          } else if (response && response.status === "error") {
            console.warn(
              "Error in progress update response:",
              response.message
            );
          }
        }
      );
    } catch (error) {
      console.error("Error sending progress update:", error);
    }
  }

  // Use our API-based approach to fetch all leads
  return fetchLeadData()
    .then((processedData) => {
      // console.log("Content script: Lead data extraction complete via API");
      updateProgress({
        status: "complete",
        fetchedLeads: processedData.data.length,
        source: "api",
        endTime: new Date().toISOString(),
      });

      // Add isRefresh flag to the processed data
      processedData.isRefresh = isRefresh;

      // Send a final message to ensure the popup is updated
      try {
        chrome.runtime.sendMessage({
          type: "LEAD_DATA",
          data: processedData,
          isRefresh: isRefresh,
        });
      } catch (error) {
        console.error("Error sending final data update:", error);
      }

      return processedData;
    })
    .catch((error) => {
      // Check if this is due to an API call already in progress
      if (error.message === "API call already in progress") {
        console.log(
          "Content script: API call already in progress, not starting a new one"
        );
        // This was already handled in fetchLeadData which sent the appropriate messages
        // Re-throw the error so the caller knows what happened
        throw error;
      }

      console.error(
        "Content script: Error extracting lead data via API:",
        error
      );
      updateProgress({
        status: "fallback",
        error: error.message || "API extraction failed",
        source: "fallback",
      });

      // If API approach fails, try to extract from the page as fallback
      return new Promise((resolve, reject) => {
        try {
          updateProgress({ status: "checking_dom" });

          // If not found in window object, try to extract from the DOM
          // Look for tables or divs that might contain lead information
          const leadElements = document.querySelectorAll(
            ".lead-item, .lead-row, tr.lead, .lead-container, [class*='lead'], table tr"
          );

          if (leadElements && leadElements.length > 0) {
            // console.log(
            //   `Content script: Found ${leadElements.length} lead elements in DOM`
            // );

            updateProgress({
              status: "extracting_dom",
              totalLeads: leadElements.length,
              source: "dom",
            });

            const extractedLeads = [];
            let processedCount = 0;

            leadElements.forEach((element, index) => {
              // Extract data from each lead element
              // This is a simplified example - adjust selectors based on actual page structure
              const lead = {
                contact_last_product: extractText(
                  element,
                  ".product-name, .product, .item-name, [class*='product']"
                ),
                contacts_name: extractText(
                  element,
                  ".contact-name, .name, .customer-name, [class*='name'], [class*='contact']"
                ),
                contacts_mobile1: extractText(
                  element,
                  ".mobile, .phone, .contact-number, [class*='mobile'], [class*='phone']"
                ),
                contact_city: extractText(
                  element,
                  ".city, .location, [class*='city'], [class*='location']"
                ),
                last_contact_date: extractText(
                  element,
                  ".date, .lead-date, [class*='date']"
                ),
                last_product_qty: extractText(
                  element,
                  ".quantity, .qty, [class*='quantity'], [class*='qty']"
                ),
                contacts_company: extractText(
                  element,
                  ".company, .firm, .business-name, [class*='company'], [class*='firm']"
                ),
                // Add any additional fields that might be useful
                contact_email: extractText(element, ".email, [class*='email']"),
                contact_address: extractText(
                  element,
                  ".address, [class*='address']"
                ),
                contact_state: extractText(element, ".state, [class*='state']"),
                contact_country: extractText(
                  element,
                  ".country, [class*='country']"
                ),
                contact_source: "IndiaMart DOM Extraction",
                extraction_timestamp: new Date().toISOString(),
              };

              // Only add if we have at least some basic information
              if (
                lead.contacts_name ||
                lead.contacts_mobile1 ||
                lead.contacts_company
              ) {
                extractedLeads.push(lead);
              }

              processedCount++;
              if (
                processedCount % 10 === 0 ||
                processedCount === leadElements.length
              ) {
                updateProgress({
                  fetchedLeads: extractedLeads.length,
                  processedCount: processedCount,
                });
              }
            });

            updateProgress({
              status: "processing",
              fetchedLeads: extractedLeads.length,
            });

            const result = {
              data: extractedLeads,
              timestamp: new Date().toISOString(),
              source: "dom_extraction",
              isRefresh: isRefresh,
              totalLeads: extractedLeads.length,
            };

            updateProgress({ status: "sending" });

            // Send the fallback data to the background script
            chrome.runtime.sendMessage(
              {
                type: "LEAD_DATA",
                data: result,
                isRefresh: isRefresh,
              },
              function (response) {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending fallback data to background:",
                    chrome.runtime.lastError
                  );
                  updateProgress({
                    status: "error",
                    error:
                      "Failed to send data to background: " +
                      (chrome.runtime.lastError.message || "Unknown error"),
                  });
                } else {
                  updateProgress({
                    status: "complete",
                    message: `Successfully extracted ${extractedLeads.length} leads from DOM`,
                  });
                }
                resolve(result);
              }
            );
            return;
          }

          // If we couldn't find any leads, return an empty result
          // console.log("Content script: Could not find any leads on the page");
          updateProgress({
            status: "no_leads_found",
            source: "empty",
            isRefresh: isRefresh,
          });

          const emptyResult = {
            data: [],
            timestamp: new Date().toISOString(),
            source: "empty",
            isRefresh: isRefresh,
          };

          // Send the empty result to the background script
          chrome.runtime.sendMessage(
            {
              type: "LEAD_DATA",
              data: emptyResult,
              isRefresh: isRefresh,
            },
            function (response) {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error sending empty data to background:",
                  chrome.runtime.lastError
                );
                updateProgress({
                  status: "error",
                  error: "Failed to send empty data to background",
                  isRefresh: isRefresh,
                });
              } else {
                updateProgress({ status: "complete" });
              }
              resolve(emptyResult);
            }
          );
        } catch (extractError) {
          console.error(
            "Content script: Error in fallback extraction:",
            extractError
          );
          updateProgress({
            status: "error",
            error: extractError.message || "Error in fallback extraction",
            source: "error",
            endTime: new Date().toISOString(),
          });

          const errorResult = {
            data: [],
            timestamp: new Date().toISOString(),
            source: "error",
            error: extractError.message,
            isRefresh: isRefresh,
          };

          // Send the error result to the background script
          chrome.runtime.sendMessage(
            {
              type: "LEAD_DATA",
              data: errorResult,
              isRefresh: isRefresh,
            },
            function (response) {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error sending error data to background:",
                  chrome.runtime.lastError
                );
              }
              resolve(errorResult);
            }
          );
        }
      });
    });
}

// Helper function to extract text from an element using multiple possible selectors
function extractText(parentElement, selectors) {
  const selectorArray = selectors.split(",").map((s) => s.trim());

  for (const selector of selectorArray) {
    const element = parentElement.querySelector(selector);
    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }

  return "";
}

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
  // console.log("IndiaMart Extension: Content script loaded");
  interceptFetch();
  interceptXHR();
  createLeadManagerObserver();
})();
