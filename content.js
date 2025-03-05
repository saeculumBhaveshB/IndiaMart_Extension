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
          console.log("IndiaMart Extension: Request parameters:", requestData);
        } catch (e) {
          console.log("IndiaMart Extension: Could not parse request body", e);
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
            console.log("IndiaMart Extension: XHR Response received:", {
              url: this._url,
              status: this.status,
              responseKeys: Object.keys(data),
              responsePreview: JSON.stringify(data).substring(0, 200) + "...",
            });
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

                    // console.log(`
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
                    //                   `);
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
      console.log("IndiaMart Extension: Progress update:", cleanData);

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
        reject(error);
      });
  });
}

// Function to fetch the total count of leads
function fetchLeadCount() {
  return new Promise((resolve, reject) => {
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
        console.log("IndiaMart Extension: Contact count response:", data);

        // First try to get total_unhidden_count which is the primary count we want
        if (data && typeof data.total_unhidden_count !== "undefined") {
          const count = parseInt(data.total_unhidden_count);
          console.log(
            `IndiaMart Extension: Found total_unhidden_count: ${count}`
          );
          resolve(count);
        }
        // Fall back to total_count if total_unhidden_count is not available
        else if (data && typeof data.total_count !== "undefined") {
          const count = parseInt(data.total_count);
          // console.log(
          //   `IndiaMart Extension: Using total_count as fallback: ${count}`
          // );
          resolve(count);
        }
        // If neither is available, check for other possible count fields
        else if (data) {
          // Look for any field that might contain the count
          const possibleCountFields = [
            "count",
            "totalCount",
            "total",
            "recordCount",
            "records_count",
          ];

          for (const field of possibleCountFields) {
            if (typeof data[field] !== "undefined") {
              const count = parseInt(data[field]);
              // console.log(
              //   `IndiaMart Extension: Using ${field} as count: ${count}`
              // );
              resolve(count);
              return;
            }
          }

          // If we still don't have a count, look for any numeric field that might be the count
          for (const key in data) {
            if (typeof data[key] === "number" || !isNaN(parseInt(data[key]))) {
              const count = parseInt(data[key]);
              if (count > 0) {
                // console.log(
                //   `IndiaMart Extension: Using ${key} as count: ${count}`
                // );
                resolve(count);
                return;
              }
            }
          }

          // Default to 100 if we can't find any count
          // console.log(
          //   "IndiaMart Extension: Could not find any count field, using default of 100"
          // );
          resolve(100);
        } else {
          // console.log(
          //   "IndiaMart Extension: Invalid response format, using default of 100"
          // );
          resolve(100);
        }
      })
      .catch((error) => {
        console.error("IndiaMart Extension: Error fetching lead count:", error);
        // Default to 100 on error so we at least try to fetch some leads
        // console.log(
        //   "IndiaMart Extension: Using default count of 100 due to error"
        // );
        resolve(100);
      });
  });
}

// Function to fetch all leads in batches
function fetchAllLeads(totalCount, updateProgress) {
  const batchSize = 100; // Number of leads to fetch per request
  const allLeads = [];
  let lastContactDate = ""; // Initialize with an empty string for the first batch
  let currentStart = 1;
  let currentEnd = batchSize;
  let totalFetched = 0;
  let useDateRangeForBatch3 = false;
  let dateRangeParams = null;

  // Flag to track if batch 3 has been triggered
  let batch3Triggered = false;

  // Function to directly trigger batch 3 with date range parameters
  function triggerBatch3Directly() {
    if (batch3Triggered) {
      // console.log("Batch 3 already triggered, skipping duplicate trigger");
      return;
    }

    batch3Triggered = true;

    //       console.log(`
    // ========== IndiaMart MANUAL BATCH 3 TRIGGER ==========
    // Directly triggering batch 3 with date range parameters.
    // This ensures batch 3 runs regardless of what happens with batch 2.
    // ====================================================
    //     `);

    // Set up date range parameters for batch 3
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Format dates as YYYY-MM-DD
    const toDateStr = today.toISOString().split("T")[0];
    const fromDateStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Override parameters for batch 3
    const batch3Start = 1;
    const batch3End = 100;
    const originalLastContactDate = lastContactDate || "";

    // Set flag and parameters for date range approach
    useDateRangeForBatch3 = true;
    dateRangeParams = {
      from_date: fromDateStr,
      to_date: toDateStr,
      originalLastContactDate: originalLastContactDate,
    };

    //     console.log(`
    // Manual trigger parameters for batch 3:
    // From Date: ${fromDateStr}
    // To Date: ${toDateStr}
    // Start/End: ${batch3Start}/${batch3End}
    // Original Last Contact Date (saved): ${originalLastContactDate}
    // ====================================================
    //     `);

    // Directly trigger batch 3 with a slight delay
    setTimeout(() => {
      // console.log("MANUAL BATCH 3 TRIGGER: Executing batch 3");

      // Save current state to restore after batch 3
      const savedStart = currentStart;
      const savedEnd = currentEnd;
      const savedLastContactDate = lastContactDate;

      // Set parameters for batch 3
      currentStart = batch3Start;
      currentEnd = batch3End;
      lastContactDate = "";

      // Process batch 3
      processBatch(3);

      // Schedule restoration of original parameters for batch 4
      setTimeout(() => {
        // console.log("Restoring original parameters after batch 3");
        currentStart = savedEnd + 1;
        currentEnd = currentStart + batchSize - 1;
        lastContactDate = savedLastContactDate;
      }, 5000);
    }, 10000); // Wait 10 seconds to ensure batch 1 and 2 have time to complete
  }

  // Schedule batch 3 to run after a delay
  setTimeout(triggerBatch3Directly, 15000);

  //   console.log(`
  // ========== IndiaMart Fetch Plan ==========
  // Total Leads: ${totalCount}
  // Batch Size: ${batchSize}
  // Total Batches: ${Math.ceil(totalCount / batchSize)}
  // Time: ${new Date().toISOString()}
  // ==============================================
  //   `);

  // Add special debug logging for batch planning
  //   console.log(`
  // ========== IndiaMart Batch Planning ==========
  // Will attempt to fetch multiple batches
  // Batch 1: Standard approach with empty last_contact_date
  // Batch 2: Standard approach with last_contact_date from batch 1
  // Batch 3: Will use date range approach (from_date/to_date)
  // ==============================================
  //   `);

  // Helper function to extract last_contact_date from a lead
  function getLastContactDate(lead) {
    // Direct access to last_contact_date field
    if (lead.last_contact_date) {
      //  console.log(`Found last_contact_date: ${lead.last_contact_date}`);
      return lead.last_contact_date; // Return as is - already in the format expected by the API
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
        // console.log(`Found date in field ${field}: ${lead[field]}`);
        // Return as is - assuming it's in the correct format
        return lead[field];
      }
    }

    // If no date found, log a warning and return empty string
    console.warn(
      "No last_contact_date found in lead. Using empty string. Lead:",
      JSON.stringify(lead).substring(0, 200) + "..."
    );
    return ""; // Return empty string if no date found
  }

  return new Promise((resolve, reject) => {
    let completedBatches = 0;
    let hasError = false;
    let errorMessages = [];
    let consecutiveEmptyBatches = 0;
    const maxConsecutiveEmptyBatches = 3; // Stop after this many consecutive empty batches

    // Function to process each batch
    function processBatch(batchNum) {
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
      const requestData = {
        start: currentStart,
        end: currentEnd,
        type: 0,
        last_contact_date: lastContactDate,
      };

      // Special handling for batch 3 and 4 - use date range parameters if flag is set
      if (
        (batchNum === 3 || batchNum === 4) &&
        useDateRangeForBatch3 &&
        dateRangeParams
      ) {
        console.log(`
========== IndiaMart Batch ${batchNum} Special Request ==========
Using date range parameters instead of standard pagination
From Date: ${dateRangeParams.from_date}
To Date: ${dateRangeParams.to_date}
====================================================
        `);

        // Add date range parameters
        requestData.from_date = dateRangeParams.from_date;
        requestData.to_date = dateRangeParams.to_date;

        // Remove or reset other parameters that might conflict
        requestData.last_contact_date = "";
      }

      // Force special handling for batch 3 if it's not already set
      if (batchNum === 3 && !useDateRangeForBatch3) {
        console.log(`
========== IndiaMart Batch 3 Fallback Special Request ==========
Batch 3 detected without date range parameters set.
Forcing date range parameters for batch 3.
====================================================
        `);

        // Calculate date ranges
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // Format dates as YYYY-MM-DD
        const toDateStr = today.toISOString().split("T")[0];
        const fromDateStr = thirtyDaysAgo.toISOString().split("T")[0];

        // Add date range parameters
        requestData.from_date = fromDateStr;
        requestData.to_date = toDateStr;

        // Remove or reset other parameters that might conflict
        requestData.last_contact_date = "";

        //         console.log(`
        // Fallback date range for batch 3:
        // From Date: ${fromDateStr}
        // To Date: ${toDateStr}
        // ====================================================
        //         `);
      }

      console.log(`
========== IndiaMart API Request Details ==========
Batch: ${batchNum}
URL: https://seller.indiamart.com/lmsreact/getContactList
Method: POST
Request Data: ${JSON.stringify(requestData)}
Headers: Content-Type: application/json, Accept: */*
Credentials: include (cookies will be sent)
Time: ${new Date().toISOString()}
====================================================
      `);

      fetch("https://seller.indiamart.com/lmsreact/getContactList", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        body: JSON.stringify(requestData),
        credentials: "include", // Include cookies for authentication
      })
        .then((response) => {
          // Debug statement to check if this code is being executed for batch 3
          // console.log(`BATCH DEBUG: Processing response for batch ${batchNum}`);

          // Special logging for batch 3
          if (batchNum === 3) {
            //             console.log(`
            // ========== IndiaMart Batch 3 Response Details ==========
            // Status: ${response.status} ${response.statusText}
            // Headers: ${JSON.stringify(Object.fromEntries([...response.headers]))}
            // Request Data Used: ${JSON.stringify(requestData)}
            // Time: ${new Date().toISOString()}
            // ====================================================
            //             `);

            // Clone the response so we can log the raw text
            response
              .clone()
              .text()
              .then((text) => {
                //                 console.log(`
                // ========== IndiaMart Batch 3 Raw Response ==========
                // Raw Response Text: ${text}
                // Length: ${text.length}
                // ====================================================
                //               `);
              })
              .catch((err) => {
                console.error("Error getting raw response text:", err);
              });
          }

          //           console.log(`
          // ========== IndiaMart API Response Status ==========
          // Batch: ${batchNum}
          // Status: ${response.status} ${response.statusText}
          // Headers: ${JSON.stringify(Object.fromEntries([...response.headers]))}
          // Time: ${new Date().toISOString()}
          // ====================================================
          //           `);

          if (!response.ok) {
            throw new Error(
              `HTTP error! Status: ${response.status} ${response.statusText}`
            );
          }
          return response.json();
        })
        .then((data) => {
          console.log(`
========== IndiaMart API Response ==========
Batch: ${batchNum}
Status: Success
Response Keys: ${Object.keys(data).join(", ")}
Response Structure: ${JSON.stringify(data).substring(0, 500)}
===========================================
          `);

          // For batch 2 and beyond, log more details about the response
          if (batchNum >= 2) {
            console.log(`
========== IndiaMart Detailed API Response for Batch ${batchNum} ==========
Full Response: ${JSON.stringify(data)}
Response Type: ${typeof data}
Has Result Property: ${data.hasOwnProperty("result")}
Result Type: ${data.result ? typeof data.result : "N/A"}
Result is Array: ${data.result ? Array.isArray(data.result) : "N/A"}
Result Length: ${
              data.result && Array.isArray(data.result)
                ? data.result.length
                : "N/A"
            }
Has Data Property: ${data.hasOwnProperty("data")}
Data Type: ${data.data ? typeof data.data : "N/A"}
Data is Array: ${data.data ? Array.isArray(data.data) : "N/A"}
Data Length: ${data.data && Array.isArray(data.data) ? data.data.length : "N/A"}
Has Error Property: ${data.hasOwnProperty("error")}
Error Message: ${data.error || "None"}
Has Message Property: ${data.hasOwnProperty("message")}
Message: ${data.message || "None"}
=======================================================================
            `);
          }

          // Extract the leads from the response
          let leads = [];

          if (data && data.result && Array.isArray(data.result)) {
            leads = data.result;
            // console.log(`Found ${leads.length} leads in data.result array`);
          } else if (data && data.data && Array.isArray(data.data)) {
            leads = data.data;
            // console.log(`Found ${leads.length} leads in data.data array`);
          } else {
            // Check for API-specific error messages
            let errorMessage = "";
            if (data && data.error) {
              errorMessage =
                typeof data.error === "string"
                  ? data.error
                  : JSON.stringify(data.error);
            } else if (data && data.message) {
              errorMessage =
                typeof data.message === "string"
                  ? data.message
                  : JSON.stringify(data.message);
            }

            console.warn(`
========== IndiaMart API Response Structure Warning ==========
Batch: ${batchNum}
Could not find leads array in expected locations (data.result or data.data)
Response Keys: ${Object.keys(data).join(", ")}
Response Preview: ${JSON.stringify(data).substring(0, 200)}...
API Error Message: ${errorMessage || "None"}
===========================================================
            `);

            // For batch 2, try to recover by continuing with empty leads
            if (batchNum === 2) {
              console.log(`
========== IndiaMart Batch 2 Empty Recovery ==========
Batch 2 returned no leads. This is common with the IndiaMart API.
Will still proceed to batch 3 with date range approach.
====================================================
              `);

              // Reset consecutive empty batches counter for batch 2 only
              // This ensures we don't stop after batch 2 returns empty
              consecutiveEmptyBatches = 0;
            }
          }

          //           console.log(`
          // ========== IndiaMart Batch Summary ==========
          // Batch: ${batchNum}
          // Leads Found: ${leads.length}
          // ===========================================
          //           `);

          // Update lastContactDate for the next batch and add leads to collection
          if (leads.length > 0) {
            const lastLead = leads[leads.length - 1];
            const previousLastContactDate = lastContactDate;
            lastContactDate = getLastContactDate(lastLead);

            // Add the leads to our collection
            allLeads.push(...leads);
            totalFetched += leads.length;

            // Reset consecutive empty batches counter
            consecutiveEmptyBatches = 0;

            //             console.log(`
            // ========== IndiaMart Last Contact Date Update ==========
            // Batch: ${batchNum}
            // Previous Last Contact Date: ${previousLastContactDate}
            // New Last Contact Date: ${lastContactDate}
            // Last Lead ID: ${
            //               lastLead.id ||
            //               lastLead.contact_id ||
            //               lastLead.query_id ||
            //               "unknown"
            //             }
            // Total Fetched: ${totalFetched}/${totalCount}
            // Progress: ${((totalFetched / totalCount) * 100).toFixed(2)}%
            // ====================================================
            //             `);
          } else {
            consecutiveEmptyBatches++;
            console.log(`
========== IndiaMart Empty Batch Warning ==========
Batch: ${batchNum}
No leads found in this batch.
Consecutive Empty Batches: ${consecutiveEmptyBatches}/${maxConsecutiveEmptyBatches}
Last Contact Date: ${lastContactDate}
Total Fetched: ${totalFetched}/${totalCount}
Progress: ${((totalFetched / totalCount) * 100).toFixed(2)}%
====================================================
            `);

            // Special handling for batch 2 with no leads - ensure we still try batch 3
            if (batchNum === 2) {
              console.log(`
========== IndiaMart Batch 2 Empty Recovery ==========
Batch 2 returned no leads. This is common with the IndiaMart API.
Will still proceed to batch 3 with date range approach.
====================================================
              `);
              //               console.log(`
              // ========== IndiaMart Batch 2 Empty Recovery ==========
              // Batch 2 returned no leads. This is common with the IndiaMart API.
              // Will still proceed to batch 3 with date range approach.
              // ====================================================
              //               `);

              // Reset consecutive empty batches counter for batch 2 only
              // This ensures we don't stop after batch 2 returns empty
              consecutiveEmptyBatches = 0;
            }
          }

          completedBatches++;

          // Update progress for UI
          updateProgress({
            completedBatches: completedBatches,
            totalBatches: Math.ceil(totalCount / batchSize),
            fetchedLeads: totalFetched,
          });

          // DIRECT TRIGGER FOR BATCH 3
          // If this is batch 2 completing, immediately trigger batch 3 with date range parameters
          if (batchNum === 2) {
            // console.log(`
            // ========== IndiaMart DIRECT TRIGGER FOR BATCH 3 ==========
            // Batch 2 has completed. Directly triggering batch 3 with date range parameters.
            // This bypasses the normal continuation logic to ensure batch 3 runs.
            // ====================================================
            // `);

            // Set up date range parameters for batch 3
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            // Format dates as YYYY-MM-DD
            const toDateStr = today.toISOString().split("T")[0];
            const fromDateStr = thirtyDaysAgo.toISOString().split("T")[0];

            // Override parameters for batch 3
            currentStart = 1;
            currentEnd = 100;
            const originalLastContactDate = lastContactDate;
            lastContactDate = "";

            // Set flag and parameters for date range approach
            useDateRangeForBatch3 = true;
            dateRangeParams = {
              from_date: fromDateStr,
              to_date: toDateStr,
              originalLastContactDate: originalLastContactDate,
            };

            //             console.log(`
            // Direct trigger parameters for batch 3:
            // From Date: ${fromDateStr}
            // To Date: ${toDateStr}
            // Start/End: ${currentStart}/${currentEnd}
            // Last Contact Date: ${lastContactDate}
            // Original Last Contact Date (saved): ${originalLastContactDate}
            // ====================================================
            //             `);

            // Mark batch 3 as triggered to prevent duplicate triggers
            batch3Triggered = true;

            // Increment completed batches
            completedBatches++;

            // Directly trigger batch 3 with a slight delay
            setTimeout(() => {
              // console.log(
              //   "DIRECT BATCH 3 TRIGGER: Executing batch 3 after delay"
              // );
              processBatch(3); // Explicitly use 3 instead of completedBatches + 1
            }, 1000);

            // Skip the normal continuation logic
            return;
          }

          // Determine if we should continue fetching
          const isBatch2 = batchNum === 2;
          const shouldContinue =
            // Continue if we haven't fetched all leads yet
            totalFetched < totalCount &&
            // And either:
            // 1. We got leads in this batch
            (leads.length > 0 ||
              // 2. We haven't hit the max consecutive empty batches
              consecutiveEmptyBatches < maxConsecutiveEmptyBatches ||
              // 3. Special case for batch 2 - always try batch 3 even if batch 2 is empty
              isBatch2);

          // Force continuation to batch 3 if we're on batch 2
          if (isBatch2) {
            // console.log(`
            // ========== IndiaMart Force Batch 3 ==========
            // Forcing continuation to batch 3 regardless of other conditions
            // This ensures we try the date range approach for batch 3
            // =====================================================
            //             `);
          }

          //           console.log(`
          // ========== IndiaMart Continuation Decision ==========
          // Should Continue: ${shouldContinue}
          // Total Fetched: ${totalFetched}/${totalCount}
          // Leads in Current Batch: ${leads.length}
          // Is Batch 2: ${isBatch2}
          // Consecutive Empty Batches: ${consecutiveEmptyBatches}/${maxConsecutiveEmptyBatches}
          // Condition 1 (totalFetched < totalCount): ${totalFetched < totalCount}
          // Condition 2 (leads.length > 0): ${leads.length > 0}
          // Condition 3 (consecutiveEmptyBatches < maxConsecutiveEmptyBatches): ${
          //             consecutiveEmptyBatches < maxConsecutiveEmptyBatches
          //           }
          // Condition 4 (isBatch2): ${isBatch2}
          // ====================================================
          //           `);

          if (shouldContinue) {
            // Prepare for next batch
            currentStart = currentEnd + 1;
            currentEnd = currentStart + batchSize - 1;

            // Special handling for batch 3 (after batch 2)
            if (batchNum === 2) {
              //               console.log(`
              // ========== IndiaMart Special Handling for Batch 3 ==========
              // Batch 2 completed. Preparing special parameters for batch 3.
              // Previous start/end: ${currentStart}/${currentEnd}
              // Previous last_contact_date: ${lastContactDate}
              // ====================================================
              //               `);

              // Try a completely different approach for batch 3
              // Instead of using start/end/last_contact_date, use from_date/to_date parameters

              // Calculate date ranges
              const today = new Date();
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(today.getDate() - 30);

              // Format dates as YYYY-MM-DD
              const toDateStr = today.toISOString().split("T")[0];
              const fromDateStr = thirtyDaysAgo.toISOString().split("T")[0];

              // Override the request parameters for batch 3
              currentStart = 1; // Reset to 1
              currentEnd = 100; // Use standard batch size

              // Store the original last_contact_date in case we need it later
              const originalLastContactDate = lastContactDate;

              // Set to empty for the date-based approach
              lastContactDate = "";

              // Add special flag for batch 3 to use date range parameters
              useDateRangeForBatch3 = true;
              dateRangeParams = {
                from_date: fromDateStr,
                to_date: toDateStr,
                originalLastContactDate: originalLastContactDate,
              };

              //               console.log(`
              // Updated approach for batch 3:
              // Using date range instead of last_contact_date
              // From Date: ${fromDateStr}
              // To Date: ${toDateStr}
              // Start/End: ${currentStart}/${currentEnd}
              // Last Contact Date: ${lastContactDate}
              // Original Last Contact Date (saved): ${originalLastContactDate}
              // ====================================================
              //               `);

              // Add a debug log to confirm we're about to process batch 3
              // console.log(
              //   "BATCH DEBUG: About to process batch 3 after batch 2 success"
              // );
            }

            // Special handling for batch 4 (after batch 3)
            if (batchNum === 3) {
              //               console.log(`
              // ========== IndiaMart Special Handling for Batch 4 ==========
              // Batch 3 completed. Preparing special parameters for batch 4.
              // Batch 3 returned ${leads.length} leads.
              // ====================================================
              //               `);

              if (leads.length > 0) {
                // Batch 3 succeeded with the date range approach
                // Continue with date range approach but adjust the dates

                // Calculate new date ranges - go back further in time
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const sixtyDaysAgo = new Date();
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

                // Format dates as YYYY-MM-DD
                const toDateStr = thirtyDaysAgo.toISOString().split("T")[0];
                const fromDateStr = sixtyDaysAgo.toISOString().split("T")[0];

                // Update date range parameters
                dateRangeParams = {
                  from_date: fromDateStr,
                  to_date: toDateStr,
                  originalLastContactDate:
                    dateRangeParams.originalLastContactDate,
                };

                //                 console.log(`
                // Updated date range for batch 4:
                // From Date: ${fromDateStr}
                // To Date: ${toDateStr}
                // Using date range approach since it worked for batch 3
                // ====================================================
                //                 `);
              } else {
                // Batch 3 failed with date range approach
                // Try going back to original approach but with a different offset
                useDateRangeForBatch3 = false; // Disable for future batches

                // Try a different offset
                currentStart = 301;
                currentEnd = 400;

                // Restore original last_contact_date if we saved it
                if (
                  dateRangeParams &&
                  dateRangeParams.originalLastContactDate
                ) {
                  lastContactDate = dateRangeParams.originalLastContactDate;
                }

                //                 console.log(`
                // Reverting to original approach for batch 4:
                // Start/End: ${currentStart}/${currentEnd}
                // Last Contact Date: ${lastContactDate}
                // Date range approach didn't work for batch 3
                // ====================================================
                //                 `);
              }
            }

            // Process the next batch
            processBatch(completedBatches + 1);
          } else {
            // We're done fetching
            const fetchingComplete = totalFetched >= totalCount;
            const stoppedDueToEmptyBatches =
              consecutiveEmptyBatches >= maxConsecutiveEmptyBatches;

            //             console.log(`
            // ========== IndiaMart All Batches Completed ==========
            // Total Batches: ${completedBatches}/${Math.ceil(totalCount / batchSize)}
            // Total Leads: ${totalFetched}/${totalCount}
            // Fetching Complete: ${fetchingComplete}
            // Stopped Due To Empty Batches: ${stoppedDueToEmptyBatches}
            // Time: ${new Date().toISOString()}
            // ====================================================
            //             `);

            // If we didn't get all leads, log a warning
            if (totalFetched < totalCount) {
              console.warn(`
========== IndiaMart Incomplete Data Warning ==========
Retrieved ${totalFetched} leads out of ${totalCount} expected leads.
This may be due to:
1. API limitations or rate limiting
2. Some leads being unavailable or deleted
3. Consecutive empty batches (${consecutiveEmptyBatches})
====================================================
            `);
            }

            resolve(allLeads);
          }
        })
        .catch((error) => {
          hasError = true;
          errorMessages.push(`Batch ${batchNum}: ${error.message}`);

          console.error(`
========== IndiaMart Batch ${batchNum} Failed ==========
Error: ${error.message}
Time: ${new Date().toISOString()}
====================================================
      `);

          // Special handling for batch 2 errors
          if (batchNum === 2) {
            //             console.log(`
            // ========== IndiaMart Batch 2 Error Recovery ==========
            // Batch 2 failed with error: ${error.message}
            // Directly triggering batch 3 with date range parameters.
            // ====================================================
            //             `);

            // Set up date range parameters for batch 3
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            // Format dates as YYYY-MM-DD
            const toDateStr = today.toISOString().split("T")[0];
            const fromDateStr = thirtyDaysAgo.toISOString().split("T")[0];

            // Override parameters for batch 3
            currentStart = 1;
            currentEnd = 100;
            const originalLastContactDate = lastContactDate;
            lastContactDate = "";

            // Set flag and parameters for date range approach
            useDateRangeForBatch3 = true;
            dateRangeParams = {
              from_date: fromDateStr,
              to_date: toDateStr,
              originalLastContactDate: originalLastContactDate,
            };

            //             console.log(`
            // Direct trigger parameters for batch 3 after error:
            // From Date: ${fromDateStr}
            // To Date: ${toDateStr}
            // Start/End: ${currentStart}/${currentEnd}
            // Last Contact Date: ${lastContactDate}
            // Original Last Contact Date (saved): ${originalLastContactDate}
            // ====================================================
            //             `);

            // Mark batch 3 as triggered to prevent duplicate triggers
            batch3Triggered = true;

            // Don't count this as a completed batch for UI purposes
            // but still increment for internal tracking
            completedBatches++;

            // Directly trigger batch 3 with a slight delay
            // console.log(
            //   "DIRECT BATCH 3 TRIGGER: Scheduling batch 3 after batch 2 error"
            // );
            setTimeout(() => {
              // console.log(
              //   "DIRECT BATCH 3 TRIGGER: Executing batch 3 after delay"
              // );
              processBatch(3); // Explicitly use 3 instead of completedBatches + 1
            }, 1000);
            return; // Skip the normal error handling
          }

          completedBatches++;
          updateProgress({
            completedBatches: completedBatches,
            totalBatches: Math.ceil(totalCount / batchSize),
            error: `Batch ${batchNum} failed: ${error.message}`,
          });

          // Determine if we should continue despite the error
          if (
            completedBatches < Math.ceil(totalCount / batchSize) &&
            totalFetched < totalCount
          ) {
            // Try to continue with the next batch
            currentStart = currentEnd + 1;
            currentEnd = currentStart + batchSize - 1;
            processBatch(completedBatches + 1);
          } else {
            //             console.log(`
            // ========== IndiaMart All Batches Completed With Errors ==========
            // Total Batches: ${completedBatches}/${Math.ceil(totalCount / batchSize)}
            // Total Leads: ${totalFetched}/${totalCount}
            // Errors: ${errorMessages.length}
            // Time: ${new Date().toISOString()}
            // ========================================================
            //             `);
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
        // Try to notify the popup about the error
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
      console.log("IndiaMart Extension: Progress update:", cleanData);

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
          updateProgress({ status: "checking_window_object" });

          // First, try to find data in the global window object (IndiaMart often stores data here)
          if (window.leadData || window.LEAD_DATA || window.leads) {
            const rawData = window.leadData || window.LEAD_DATA || window.leads;
            // console.log("Content script: Found lead data in window object");

            // Process the data
            let processedData = [];
            if (Array.isArray(rawData)) {
              processedData = rawData;
            } else if (typeof rawData === "object" && rawData !== null) {
              // If it's an object, look for arrays inside it
              for (const key in rawData) {
                if (Array.isArray(rawData[key]) && rawData[key].length > 0) {
                  processedData = rawData[key];
                  break;
                }
              }

              // If we still don't have an array, add the object itself
              if (processedData.length === 0) {
                processedData = [rawData];
              }
            }

            updateProgress({
              status: "processing",
              source: "window_object",
              fetchedLeads: processedData.length,
            });

            const result = {
              data: processedData,
              timestamp: new Date().toISOString(),
              source: "window_object",
              isRefresh: isRefresh,
              totalLeads: processedData.length,
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
                    message: `Successfully extracted ${processedData.length} leads from window object`,
                  });
                }
                resolve(result);
              }
            );
            return;
          }

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
