// Google Sheets API helper functions
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// Function to get OAuth2 token
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    try {
      chrome.identity.getAuthToken({ interactive: true }, function (token) {
        if (chrome.runtime.lastError) {
          console.error("Error getting auth token:", chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!token) {
          reject(
            new Error(
              "Failed to get authentication token. Please make sure you are signed in to Chrome and have granted the necessary permissions."
            )
          );
          return;
        }
        resolve(token);
      });
    } catch (error) {
      console.error("Error in getAuthToken:", error);
      reject(
        new Error(
          "Failed to authenticate with Google. Please try again and ensure you are signed in to Chrome."
        )
      );
    }
  });
}

// Function to create a new spreadsheet
async function createSpreadsheet(title) {
  const token = await getAuthToken();

  const response = await fetch(`${SHEETS_API_BASE}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create spreadsheet");
  }

  return await response.json();
}

// Function to check if spreadsheet exists and is accessible
async function checkSpreadsheetAccess(spreadsheetId) {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        "Cannot access the specified spreadsheet. Please check the Spreadsheet ID and make sure you have access to it."
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking spreadsheet access:", error);
    throw new Error(
      "Cannot access the specified spreadsheet. Please check the Spreadsheet ID and make sure you have access to it."
    );
  }
}

// Function to update spreadsheet data
async function updateSpreadsheetData(spreadsheetId, range, values) {
  const token = await getAuthToken();

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: values,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update spreadsheet data");
  }

  return await response.json();
}

// Function to format spreadsheet
async function formatSpreadsheet(spreadsheetId, requests) {
  const token = await getAuthToken();

  try {
    // First, get the sheet ID of the first sheet
    const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get spreadsheet information");
    }

    const spreadsheet = await response.json();
    const firstSheetId = spreadsheet.sheets[0].properties.sheetId;

    // Update the requests with the correct sheet ID
    const updatedRequests = [
      {
        // Format headers
        repeatCell: {
          range: {
            sheetId: firstSheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 8,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 0.9,
                green: 0.9,
                blue: 0.9,
              },
              textFormat: {
                bold: true,
                fontSize: 12,
              },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        // Auto-resize columns
        autoResizeDimensions: {
          dimensions: {
            sheetId: firstSheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 8,
          },
        },
      },
    ];

    // Make the formatting request
    const formatResponse = await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: updatedRequests,
        }),
      }
    );

    if (!formatResponse.ok) {
      const errorData = await formatResponse.json();
      throw new Error(
        `Failed to format spreadsheet: ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }

    return await formatResponse.json();
  } catch (error) {
    console.error("Error in formatSpreadsheet:", error);
    // If formatting fails, we'll just return success since the data is already uploaded
    return {
      status: "success",
      message: "Data uploaded successfully (formatting skipped)",
    };
  }
}

// Function to clear existing data in the spreadsheet
async function clearSpreadsheetData(spreadsheetId) {
  const token = await getAuthToken();

  // Only clear columns A through H
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/A1:H1000:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to clear spreadsheet data");
  }

  return await response.json();
}

// Function to get existing data from spreadsheet
async function getExistingData(spreadsheetId) {
  const token = await getAuthToken();

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/A:H`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get existing spreadsheet data");
  }

  return await response.json();
}

// Function to update spreadsheet data with merge
async function updateSpreadsheetDataWithMerge(
  spreadsheetId,
  existingData,
  newLeads
) {
  const token = await getAuthToken();

  // Get existing headers and data
  const existingRows = existingData.values || [];
  const headers = [
    "ID",
    "PRODUCT",
    "CUSTOMER",
    "CONTACT",
    "CITY",
    "LEAD DATE",
    "REQUIREMENTS",
    "FIRM",
  ];

  const specificFields = [
    "contacts_glid",
    "contact_last_product",
    "contacts_name",
    "contacts_mobile1",
    "contact_city",
    "last_contact_date",
    "last_product_qty",
    "contacts_company",
  ];

  // Verify/fix header row if needed
  if (existingRows.length === 0) {
    // No data at all, add headers
    await updateSpreadsheetData(spreadsheetId, "A1:H1", [headers]);
    existingRows.push(headers);
  } else if (!arraysEqual(existingRows[0], headers)) {
    // Headers don't match, update them
    await updateSpreadsheetData(spreadsheetId, "A1:H1", [headers]);
    existingRows[0] = headers;
  }

  // Create a map of existing leads by ID
  const existingLeadsMap = new Map();
  if (existingRows.length > 1) {
    // Skip header row
    for (let i = 1; i < existingRows.length; i++) {
      const row = existingRows[i];
      if (row && row[0]) {
        // Check if row exists and has an ID
        existingLeadsMap.set(row[0], {
          index: i,
          data: row,
        });
      }
    }
  }

  // Prepare batch updates
  const batchRequests = {
    valueInputOption: "RAW",
    data: [],
  };

  // Keep track of new rows to append
  const newRows = [];

  // Process each new lead
  newLeads.forEach((lead) => {
    // Ensure we have a valid lead with an ID
    if (!lead || !lead.contacts_glid) {
      console.warn("Skipping invalid lead:", lead);
      return;
    }

    const row = specificFields.map((field) => {
      const value = lead[field];
      // Convert null/undefined to empty string, but preserve 0 values
      return value === null || value === undefined ? "" : value.toString();
    });

    const leadId = lead.contacts_glid;
    const existing = existingLeadsMap.get(leadId);

    if (existing) {
      // Compare with existing data to avoid unnecessary updates
      if (!arraysEqual(existing.data, row)) {
        batchRequests.data.push({
          range: `A${existing.index + 1}:H${existing.index + 1}`,
          values: [row],
        });
      }
    } else {
      newRows.push(row);
    }
  });

  let updatedCount = 0;
  let newCount = 0;

  // Perform batch updates if there are any
  if (batchRequests.data.length > 0) {
    try {
      const batchUpdateResponse = await fetch(
        `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(batchRequests),
        }
      );

      if (!batchUpdateResponse.ok) {
        const errorData = await batchUpdateResponse.json();
        throw new Error(
          `Failed to update existing rows: ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      updatedCount = batchRequests.data.length;
    } catch (error) {
      console.error("Error updating existing rows:", error);
      throw error;
    }
  }

  // Append new rows if any
  if (newRows.length > 0) {
    try {
      const appendResponse = await fetch(
        `${SHEETS_API_BASE}/${spreadsheetId}/values/A${
          existingRows.length + 1
        }:H${existingRows.length + newRows.length}:append?valueInputOption=RAW`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: newRows,
          }),
        }
      );

      if (!appendResponse.ok) {
        const errorData = await appendResponse.json();
        throw new Error(
          `Failed to append new rows: ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      newCount = newRows.length;
    } catch (error) {
      console.error("Error appending new rows:", error);
      throw error;
    }
  }

  // Ensure header formatting is maintained
  await formatSpreadsheet(spreadsheetId);

  return {
    updatedRows: updatedCount,
    newRows: newCount,
    totalRows: existingRows.length + newCount,
  };
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Main function to upload leads to Google Sheets
async function uploadLeadsToSheets(leads, sheetTitle = null) {
  try {
    let spreadsheetId;
    let spreadsheetUrl;

    // Update progress - Starting
    const updateProgress = (percent, status) => {
      const progressFill = document.getElementById("progressFill");
      const progressText = document.getElementById("progressText");
      const loadingStatus = document.getElementById("loadingStatus");

      if (progressFill) progressFill.style.width = `${percent}%`;
      if (progressText) progressText.textContent = `${percent}%`;
      if (loadingStatus) loadingStatus.textContent = status;
    };

    // Check if we have a saved spreadsheet ID
    updateProgress(10, "Checking settings...");
    const settings = await new Promise((resolve) => {
      chrome.storage.local.get(["spreadsheetId", "oauth2ClientId"], resolve);
    });

    if (settings.spreadsheetId) {
      // Use existing spreadsheet
      try {
        updateProgress(20, "Accessing existing spreadsheet...");
        const spreadsheet = await checkSpreadsheetAccess(
          settings.spreadsheetId
        );
        spreadsheetId = settings.spreadsheetId;
        spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

        // Get existing data
        updateProgress(30, "Reading existing data...");
        const existingData = await getExistingData(spreadsheetId);

        // Update data with merge
        updateProgress(60, "Updating data with merge...");
        const result = await updateSpreadsheetDataWithMerge(
          spreadsheetId,
          existingData,
          leads
        );

        // Format the spreadsheet
        updateProgress(80, "Formatting spreadsheet...");
        await formatSpreadsheet(spreadsheetId);

        // Final update with results
        updateProgress(
          100,
          `Completed! Updated ${result.updatedRows} existing leads and added ${result.newRows} new leads.`
        );
      } catch (error) {
        console.error("Error accessing existing spreadsheet:", error);
        throw new Error(
          "Cannot access the specified spreadsheet. Please check your settings and make sure you have access to the spreadsheet."
        );
      }
    } else {
      // Create new spreadsheet if no ID is saved
      updateProgress(20, "Creating new spreadsheet...");
      if (!sheetTitle) {
        sheetTitle = `IndiaMart Leads - ${new Date().toLocaleDateString()}`;
      }
      const spreadsheet = await createSpreadsheet(sheetTitle);
      spreadsheetId = spreadsheet.spreadsheetId;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      // For new spreadsheet, just set headers and append all data as new
      const headers = [
        "ID",
        "PRODUCT",
        "CUSTOMER",
        "CONTACT",
        "CITY",
        "LEAD DATE",
        "REQUIREMENTS",
        "FIRM",
      ];

      const specificFields = [
        "contacts_glid",
        "contact_last_product",
        "contacts_name",
        "contacts_mobile1",
        "contact_city",
        "last_contact_date",
        "last_product_qty",
        "contacts_company",
      ];

      // Prepare rows with headers and data
      const rows = [headers];
      leads.forEach((lead) => {
        const row = specificFields.map((field) => lead[field] || "");
        rows.push(row);
      });

      // Update spreadsheet with data
      updateProgress(60, "Uploading data...");
      await updateSpreadsheetData(spreadsheetId, "A1:H" + rows.length, rows);

      // Format the spreadsheet
      updateProgress(80, "Formatting spreadsheet...");
      await formatSpreadsheet(spreadsheetId);

      // Final update
      updateProgress(
        100,
        `Completed! Added ${leads.length} leads to new spreadsheet.`
      );
    }

    return spreadsheetUrl;
  } catch (error) {
    console.error("Error in uploadLeadsToSheets:", error);
    throw error;
  }
}
