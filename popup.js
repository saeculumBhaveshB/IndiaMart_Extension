// Function to update the leads display
function updateLeadsDisplay(data, page = 1) {
  try {
    const totalLeadsSpan = document.getElementById("totalLeads");
    const exportCSVBtn = document.getElementById("exportCSV");
    const exportExcelBtn = document.getElementById("exportExcel");
    const clearDataBtn = document.getElementById("clearData");
    const leadsTable = document.getElementById("leadsTable");
    const leadsPerPage = 100; // Show 100 leads per page

    // If no data is provided, use the global variable
    if (!data && window.currentLeadsData) {
      data = window.currentLeadsData;
    }

    // Check if we have valid data
    if (!data) {
      if (totalLeadsSpan) totalLeadsSpan.textContent = "0";
      if (exportCSVBtn) exportCSVBtn.disabled = true;
      if (exportExcelBtn) exportExcelBtn.disabled = true;
      if (clearDataBtn) clearDataBtn.disabled = true;

      // Show empty table message if table exists
      if (leadsTable) {
        leadsTable.innerHTML =
          '<tr><td colspan="5" class="no-leads-message">No leads available. Click refresh to fetch leads.</td></tr>';
      }

      return;
    }

    // Ensure data has the expected structure
    let processedData = data;
    if (!data.data || !Array.isArray(data.data)) {
      // If data itself is an array, wrap it
      if (Array.isArray(data)) {
        processedData = { data: data };
      } else if (typeof data === "object") {
        // Look for arrays in the data
        let foundArray = false;
        for (const key in data) {
          if (Array.isArray(data[key])) {
            processedData = { data: data[key] };
            foundArray = true;
            break;
          }
        }

        if (!foundArray) {
          if (totalLeadsSpan) totalLeadsSpan.textContent = "0";
          if (exportCSVBtn) exportCSVBtn.disabled = true;
          if (exportExcelBtn) exportExcelBtn.disabled = true;
          if (clearDataBtn) clearDataBtn.disabled = true;

          // Show empty table message if table exists
          if (leadsTable) {
            leadsTable.innerHTML =
              '<tr><td colspan="5" class="no-leads-message">No leads found in the data.</td></tr>';
          }

          return;
        }
      } else {
        if (totalLeadsSpan) totalLeadsSpan.textContent = "0";
        if (exportCSVBtn) exportCSVBtn.disabled = true;
        if (exportExcelBtn) exportExcelBtn.disabled = true;
        if (clearDataBtn) clearDataBtn.disabled = true;

        // Show empty table message if table exists
        if (leadsTable) {
          leadsTable.innerHTML =
            '<tr><td colspan="5" class="no-leads-message">Invalid data format.</td></tr>';
        }

        return;
      }
    }

    // Ensure we have a data array
    const leads = processedData.data || [];

    if (leads.length === 0) {
      if (totalLeadsSpan) totalLeadsSpan.textContent = "0";
      if (exportCSVBtn) exportCSVBtn.disabled = true;
      if (exportExcelBtn) exportExcelBtn.disabled = true;
      if (clearDataBtn) clearDataBtn.disabled = true;

      // Show empty table message if table exists
      if (leadsTable) {
        leadsTable.innerHTML =
          '<tr><td colspan="5" class="no-leads-message">No leads found.</td></tr>';
      }

      return;
    }

    // Check if originalTotalCount exists and is a number
    if (
      processedData.originalTotalCount &&
      typeof processedData.originalTotalCount === "number"
    ) {
      // Use originalTotalCount for the total leads count
      if (totalLeadsSpan)
        totalLeadsSpan.textContent = processedData.originalTotalCount;
    } else {
      // Use the length of the leads array
      if (totalLeadsSpan) totalLeadsSpan.textContent = leads.length;
    }

    // Enable export buttons
    if (exportCSVBtn) exportCSVBtn.disabled = false;
    if (exportExcelBtn) exportExcelBtn.disabled = false;
    if (clearDataBtn) clearDataBtn.disabled = false;

    // Update the table if it exists
    if (leadsTable) {
      try {
        // Calculate pagination
        const totalPages = Math.ceil(leads.length / leadsPerPage);
        const currentPage = Math.min(Math.max(1, page), totalPages);
        const startIndex = (currentPage - 1) * leadsPerPage;
        const endIndex = Math.min(startIndex + leadsPerPage, leads.length);
        const currentLeads = leads.slice(startIndex, endIndex);

        // Create table header
        let tableHTML = `
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Mobile</th>
            <th>Email</th>
            <th>Date</th>
          </tr>
        `;

        // Add rows for each lead
        currentLeads.forEach((lead) => {
          // Extract fields with fallbacks for different field names
          const name =
            lead.contacts_name ||
            lead.contact_name ||
            lead.name ||
            lead.buyer_name ||
            "";
          const company =
            lead.company ||
            lead.company_name ||
            lead.firm_name ||
            lead.buyer_company ||
            "";
          const mobile =
            lead.mobile ||
            lead.phone ||
            lead.contact_mobile ||
            lead.contacts_mobile ||
            lead.buyer_mobile ||
            "";
          const email =
            lead.email ||
            lead.contact_email ||
            lead.contacts_email ||
            lead.buyer_email ||
            "";
          const date =
            lead.date ||
            lead.query_date ||
            lead.contact_date ||
            lead.last_contact_date ||
            "";

          // Add row to table
          tableHTML += `
            <tr>
              <td>${name}</td>
              <td>${company}</td>
              <td>${mobile}</td>
              <td>${email}</td>
              <td>${date}</td>
            </tr>
          `;
        });

        // Add pagination controls if needed
        if (totalPages > 1) {
          tableHTML += `
            <tr>
              <td colspan="5" class="pagination">
                <span>Page ${currentPage} of ${totalPages}</span>
                <div class="pagination-controls">
                  ${
                    currentPage > 1
                      ? `<button class="pagination-btn" data-page="${
                          currentPage - 1
                        }">Previous</button>`
                      : ""
                  }
                  ${
                    currentPage < totalPages
                      ? `<button class="pagination-btn" data-page="${
                          currentPage + 1
                        }">Next</button>`
                      : ""
                  }
                </div>
              </td>
            </tr>
          `;
        }

        // Update the table
        leadsTable.innerHTML = tableHTML;

        // Add event listeners to pagination buttons
        const paginationButtons = document.querySelectorAll(".pagination-btn");
        paginationButtons.forEach((button) => {
          button.addEventListener("click", function () {
            const newPage = parseInt(this.getAttribute("data-page"));
            updateLeadsDisplay(processedData, newPage);
          });
        });
      } catch (tableError) {
        // If there's an error updating the table, show a simple message
        leadsTable.innerHTML =
          '<tr><td colspan="5" class="error-message">Error displaying leads. Please try refreshing.</td></tr>';
      }
    }

    // Store the processed data in a global variable for reuse
    window.currentLeadsData = processedData;
  } catch (error) {
    // Handle any errors in the function
    const totalLeadsSpan = document.getElementById("totalLeads");
    const leadsTable = document.getElementById("leadsTable");

    if (totalLeadsSpan) totalLeadsSpan.textContent = "Error";
    if (leadsTable) {
      try {
        leadsTable.innerHTML =
          '<tr><td colspan="5" class="error-message">Error displaying leads. Please try refreshing.</td></tr>';
      } catch (uiError) {
        // Unable to update UI with error
      }
    }
  }
}

// Function to export data as CSV
function exportAsCSV() {
  if (
    !window.currentLeadsData ||
    !window.currentLeadsData.data ||
    !Array.isArray(window.currentLeadsData.data)
  ) {
    alert("No valid data to export. Please refresh the data first.");
    return;
  }

  const leads = window.currentLeadsData.data;
  if (leads.length === 0) {
    alert("No leads to export.");
    return;
  }

  // Define the specific fields to include
  const specificFields = [
    "contact_last_product",
    "contacts_name",
    "contacts_mobile1",
    "contact_city",
    "last_contact_date",
    "last_product_qty",
    "contacts_company",
  ];

  // Define friendly headers for the CSV with the requested titles
  const friendlyHeaders = [
    "PRODUCT",
    "CUSTOMER",
    "CONTACT",
    "CITY",
    "LEAD DATE",
    "REQUIREMENTS",
    "FIRM",
  ];

  // Create CSV content with only the specific fields
  let csvContent = friendlyHeaders.join(",") + "\n";

  leads.forEach((lead) => {
    const row = specificFields.map((field) => {
      // Check for the field using various possible naming conventions
      let value =
        lead[field] ||
        lead[field.replace("contacts_", "contact_")] ||
        lead[field.replace("contact_", "contacts_")] ||
        lead[field.replace("_", "")] ||
        lead[field.replace("_", "-")] ||
        "";

      // Handle values that might contain commas or quotes
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"'))
      ) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += row.join(",") + "\n";
  });

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `indiamart_leads_${new Date().toISOString().slice(0, 10)}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to export data as JSON
function exportAsJSON() {
  if (
    !window.currentLeadsData ||
    !window.currentLeadsData.data ||
    !Array.isArray(window.currentLeadsData.data)
  ) {
    alert("No valid data to export. Please refresh the data first.");
    return;
  }

  if (window.currentLeadsData.data.length === 0) {
    alert("No leads to export.");
    return;
  }

  const jsonContent = JSON.stringify(window.currentLeadsData, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `indiamart_leads_${new Date().toISOString().slice(0, 10)}.json`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to show the Google Sheets URL input
function showTransferToSheets() {
  const sheetUrlContainer = document.getElementById("sheetUrlContainer");
  sheetUrlContainer.style.display = "block";

  // Focus on the input field
  document.getElementById("sheetUrl").focus();
}

// Function to transfer data to Google Sheets
function transferToGoogleSheets() {
  if (
    !window.currentLeadsData ||
    !window.currentLeadsData.data ||
    !Array.isArray(window.currentLeadsData.data)
  ) {
    alert("No valid data to transfer. Please refresh the data first.");
    return;
  }

  const leads = window.currentLeadsData.data;
  if (leads.length === 0) {
    alert("No leads to transfer.");
    return;
  }

  const sheetUrl = document.getElementById("sheetUrl").value.trim();
  if (!sheetUrl) {
    alert("Please enter a valid Google Sheet URL.");
    return;
  }

  // Extract the sheet ID from the URL
  let sheetId;
  try {
    const url = new URL(sheetUrl);
    const pathParts = url.pathname.split("/");
    sheetId = pathParts.find((part) => part.length > 25); // Google Sheet IDs are typically long

    if (!sheetId) {
      throw new Error("Could not extract Sheet ID from URL");
    }
  } catch (error) {
    alert(
      "Invalid Google Sheet URL. Please make sure you've copied the entire URL."
    );
    return;
  }

  // Define the specific fields to include
  const specificFields = [
    "contact_last_product",
    "contacts_name",
    "contacts_mobile1",
    "contact_city",
    "last_contact_date",
    "last_product_qty",
    "contacts_company",
  ];

  // Define friendly headers for the CSV with the requested titles
  const friendlyHeaders = [
    "PRODUCT",
    "CUSTOMER",
    "CONTACT",
    "CITY",
    "LEAD DATE",
    "REQUIREMENTS",
    "FIRM",
  ];

  // Create HTML content for clipboard to preserve formatting
  let htmlContent = "<table><tr>";
  friendlyHeaders.forEach((header) => {
    htmlContent += `<th style="font-weight: bold; font-size: larger;">${header}</th>`;
  });
  htmlContent += "</tr>";

  // Create plain text content for clipboard fallback
  let textContent = friendlyHeaders.join("\t") + "\n";

  // Add data rows
  leads.forEach((lead) => {
    htmlContent += "<tr>";
    const rowValues = specificFields.map((field) => {
      // Check for the field using various possible naming conventions
      let value =
        lead[field] ||
        lead[field.replace("contacts_", "contact_")] ||
        lead[field.replace("contact_", "contacts_")] ||
        lead[field.replace("_", "")] ||
        lead[field.replace("_", "-")] ||
        "";

      htmlContent += `<td>${value}</td>`;
      return value;
    });
    htmlContent += "</tr>";
    textContent += rowValues.join("\t") + "\n";
  });

  htmlContent += "</table>";

  // Copy to clipboard with HTML formatting
  const clipboardItem = new ClipboardItem({
    "text/plain": new Blob([textContent], { type: "text/plain" }),
    "text/html": new Blob([htmlContent], { type: "text/html" }),
  });

  navigator.clipboard
    .write([clipboardItem])
    .then(() => {
      // Open the Google Sheet in a new tab
      const sheetTabUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      window.open(sheetTabUrl, "_blank");

      // Show instructions to the user with clipboard option
      alert(`The filtered lead data has been copied to your clipboard with formatted headers. Please follow these steps:

1. The Google Sheet has opened in a new tab
2. Click on cell A1 in the sheet
3. Press Ctrl+V (or Cmd+V on Mac) to paste the data
4. The data will be automatically formatted into columns with bold, larger headers

The following fields have been included with updated titles:
- PRODUCT (was Product)
- CUSTOMER (was Name)
- CONTACT (was Mobile)
- CITY (was City)
- LEAD DATE (was Last Contact Date)
- REQUIREMENTS (was Quantity)
- FIRM (was Company)`);

      // Hide the URL input container
      document.getElementById("sheetUrlContainer").style.display = "none";
    })
    .catch((err) => {
      // Fallback to the old method if clipboard API fails
      const textarea = document.createElement("textarea");
      textarea.value = textContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      // Open the Google Sheet in a new tab
      const sheetTabUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      window.open(sheetTabUrl, "_blank");

      // Show instructions to the user with clipboard option
      alert(`The filtered lead data has been copied to your clipboard. Please follow these steps:

1. The Google Sheet has opened in a new tab
2. Click on cell A1 in the sheet
3. Press Ctrl+V (or Cmd+V on Mac) to paste the data
4. The data will be automatically formatted into columns

Note: The formatting for bold headers couldn't be applied due to browser limitations.`);

      // Hide the URL input container
      document.getElementById("sheetUrlContainer").style.display = "none";
    });
}

// Function to clear stored data
function clearStoredData() {
  if (confirm("Are you sure you want to clear all stored lead data?")) {
    chrome.storage.local.remove("indiamartLeads", function () {
      window.currentLeadsData = null;
      updateLeadsDisplay(null);
    });
  }
}

// Function to directly upload data to Google Sheets
function directUploadToSheets() {
  if (
    !window.currentLeadsData ||
    !window.currentLeadsData.data ||
    !Array.isArray(window.currentLeadsData.data)
  ) {
    alert("No valid data to upload. Please refresh the data first.");
    return;
  }

  const leads = window.currentLeadsData.data;
  if (leads.length === 0) {
    alert("No leads to upload.");
    return;
  }

  // Check if we have saved settings
  chrome.storage.local.get(["lastSheetUrl", "scriptId"], function (result) {
    const sheetUrlContainer = document.getElementById("sheetUrlContainer");
    const confirmBtn = document.getElementById("confirmTransfer");
    const sheetUrlInput = document.getElementById("sheetUrl");
    const scriptIdInput = document.getElementById("scriptId");

    // If we have both saved settings, offer quick upload
    if (result.lastSheetUrl && result.scriptId) {
      if (
        confirm(
          `Would you like to upload directly to your last used sheet?\n\n${result.lastSheetUrl}`
        )
      ) {
        // Extract the sheet ID from the URL
        const sheetIdMatch = result.lastSheetUrl.match(
          /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
        );
        if (sheetIdMatch && sheetIdMatch[1]) {
          // Perform direct upload with saved settings
          performDirectUpload(
            sheetIdMatch[1],
            result.scriptId,
            result.lastSheetUrl
          );
          return;
        }
      }
    }

    // Show the sheet URL container for manual entry
    sheetUrlContainer.style.display = "block";

    // Update the button text
    confirmBtn.textContent = "Upload to Sheet";

    // Set values if we have them saved
    if (result.lastSheetUrl) {
      sheetUrlInput.value = result.lastSheetUrl;
    }

    if (result.scriptId) {
      scriptIdInput.value = result.scriptId;
    }

    // Add a new button for the API-based upload
    confirmBtn.removeEventListener("click", handleTransferConfirm);
    confirmBtn.addEventListener("click", handleDirectUpload);
  });
}

// Handler for direct upload button
function handleDirectUpload() {
  const sheetUrl = document.getElementById("sheetUrl").value.trim();
  const scriptId = document.getElementById("scriptId").value.trim();

  if (!sheetUrl) {
    alert("Please enter a valid Google Sheet URL.");
    return;
  }

  if (!scriptId) {
    alert("Please enter your Google Apps Script ID.");
    return;
  }

  // Extract the sheet ID from the URL
  const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch || !sheetIdMatch[1]) {
    alert("Invalid Google Sheet URL. Please enter a valid URL.");
    return;
  }

  const sheetId = sheetIdMatch[1];

  // Save the sheet URL and script ID for future use
  chrome.storage.local.set({
    lastSheetUrl: sheetUrl,
    scriptId: scriptId,
  });

  // Perform the direct upload
  performDirectUpload(sheetId, scriptId, sheetUrl);
}

// Function to perform the direct upload
function performDirectUpload(sheetId, scriptId, sheetUrl) {
  // Define the specific fields to include
  const specificFields = [
    "contact_last_product",
    "contacts_name",
    "contacts_mobile1",
    "contact_city",
    "last_contact_date",
    "last_product_qty",
    "contacts_company",
  ];

  // Define friendly headers for the data
  const friendlyHeaders = [
    "PRODUCT",
    "CUSTOMER",
    "CONTACT",
    "CITY",
    "LEAD DATE",
    "REQUIREMENTS",
    "FIRM",
  ];

  // Prepare the data rows with only the specific fields
  const leads = window.currentLeadsData.data;
  const rows = [];

  // Add the headers as the first row
  rows.push(friendlyHeaders);

  // Add the data rows
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const row = [];

    for (let j = 0; j < specificFields.length; j++) {
      const field = specificFields[j];
      // Check for the field using various possible naming conventions
      const value =
        lead[field] ||
        lead[field.replace("contacts_", "contact_")] ||
        lead[field.replace("contact_", "contacts_")] ||
        lead[field.replace("_", "")] ||
        lead[field.replace("_", "-")] ||
        "";
      row.push(value);
    }

    rows.push(row);
  }

  // Show loading state
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "loadingOverlay";
  loadingDiv.style.position = "fixed";
  loadingDiv.style.top = "0";
  loadingDiv.style.left = "0";
  loadingDiv.style.width = "100%";
  loadingDiv.style.height = "100%";
  loadingDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
  loadingDiv.style.display = "flex";
  loadingDiv.style.justifyContent = "center";
  loadingDiv.style.alignItems = "center";
  loadingDiv.style.zIndex = "1000";

  const loadingContent = document.createElement("div");
  loadingContent.style.backgroundColor = "white";
  loadingContent.style.padding = "20px";
  loadingContent.style.borderRadius = "5px";
  loadingContent.style.textAlign = "center";

  const loadingText = document.createElement("p");
  loadingText.textContent = `Uploading ${leads.length} leads to Google Sheets...`;

  const spinner = document.createElement("div");
  spinner.style.border = "4px solid #f3f3f3";
  spinner.style.borderTop = "4px solid #3498db";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "30px";
  spinner.style.height = "30px";
  spinner.style.animation = "spin 2s linear infinite";
  spinner.style.margin = "10px auto";

  // Add keyframes for spinner animation
  const style = document.createElement("style");
  style.textContent =
    "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
  document.head.appendChild(style);

  loadingContent.appendChild(spinner);
  loadingContent.appendChild(loadingText);
  loadingDiv.appendChild(loadingContent);
  document.body.appendChild(loadingDiv);

  // Use the Google Apps Script web app URL to upload the data
  const scriptUrl = `https://script.google.com/macros/s/${scriptId}/exec`;

  fetch(scriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sheetId: sheetId,
      data: {
        data: rows,
      },
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Remove loading overlay
      document.body.removeChild(loadingDiv);

      if (data.status === "success") {
        alert(
          `Successfully uploaded ${leads.length} leads to your Google Sheet!`
        );
        // Open the sheet in a new tab
        chrome.tabs.create({ url: sheetUrl });
      } else {
        alert(`Error: ${data.message || "Unknown error occurred"}`);
      }
    })
    .catch((error) => {
      // Remove loading overlay
      document.body.removeChild(loadingDiv);

      alert(`Error uploading data: ${error.message}`);

      // Fallback to clipboard method
      if (
        confirm(
          "Direct upload failed. Would you like to try the clipboard method instead?"
        )
      ) {
        transferToGoogleSheets();
      }
    });
}

// Function to export data as CSV with direct import link
function exportAsCSVWithImport() {
  if (
    !window.currentLeadsData ||
    !window.currentLeadsData.data ||
    !Array.isArray(window.currentLeadsData.data)
  ) {
    alert("No valid data to export. Please refresh the data first.");
    return;
  }

  const leads = window.currentLeadsData.data;
  if (leads.length === 0) {
    alert("No leads to export.");
    return;
  }

  // Define the specific fields to include
  const specificFields = [
    "contact_last_product",
    "contacts_name",
    "contacts_mobile1",
    "contact_city",
    "last_contact_date",
    "last_product_qty",
    "contacts_company",
  ];

  // Define friendly headers for the CSV with the requested titles
  const friendlyHeaders = [
    "PRODUCT",
    "CUSTOMER",
    "CONTACT",
    "CITY",
    "LEAD DATE",
    "REQUIREMENTS",
    "FIRM",
  ];

  // Create CSV content with only the specific fields
  let csvContent = friendlyHeaders.join(",") + "\n";

  leads.forEach((lead) => {
    const row = specificFields.map((field) => {
      // Check for the field using various possible naming conventions
      let value =
        lead[field] ||
        lead[field.replace("contacts_", "contact_")] ||
        lead[field.replace("contact_", "contacts_")] ||
        lead[field.replace("_", "")] ||
        lead[field.replace("_", "-")] ||
        "";

      // Handle values that might contain commas or quotes
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"'))
      ) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += row.join(",") + "\n";
  });

  // Create a Blob with the CSV data
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Create a download link for the CSV file
  const link = document.createElement("a");
  const filename = `indiamart_leads_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Create a direct import link to Google Sheets
  const importUrl = "https://docs.google.com/spreadsheets/d/1/edit#import";

  // Ask the user if they want to open Google Sheets import dialog
  if (
    confirm(
      "CSV file downloaded. Would you like to open Google Sheets import dialog?"
    )
  ) {
    chrome.tabs.create({ url: importUrl });
  }
}

// Handler for the transfer confirm button
function handleTransferConfirm() {
  transferToGoogleSheets();
}

// Function to refresh data
function refreshData() {
  // Show the refresh animation
  const refreshBtn = document.getElementById("refreshData");
  if (refreshBtn) {
    refreshBtn.classList.add("spinning");
  }

  // Initialize progress UI
  try {
    updateProgressUI({
      status: "starting",
      totalLeads: 0,
      fetchedLeads: 0,
    });
  } catch (error) {
    // Try to show error in the UI if possible
    try {
      const totalLeadsSpan = document.getElementById("totalLeads");
      const leadsTable = document.getElementById("leadsTable");

      if (totalLeadsSpan) totalLeadsSpan.textContent = "Error";
      if (leadsTable) {
        leadsTable.innerHTML =
          '<tr><td colspan="5" class="no-leads-message">Error updating display: ' +
          error.message +
          "</td></tr>";
      }
    } catch (uiError) {
      // Unable to update UI with error
    }

    // Stop spinning animation
    if (refreshBtn) {
      refreshBtn.classList.remove("spinning");
    }

    return;
  }

  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs || !tabs[0] || !tabs[0].id) {
      // Update progress indicator to show error
      try {
        updateProgressUI({
          status: "error",
          error: "Could not get active tab",
        });
      } catch (error) {
        // Unable to update UI with error
      }

      // Stop spinning animation
      if (refreshBtn) {
        refreshBtn.classList.remove("spinning");
      }

      return;
    }

    const activeTab = tabs[0];

    // Check if we're on an IndiaMart page
    if (!activeTab.url || !activeTab.url.includes("indiamart.com")) {
      alert("Please navigate to an IndiaMart page to extract leads.");

      // Update progress indicator to show error
      try {
        updateProgressUI({
          status: "error",
          error: "Not on an IndiaMart page",
        });
      } catch (error) {
        // Unable to update UI with error
      }

      // Stop spinning animation
      if (refreshBtn) {
        refreshBtn.classList.remove("spinning");
      }

      return;
    }

    // Send a message to the content script to extract data
    try {
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "EXTRACT_LEADS", isRefresh: true },
        function (response) {
          if (chrome.runtime.lastError) {
            // Update progress indicator to show error
            try {
              updateProgressUI({
                status: "error",
                error: "Content script not available. Please refresh the page.",
              });
            } catch (error) {
              // Unable to update UI with error
            }

            // Stop spinning animation
            if (refreshBtn) {
              refreshBtn.classList.remove("spinning");
            }

            return;
          }

          // Note: We don't need to do anything else here because the background script
          // will send us a NEW_LEADS message when the data is ready
        }
      );
    } catch (error) {
      // Update progress indicator to show error
      try {
        updateProgressUI({
          status: "error",
          error: error.message || "Error communicating with page",
        });
      } catch (error) {
        // Unable to update UI with error
      }

      // Stop spinning animation
      if (refreshBtn) {
        refreshBtn.classList.remove("spinning");
      }
    }
  });
}

// Function to process lead data from storage or API
function processLeadData(rawData) {
  // If the data is already in the expected format, return it
  if (rawData && rawData.data && Array.isArray(rawData.data)) {
    return rawData;
  }

  // If the data is an array, wrap it in an object
  if (Array.isArray(rawData)) {
    return { data: rawData };
  }

  // If the data is an object but doesn't have a data property
  if (typeof rawData === "object" && !rawData.data) {
    // Look for arrays in the object
    for (const key in rawData) {
      if (Array.isArray(rawData[key])) {
        return { data: rawData[key] };
      }
    }

    // If no arrays found, wrap the object itself
    return { data: [rawData] };
  }

  // If we can't process the data, return an empty data structure
  return { data: [] };
}

// Function to load data from storage
function loadDataFromStorage() {
  chrome.storage.local.get("indiamartLeads", function (result) {
    if (result.indiamartLeads) {
      try {
        // Process the data
        const processedData = processLeadData(result.indiamartLeads);

        // Set the global variable
        window.currentLeadsData = processedData;

        // Update the display
        updateLeadsDisplay();

        // Enable export buttons
        const exportCSVBtn = document.getElementById("exportCSV");
        const exportExcelBtn = document.getElementById("exportExcel");
        const clearDataBtn = document.getElementById("clearData");

        if (exportCSVBtn) exportCSVBtn.disabled = false;
        if (exportExcelBtn) exportExcelBtn.disabled = false;
        if (clearDataBtn) clearDataBtn.disabled = false;
      } catch (error) {
        alert("Error processing lead data: " + error.message);
      }
    } else {
      // No data in storage
      document.getElementById("leadsCount").textContent = "No leads found";
      document.getElementById("leadsTable").innerHTML = "";

      // Disable export buttons
      const exportCSVBtn = document.getElementById("exportCSV");
      const exportExcelBtn = document.getElementById("exportExcel");
      const clearDataBtn = document.getElementById("clearData");

      if (exportCSVBtn) exportCSVBtn.disabled = true;
      if (exportExcelBtn) exportExcelBtn.disabled = true;
      if (clearDataBtn) clearDataBtn.disabled = true;
    }
  });
}

// Function to merge new leads with existing leads, removing duplicates
function mergeLeadsData(existingData, newData) {
  if (
    !existingData ||
    !existingData.data ||
    !Array.isArray(existingData.data)
  ) {
    return newData;
  }

  if (!newData || !newData.data || !Array.isArray(newData.data)) {
    return existingData;
  }

  // Create a map of existing leads using a unique identifier
  const existingLeadsMap = new Map();
  existingData.data.forEach((lead) => {
    // Create a unique key using multiple fields to identify duplicates
    // Using mobile + name + product as a composite key
    const uniqueKey = `${lead.contacts_mobile1 || lead.contact_mobile1 || ""}-${
      lead.contacts_name || lead.contact_name || ""
    }-${lead.contact_last_product || ""}`;
    existingLeadsMap.set(uniqueKey, lead);
  });

  // Add new leads, replacing duplicates
  newData.data.forEach((lead) => {
    const uniqueKey = `${lead.contacts_mobile1 || lead.contact_mobile1 || ""}-${
      lead.contacts_name || lead.contact_name || ""
    }-${lead.contact_last_product || ""}`;
    existingLeadsMap.set(uniqueKey, lead); // This will replace if exists, add if new
  });

  // Convert map back to array
  const mergedData = {
    data: Array.from(existingLeadsMap.values()),
  };

  return mergedData;
}

// Function to export data as Excel
function exportAsExcel() {
  try {
    // Check if XLSX is available
    if (typeof XLSX === "undefined") {
      alert(
        "Excel export library (SheetJS) is not available. Please check the console for more details."
      );
      return;
    }

    if (
      !window.currentLeadsData ||
      !window.currentLeadsData.data ||
      !Array.isArray(window.currentLeadsData.data)
    ) {
      alert("No valid data to export. Please refresh the data first.");
      return;
    }

    const leads = window.currentLeadsData.data;

    if (leads.length === 0) {
      alert("No leads to export.");
      return;
    }

    // Define the specific fields to include
    const specificFields = [
      "contact_last_product",
      "contacts_name",
      "contacts_mobile1",
      "contact_city",
      "last_contact_date",
      "last_product_qty",
      "contacts_company",
    ];

    // Define friendly headers for the Excel with the requested titles
    const friendlyHeaders = [
      "PRODUCT",
      "CUSTOMER",
      "CONTACT",
      "CITY",
      "LEAD DATE",
      "REQUIREMENTS",
      "FIRM",
    ];

    // Create worksheet data
    const wsData = [friendlyHeaders];

    leads.forEach((lead) => {
      const row = specificFields.map((field) => {
        // Check for the field using various possible naming conventions
        return (
          lead[field] ||
          lead[field.replace("contacts_", "contact_")] ||
          lead[field.replace("contact_", "contacts_")] ||
          lead[field.replace("_", "")] ||
          lead[field.replace("_", "-")] ||
          ""
        );
      });
      wsData.push(row);
    });

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Create a worksheet from the data
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "IndiaMart Leads");

    // Generate Excel file and trigger download
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
    const filename = `IndiaMart_Leads_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  } catch (error) {
    alert("Error exporting Excel file: " + error.message);
  }
}

// Function to check if Chrome APIs are available
function checkChromeAPIs() {
  const apis = {
    chrome: typeof chrome !== "undefined",
    "chrome.storage": typeof chrome !== "undefined" && !!chrome.storage,
    "chrome.storage.local":
      typeof chrome !== "undefined" &&
      !!chrome.storage &&
      !!chrome.storage.local,
    "chrome.tabs": typeof chrome !== "undefined" && !!chrome.tabs,
    "chrome.runtime": typeof chrome !== "undefined" && !!chrome.runtime,
    "chrome.runtime.sendMessage":
      typeof chrome !== "undefined" &&
      !!chrome.runtime &&
      typeof chrome.runtime.sendMessage === "function",
  };

  // Check if we can access storage
  if (apis["chrome.storage.local"]) {
    chrome.storage.local.get("test", function (result) {
      if (chrome.runtime.lastError) {
        // Unable to access storage
      }
    });
  }

  return apis;
}

// Function to check if the SheetJS library is loaded
function checkSheetJSLibrary() {
  if (typeof XLSX === "undefined") {
    // Since we're now using a local file, we shouldn't need to load it dynamically
    // But we'll disable the Excel export button just in case
    const exportExcelBtn = document.getElementById("exportExcel");
    if (exportExcelBtn) {
      exportExcelBtn.disabled = true;
      exportExcelBtn.title =
        "Excel export is not available - library failed to load";
    }

    return false;
  } else {
    return true;
  }
}

// Update the event listeners in the document ready function
document.addEventListener("DOMContentLoaded", function () {
  try {
    // Initialize the progress container
    const progressContainer = document.getElementById("progressContainer");
    if (progressContainer) {
      progressContainer.style.display = "none";
    }

    // Check Chrome APIs
    checkChromeAPIs();

    // Check if SheetJS library is loaded
    checkSheetJSLibrary();

    // Check if all required elements exist
    const requiredElements = [
      "totalLeads",
      "exportCSV",
      "exportExcel",
      "clearData",
      "refreshData",
      "leadsTable",
    ];

    const missingElements = [];
    requiredElements.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) {
        missingElements.push(id);
      }
    });

    if (missingElements.length > 0) {
      console.error(`Popup: Missing elements: ${missingElements.join(", ")}`);
    }

    // Load initial data
    try {
      loadDataFromStorage();
    } catch (error) {
      // Try to update the UI to show the error
      try {
        const totalLeadsSpan = document.getElementById("totalLeads");
        const leadsTable = document.getElementById("leadsTable");

        if (totalLeadsSpan) totalLeadsSpan.textContent = "Error";
        if (leadsTable) {
          leadsTable.innerHTML =
            '<tr><td colspan="5" class="no-leads-message">Error loading data: ' +
            error.message +
            "</td></tr>";
        }
      } catch (uiError) {
        // Unable to update UI with error
      }
    }

    // Add event listeners with error handling
    function addClickListener(id, handler) {
      try {
        const element = document.getElementById(id);
        if (element) {
          element.addEventListener("click", function (event) {
            try {
              handler(event);
            } catch (error) {
              // Show error in UI
              try {
                if (id === "refreshData") {
                  // Stop spinning animation if it's the refresh button
                  element.classList.remove("spinning");

                  // Show error in progress UI
                  updateProgressUI({
                    status: "error",
                    error: error.message || `Error in ${id} handler`,
                  });
                } else {
                  // For other buttons, show an alert
                  alert(`Error in ${id} handler: ${error.message}`);
                }
              } catch (uiError) {
                // Unable to update UI with error
              }
            }
          });
        } else {
          console.error(
            `Popup: Cannot add listener to ${id} - element not found`
          );
        }
      } catch (error) {
        console.error(
          `Popup: Error setting up click listener for ${id}:`,
          error
        );
      }
    }

    // Add event listeners for the buttons
    addClickListener("exportCSV", exportAsCSV);
    addClickListener("exportExcel", exportAsExcel);
    addClickListener("clearData", clearStoredData);
    addClickListener("refreshData", refreshData);
  } catch (error) {
    alert("Error initializing extension popup: " + error.message);
  }
});

// Function to update the progress UI
function updateProgressUI(progressData) {
  if (!progressData) return;

  // Get all required DOM elements
  const progressContainer = document.getElementById("progressContainer");
  const progressStatus = document.getElementById("progressStatus");
  const progressDetails = document.getElementById("progressDetails");
  const progressBar = document.getElementById("progressBar");
  const progressLeadCount = document.getElementById("progressLeadCount");
  const progressTotalLeads = document.getElementById("progressTotalLeads");

  // Check if all required elements exist
  if (!progressContainer) {
    console.error("Popup: Missing progressContainer element");
    return;
  }

  // Show the progress container
  progressContainer.style.display = "block";

  // Remove any previous state classes
  progressContainer.classList.remove("error", "success");

  // Update status text based on the status
  let statusText = "Processing...";
  switch (progressData.status) {
    case "starting":
      statusText = "Initializing...";
      break;
    case "counting":
      statusText = "Counting leads...";
      break;
    case "fetching":
      statusText = "Fetching leads...";
      break;
    case "processing":
      statusText = "Processing data...";
      break;
    case "sending":
      statusText = "Saving data...";
      break;
    case "complete":
      statusText = "Complete!";
      if (progressContainer) progressContainer.classList.add("success");
      break;
    case "error":
      statusText = "Error";
      if (progressContainer) progressContainer.classList.add("error");
      break;
    case "fallback":
      statusText = "Using fallback method...";
      break;
    case "checking_window_object":
      statusText = "Checking window data...";
      break;
    case "checking_dom":
      statusText = "Checking page content...";
      break;
    case "extracting_dom":
      statusText = "Extracting from page...";
      break;
    case "no_leads_found":
      statusText = "No leads found";
      break;
    default:
      statusText = progressData.status || "Processing...";
  }

  // Safely update status text
  if (progressStatus) {
    progressStatus.textContent = statusText;
  }

  // Safely update error details if present
  if (progressDetails) {
    if (progressData.status === "error" && progressData.error) {
      progressDetails.textContent = progressData.error;
    } else if (progressData.source) {
      let sourceText = "";
      switch (progressData.source) {
        case "api":
          sourceText = "Using API";
          break;
        case "window_object":
          sourceText = "From page data";
          break;
        case "dom":
          sourceText = "From page elements";
          break;
        case "fallback":
          sourceText = "Using fallback";
          break;
        default:
          sourceText = progressData.source;
      }
      progressDetails.textContent = sourceText;
    } else {
      progressDetails.textContent = "";
    }
  }

  // Update progress bar
  if (progressBar && progressData.totalLeads && progressData.totalLeads > 0) {
    // Update the total leads count
    if (progressTotalLeads) {
      progressTotalLeads.textContent = progressData.totalLeads;
    }

    // Calculate progress percentage
    let percentage = 0;

    if (progressData.completedBatches && progressData.totalBatches) {
      // If we have batch information, use that for the progress bar
      percentage =
        (progressData.completedBatches / progressData.totalBatches) * 100;
    } else if (progressData.fetchedLeads) {
      // Otherwise use fetched leads count
      percentage = (progressData.fetchedLeads / progressData.totalLeads) * 100;
    }

    // Update the progress bar width
    progressBar.style.width = `${Math.min(percentage, 100)}%`;

    // Update the fetched leads count
    if (progressLeadCount && progressData.fetchedLeads !== undefined) {
      progressLeadCount.textContent = progressData.fetchedLeads;
    }
  } else if (
    progressBar &&
    (progressData.status === "complete" || progressData.status === "error")
  ) {
    // If complete or error, set the progress bar accordingly
    progressBar.style.width =
      progressData.status === "complete" ? "100%" : "100%";

    if (
      progressLeadCount &&
      progressTotalLeads &&
      progressData.fetchedLeads !== undefined
    ) {
      progressLeadCount.textContent = progressData.fetchedLeads;
      progressTotalLeads.textContent = progressData.fetchedLeads;
    }
  }
}

// Function to update statistics in the UI
function updateStats(data) {
  try {
    if (!data || !data.data) {
      return;
    }

    // Update total leads count
    const totalLeadsSpan = document.getElementById("totalLeads");
    if (totalLeadsSpan) {
      totalLeadsSpan.textContent = data.data.length.toString();
    }

    // Update timestamp if available
    if (data.timestamp) {
      const timestampElem = document.getElementById("lastUpdated");
      if (timestampElem) {
        const date = new Date(data.timestamp);
        timestampElem.textContent = date.toLocaleString();
      }
    }

    // Update source if available
    if (data.source) {
      const sourceElem = document.getElementById("dataSource");
      if (sourceElem) {
        sourceElem.textContent = data.source;
      }
    }

    // Enable export buttons
    const exportCSVBtn = document.getElementById("exportCSV");
    const exportExcelBtn = document.getElementById("exportExcel");
    const clearDataBtn = document.getElementById("clearData");

    if (exportCSVBtn) exportCSVBtn.disabled = false;
    if (exportExcelBtn) exportExcelBtn.disabled = false;
    if (clearDataBtn) clearDataBtn.disabled = false;
  } catch (error) {
    // Unable to update stats
  }
}

// Listen for updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEW_LEADS") {
    // Process the data
    try {
      // Check if data is too large for logging
      const dataSize = JSON.stringify(message.data).length;

      // Check if this is partial data
      if (message.isPartialData) {
        // Show a warning to the user
        const warningDiv = document.createElement("div");
        warningDiv.className = "alert alert-warning";
        warningDiv.innerHTML = `
          <strong>Warning:</strong> Only showing a preview of ${message.data.data.length} leads. 
          The full dataset (${message.data.totalLeads} leads) is too large to display in the popup.
          Please use the export function to access all leads.
        `;

        // Insert at the top of the content area
        const contentArea = document.querySelector(".content-area");
        if (contentArea && contentArea.firstChild) {
          contentArea.insertBefore(warningDiv, contentArea.firstChild);
        }
      }

      if (dataSize > 50000) {
        console.log("Popup: Data too large to log completely");
      } else {
        console.log("Popup: Received data:", message.data);
      }

      const processedData = processLeadData(message.data);
      console.log("Popup: Processed message data");

      // Set the global variable
      window.currentLeadsData = processedData;
      console.log("Popup: Set window.currentLeadsData from message");

      // Stop spinning animation on refresh button
      const refreshBtn = document.getElementById("refreshData");
      if (refreshBtn) {
        refreshBtn.classList.remove("spinning");
        refreshBtn.disabled = false;
      }

      // Update the UI with the new data
      updateLeadsDisplay(processedData);

      // Send a response back
      sendResponse({
        status: "success",
        message: "Data received and processed",
      });
    } catch (error) {
      // Show error message to user
      const errorDiv = document.createElement("div");
      errorDiv.className = "alert alert-danger";
      errorDiv.textContent = `Error processing data: ${error.message}`;

      // Insert at the top of the content area
      const contentArea = document.querySelector(".content-area");
      if (contentArea && contentArea.firstChild) {
        contentArea.insertBefore(errorDiv, contentArea.firstChild);
      }

      sendResponse({ status: "error", message: error.message });
    }

    return true; // Keep the message channel open for async response
  }

  // Handle progress updates
  else if (message.type === "FETCH_PROGRESS_UPDATE") {
    console.log("Popup: Received progress update:", message.data);

    try {
      // Update the progress UI
      updateProgressUI(message.data);

      // Send response
      sendResponse({ status: "success", message: "Progress update received" });
    } catch (error) {
      sendResponse({
        status: "error",
        message: "Error handling progress update: " + error.message,
      });
    }

    return true; // Keep the message channel open for async response
  }
});
