// Function to update the leads display
function updateLeadsDisplay(data) {
  const totalLeadsSpan = document.getElementById("totalLeads");
  const exportCSVBtn = document.getElementById("exportCSV");
  const exportExcelBtn = document.getElementById("exportExcel");
  const clearDataBtn = document.getElementById("clearData");

  console.log("Popup: updateLeadsDisplay called with data:", data);

  // If no data is provided, use the global variable
  if (!data && window.currentLeadsData) {
    console.log(
      "Popup: Using window.currentLeadsData since no data was provided"
    );
    data = window.currentLeadsData;
  }

  // Check if we have valid data
  if (!data) {
    console.log("Popup: No data available");
    if (totalLeadsSpan) totalLeadsSpan.textContent = "0";
    if (exportCSVBtn) exportCSVBtn.disabled = true;
    if (exportExcelBtn) exportExcelBtn.disabled = true;
    if (clearDataBtn) clearDataBtn.disabled = true;
    return;
  }

  // Ensure data has the expected structure
  let processedData = data;
  if (!data.data || !Array.isArray(data.data)) {
    console.log(
      "Popup: Data doesn't have the expected structure, attempting to fix"
    );

    // If data itself is an array, wrap it
    if (Array.isArray(data)) {
      console.log("Popup: Data is an array, wrapping it");
      processedData = { data: data };
    } else if (typeof data === "object") {
      // Look for arrays in the data
      let foundArray = false;
      for (const key in data) {
        if (Array.isArray(data[key])) {
          console.log(`Popup: Found array in key "${key}"`);
          processedData = { data: data[key] };
          foundArray = true;
          break;
        }
      }

      if (!foundArray) {
        console.log("Popup: Could not find any arrays in the data");
        if (totalLeadsSpan) totalLeadsSpan.textContent = "0";
        if (exportCSVBtn) exportCSVBtn.disabled = true;
        if (exportExcelBtn) exportExcelBtn.disabled = true;
        if (clearDataBtn) clearDataBtn.disabled = true;
        return;
      }
    } else {
      console.log("Popup: Data is not an object or array");
      if (totalLeadsSpan) totalLeadsSpan.textContent = "0";
      if (exportCSVBtn) exportCSVBtn.disabled = true;
      if (exportExcelBtn) exportExcelBtn.disabled = true;
      if (clearDataBtn) clearDataBtn.disabled = true;
      return;
    }
  }

  const leads = processedData.data;
  console.log("Popup: Found leads array with length:", leads.length);

  if (leads.length === 0) {
    if (totalLeadsSpan) totalLeadsSpan.textContent = "0";
    if (exportCSVBtn) exportCSVBtn.disabled = true;
    if (exportExcelBtn) exportExcelBtn.disabled = true;
    if (clearDataBtn) clearDataBtn.disabled = true;
    return;
  }

  // Enable export buttons
  if (exportCSVBtn) exportCSVBtn.disabled = false;
  if (exportExcelBtn) exportExcelBtn.disabled = false;
  if (clearDataBtn) clearDataBtn.disabled = false;

  if (totalLeadsSpan) totalLeadsSpan.textContent = leads.length;

  // Update the table display with the leads data
  const leadsTable = document.getElementById("leadsTable");
  if (leadsTable) {
    // Clear existing table content
    leadsTable.innerHTML = "";

    // Create table header
    const headerRow = document.createElement("tr");
    const headers = ["Product", "Customer", "Contact", "City", "Lead Date"];

    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });

    leadsTable.appendChild(headerRow);

    // Add data rows (limit to first 10 for performance)
    const displayLimit = Math.min(leads.length, 10);
    for (let i = 0; i < displayLimit; i++) {
      const lead = leads[i];
      const row = document.createElement("tr");

      // Add cells for each column
      const product = document.createElement("td");
      product.textContent = lead.contact_last_product || "";
      row.appendChild(product);

      const customer = document.createElement("td");
      customer.textContent = lead.contacts_name || lead.contact_name || "";
      row.appendChild(customer);

      const contact = document.createElement("td");
      contact.textContent = lead.contacts_mobile1 || lead.contact_mobile1 || "";
      row.appendChild(contact);

      const city = document.createElement("td");
      city.textContent = lead.contact_city || "";
      row.appendChild(city);

      const date = document.createElement("td");
      date.textContent = lead.last_contact_date || "";
      row.appendChild(date);

      leadsTable.appendChild(row);
    }

    // Add a message if there are more leads than displayed
    if (leads.length > displayLimit) {
      const infoRow = document.createElement("tr");
      const infoCell = document.createElement("td");
      infoCell.colSpan = 5;
      infoCell.textContent = `Showing ${displayLimit} of ${leads.length} leads. Export to see all.`;
      infoCell.style.textAlign = "center";
      infoCell.style.fontStyle = "italic";
      infoRow.appendChild(infoCell);
      leadsTable.appendChild(infoRow);
    }
  }

  // Store the current data for export (if it's not already set)
  if (!window.currentLeadsData) {
    window.currentLeadsData = processedData;
  }
}

// Function to export data as CSV
function exportAsCSV() {
  if (
    !window.currentLeadsData ||
    !window.currentLeadsData.data ||
    !Array.isArray(window.currentLeadsData.data)
  ) {
    console.log("Popup: Cannot export CSV - invalid data format");
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
    console.log("Popup: Cannot export JSON - invalid data format");
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
    console.log(
      "Popup: Cannot transfer to Google Sheets - invalid data format"
    );
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
    console.error("Error parsing Google Sheet URL:", error);
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
      console.error("Failed to copy to clipboard:", err);

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
    console.log("Popup: Cannot upload to Sheets - invalid data format");
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
      console.error("Error:", error);
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
    console.log("Popup: Cannot export CSV - invalid data format");
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

// Function to refresh data from IndiaMart
function refreshData() {
  console.log("Popup: refreshData called");

  // Debug: Check if window.currentLeadsData exists before refresh
  console.log(
    "Popup: Before refresh - window.currentLeadsData:",
    window.currentLeadsData
  );

  // Show spinning animation on refresh button
  const refreshBtn = document.getElementById("refreshData");
  if (refreshBtn) {
    refreshBtn.classList.add("spinning");
  }

  // Send message to content script to fetch fresh data
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // Check if we're on the IndiaMart page
    if (
      tabs[0] &&
      tabs[0].url &&
      tabs[0].url.includes("seller.indiamart.com")
    ) {
      // We're on the IndiaMart page, send message to content script
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "fetchLeadData", forceFetch: true },
        function (response) {
          if (response && response.status === "fetching") {
            console.log("Popup: Refresh initiated, waiting for data...");
            // The data will come through the message listener
          } else {
            console.log("Popup: Failed to initiate refresh");
            if (refreshBtn) {
              refreshBtn.classList.remove("spinning");
            }

            // Even if refresh failed, try to load from storage
            loadDataFromStorage();

            alert(
              "Failed to refresh data from the page. Loading from storage instead."
            );
          }
        }
      );
    } else {
      // We're not on the IndiaMart page
      console.log("Popup: Not on IndiaMart page, fetching from storage");
      // Just reload from storage
      loadDataFromStorage();

      if (refreshBtn) {
        refreshBtn.classList.remove("spinning");
      }

      // Enable buttons if we have data in storage
      chrome.storage.local.get("indiamartLeads", function (result) {
        console.log("Popup: Checking storage after refresh:", result);
        if (result.indiamartLeads) {
          const exportCSVBtn = document.getElementById("exportCSV");
          const exportExcelBtn = document.getElementById("exportExcel");
          const clearDataBtn = document.getElementById("clearData");

          if (exportCSVBtn) exportCSVBtn.disabled = false;
          if (exportExcelBtn) exportExcelBtn.disabled = false;
          if (clearDataBtn) clearDataBtn.disabled = false;

          // Debug: Check window.currentLeadsData after loading from storage
          console.log(
            "Popup: After refresh (not on IndiaMart) - window.currentLeadsData:",
            window.currentLeadsData
          );
        }
      });
    }
  });
}

// Function to process lead data from storage or API
function processLeadData(rawData) {
  console.log("Popup: Processing lead data");

  // If the data is already in the expected format, return it
  if (rawData && rawData.data && Array.isArray(rawData.data)) {
    console.log("Popup: Data already in expected format");
    return rawData;
  }

  // If the data is an array, wrap it in an object
  if (Array.isArray(rawData)) {
    console.log("Popup: Data is an array, wrapping it");
    return { data: rawData };
  }

  // If the data is an object but doesn't have a data property
  if (typeof rawData === "object" && !rawData.data) {
    console.log(
      "Popup: Data is an object without data property, looking for arrays"
    );

    // Look for arrays in the object
    for (const key in rawData) {
      if (Array.isArray(rawData[key])) {
        console.log(`Popup: Found array in key "${key}"`);
        return { data: rawData[key] };
      }
    }

    // If no arrays found, wrap the object itself
    console.log("Popup: No arrays found, wrapping the object itself");
    return { data: [rawData] };
  }

  // If we can't process the data, return an empty data structure
  console.log("Popup: Unable to process data, returning empty structure");
  return { data: [] };
}

// Function to load data from storage
function loadDataFromStorage() {
  console.log("Popup: loadDataFromStorage called");

  chrome.storage.local.get("indiamartLeads", function (result) {
    console.log("Popup: Storage data retrieved:", result);

    if (result.indiamartLeads) {
      try {
        // Process the data
        const processedData = processLeadData(result.indiamartLeads);
        console.log("Popup: Data processed:", processedData);

        // Set the global variable
        window.currentLeadsData = processedData;
        console.log(
          "Popup: window.currentLeadsData set to:",
          window.currentLeadsData
        );

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
        console.error("Popup: Error processing lead data:", error);
        alert("Error processing lead data: " + error.message);
      }
    } else {
      console.log("Popup: No data found in storage");
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

  console.log(
    `Popup: Merged data - ${existingData.data.length} existing leads + ${newData.data.length} new leads = ${mergedData.data.length} total leads`
  );

  return mergedData;
}

// Function to export data as Excel
function exportAsExcel() {
  console.log("Popup: exportAsExcel called");

  try {
    // Check if XLSX is available
    if (typeof XLSX === "undefined") {
      console.error("Popup: XLSX library is not available");
      alert(
        "Excel export library (SheetJS) is not available. Please check the console for more details."
      );
      return;
    } else {
      console.log("Popup: XLSX library is available:", XLSX);
    }

    // Debug window.currentLeadsData
    console.log(
      "Popup: window.currentLeadsData in exportAsExcel:",
      window.currentLeadsData
    );

    if (
      !window.currentLeadsData ||
      !window.currentLeadsData.data ||
      !Array.isArray(window.currentLeadsData.data)
    ) {
      console.log("Popup: Cannot export Excel - invalid data format");
      alert("No valid data to export. Please refresh the data first.");
      return;
    }

    const leads = window.currentLeadsData.data;
    console.log("Popup: Leads data for Excel export:", leads);

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

    console.log("Popup: Creating Excel workbook");
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    console.log("Popup: Workbook created");

    // Create a worksheet from the data
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    console.log("Popup: Worksheet created");

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "IndiaMart Leads");
    console.log("Popup: Worksheet added to workbook");

    // Generate Excel file and trigger download
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
    const filename = `IndiaMart_Leads_${dateStr}.xlsx`;

    console.log("Popup: Writing Excel file:", filename);
    XLSX.writeFile(wb, filename);

    console.log("Popup: Excel file exported successfully");
  } catch (error) {
    console.error("Popup: Error exporting Excel file:", error);
    alert("Error exporting Excel file: " + error.message);
  }
}

// Function to check if Chrome APIs are available
function checkChromeAPIs() {
  console.log("Checking Chrome APIs...");

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

  console.log("API availability:", apis);

  // Check if we can access storage
  if (apis["chrome.storage.local"]) {
    chrome.storage.local.get("test", function (result) {
      console.log("Storage test result:", result);
      if (chrome.runtime.lastError) {
        console.error("Storage error:", chrome.runtime.lastError);
      }
    });
  }

  return apis;
}

// Function to check if the SheetJS library is loaded
function checkSheetJSLibrary() {
  console.log("Popup: Checking if SheetJS library is loaded");

  if (typeof XLSX === "undefined") {
    console.error("Popup: SheetJS library is not loaded");

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
    console.log("Popup: SheetJS library is loaded:", XLSX);
    return true;
  }
}

// Update the event listeners in the document ready function
document.addEventListener("DOMContentLoaded", function () {
  console.log("Popup: DOM Content Loaded");

  // Check Chrome APIs
  checkChromeAPIs();

  // Check if SheetJS library is loaded
  checkSheetJSLibrary();

  try {
    // Check if all elements exist
    const elements = ["exportCSV", "exportExcel", "clearData"];

    const missingElements = [];
    elements.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) {
        missingElements.push(id);
        console.error(`Popup: Element with ID "${id}" not found`);
      }
    });

    if (missingElements.length > 0) {
      console.error(`Popup: Missing elements: ${missingElements.join(", ")}`);
    }

    // Load initial data
    loadDataFromStorage();

    // Listen for updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("Popup: Received message type:", message.type);

      if (message.type === "NEW_LEADS") {
        console.log("Popup: Received NEW_LEADS message");

        // Process the data
        try {
          // Check if data is too large for logging
          const dataSize = JSON.stringify(message.data).length;
          console.log(`Popup: Received data size: ${dataSize} bytes`);

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
          }

          // Update the display
          updateLeadsDisplay();

          // Explicitly enable buttons
          const exportCSVBtn = document.getElementById("exportCSV");
          const exportExcelBtn = document.getElementById("exportExcel");
          const clearDataBtn = document.getElementById("clearData");

          if (exportCSVBtn) exportCSVBtn.disabled = false;
          if (exportExcelBtn) exportExcelBtn.disabled = false;
          if (clearDataBtn) clearDataBtn.disabled = false;

          // Send an immediate response
          sendResponse({ status: "received" });
        } catch (error) {
          console.error("Popup: Error processing message data:", error);
          alert("Error processing received data: " + error.message);
          sendResponse({ status: "error", message: error.message });
        }

        return true; // Keep the message channel open for async response
      }
    });

    // Add event listeners with error handling
    function addClickListener(id, handler) {
      const element = document.getElementById(id);
      if (element) {
        console.log(`Popup: Adding click listener to ${id}`);
        element.addEventListener("click", function (event) {
          console.log(`Popup: ${id} clicked`);
          try {
            handler(event);
          } catch (error) {
            console.error(`Popup: Error in ${id} click handler:`, error);
            alert(`Error in ${id} handler: ${error.message}`);
          }
        });
      } else {
        console.error(
          `Popup: Cannot add listener to ${id} - element not found`
        );
      }
    }

    // Add event listeners for the three buttons
    addClickListener("exportCSV", exportAsCSV);
    addClickListener("exportExcel", exportAsExcel);
    addClickListener("clearData", clearStoredData);

    // Add event listener for the refresh button in the header
    addClickListener("refreshData", refreshData);

    // Update the data retrieval to enable buttons
    chrome.storage.local.get("indiamartLeads", function (result) {
      console.log("Popup: Checking storage for enabling buttons:", result);
      if (result.indiamartLeads) {
        const exportCSVBtn = document.getElementById("exportCSV");
        const exportExcelBtn = document.getElementById("exportExcel");
        const clearDataBtn = document.getElementById("clearData");

        if (exportCSVBtn) exportCSVBtn.disabled = false;
        if (exportExcelBtn) exportExcelBtn.disabled = false;
        if (clearDataBtn) clearDataBtn.disabled = false;
      }
    });
  } catch (error) {
    console.error("Popup: Error in DOMContentLoaded handler:", error);
    alert(`Error initializing popup: ${error.message}`);
  }
});
