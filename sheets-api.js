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
            endColumnIndex: 7,
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
            endIndex: 7,
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

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/A1:Z1000:clear`,
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

    // Check if we have a saved spreadsheet ID
    const settings = await new Promise((resolve) => {
      chrome.storage.local.get(["spreadsheetId", "oauth2ClientId"], resolve);
    });

    if (settings.spreadsheetId) {
      // Use existing spreadsheet
      try {
        const spreadsheet = await checkSpreadsheetAccess(
          settings.spreadsheetId
        );
        spreadsheetId = settings.spreadsheetId;
        spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

        // Clear existing data
        await clearSpreadsheetData(spreadsheetId);
      } catch (error) {
        console.error("Error accessing existing spreadsheet:", error);
        throw new Error(
          "Cannot access the specified spreadsheet. Please check your settings and make sure you have access to the spreadsheet."
        );
      }
    } else {
      // Create new spreadsheet if no ID is saved
      if (!sheetTitle) {
        sheetTitle = `IndiaMart Leads - ${new Date().toLocaleDateString()}`;
      }
      const spreadsheet = await createSpreadsheet(sheetTitle);
      spreadsheetId = spreadsheet.spreadsheetId;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    }

    // Prepare the data
    const headers = [
      "PRODUCT",
      "CUSTOMER",
      "CONTACT",
      "CITY",
      "LEAD DATE",
      "REQUIREMENTS",
      "FIRM",
    ];

    const specificFields = [
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
      const row = specificFields.map((field) => {
        return (
          lead[field] ||
          lead[field.replace("contacts_", "contact_")] ||
          lead[field.replace("contact_", "contacts_")] ||
          lead[field.replace("_", "")] ||
          lead[field.replace("_", "-")] ||
          ""
        );
      });
      rows.push(row);
    });

    // Update the spreadsheet with data
    await updateSpreadsheetData(spreadsheetId, "A1:G" + rows.length, rows);

    // Format the spreadsheet
    const formatRequests = [
      {
        // Format headers
        repeatCell: {
          range: {
            sheetId: 0,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                bold: true,
                fontSize: 12,
              },
              backgroundColor: {
                red: 0.9,
                green: 0.9,
                blue: 0.9,
              },
            },
          },
          fields: "userEnteredFormat(textFormat,backgroundColor)",
        },
      },
      {
        // Auto-resize columns
        autoResizeDimensions: {
          dimensions: {
            sheetId: 0,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 7,
          },
        },
      },
    ];

    await formatSpreadsheet(spreadsheetId, formatRequests);

    // Return the spreadsheet URL
    return spreadsheetUrl;
  } catch (error) {
    console.error("Error uploading to sheets:", error);
    throw error;
  }
}
