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

        // Clear existing data (only columns A through H)
        updateProgress(30, "Clearing existing data (columns A-H)...");
        await clearSpreadsheetData(spreadsheetId);
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
    }

    // Prepare the data
    updateProgress(40, "Preparing data...");
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

    // Update spreadsheet with data (only columns A through H)
    updateProgress(60, "Uploading data to columns A-H...");
    await updateSpreadsheetData(spreadsheetId, "A1:H" + rows.length, rows);

    // Format the spreadsheet (only columns A through H)
    updateProgress(80, "Formatting columns A-H...");
    await formatSpreadsheet(spreadsheetId);

    // Final update
    updateProgress(100, "Upload completed successfully!");

    return spreadsheetUrl;
  } catch (error) {
    console.error("Error in uploadLeadsToSheets:", error);
    throw error;
  }
}
