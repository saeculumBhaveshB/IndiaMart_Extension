// Function to update the leads display
function updateLeadsDisplay(data) {
  const leadsList = document.getElementById("leadsList");
  const totalLeadsSpan = document.getElementById("totalLeads");
  const exportCSVBtn = document.getElementById("exportCSV");
  const exportJSONBtn = document.getElementById("exportJSON");
  const transferSheetsBtn = document.getElementById("transferSheets");
  const clearDataBtn = document.getElementById("clearData");

  console.log("Popup: updateLeadsDisplay called with data:", data);

  // Check if we have valid data
  if (!data) {
    console.log("Popup: No data provided");
    leadsList.innerHTML =
      '<div class="no-leads">No leads captured yet. Please visit the IndiaMart Lead Manager page.</div>';
    totalLeadsSpan.textContent = "0";
    exportCSVBtn.disabled = true;
    exportJSONBtn.disabled = true;
    transferSheetsBtn.disabled = true;
    clearDataBtn.disabled = true;
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
        leadsList.innerHTML =
          '<div class="no-leads">Invalid data format. Please visit the IndiaMart Lead Manager page to refresh the data.</div>';
        totalLeadsSpan.textContent = "0";
        exportCSVBtn.disabled = true;
        exportJSONBtn.disabled = true;
        transferSheetsBtn.disabled = true;
        clearDataBtn.disabled = true;
        return;
      }
    } else {
      console.log("Popup: Data is not an object or array");
      leadsList.innerHTML =
        '<div class="no-leads">Invalid data format. Please visit the IndiaMart Lead Manager page to refresh the data.</div>';
      totalLeadsSpan.textContent = "0";
      exportCSVBtn.disabled = true;
      exportJSONBtn.disabled = true;
      transferSheetsBtn.disabled = true;
      clearDataBtn.disabled = true;
      return;
    }
  }

  const leads = processedData.data;
  console.log("Popup: Found leads array with length:", leads.length);

  if (leads.length === 0) {
    leadsList.innerHTML =
      '<div class="no-leads">No leads found in the captured data.</div>';
    totalLeadsSpan.textContent = "0";
    exportCSVBtn.disabled = true;
    exportJSONBtn.disabled = true;
    transferSheetsBtn.disabled = true;
    clearDataBtn.disabled = true;
    return;
  }

  // Enable export buttons
  exportCSVBtn.disabled = false;
  exportJSONBtn.disabled = false;
  transferSheetsBtn.disabled = false;
  clearDataBtn.disabled = false;

  totalLeadsSpan.textContent = leads.length;

  // Clear previous content
  leadsList.innerHTML = "";

  // Add each lead item
  leads.forEach((lead) => {
    console.log("Popup: Processing lead:", lead);
    const leadItem = document.createElement("div");
    leadItem.className = "lead-item";

    // Extract lead details based on IndiaMart API response structure
    // IndiaMart uses different field names, so we need to check multiple possibilities
    const name =
      lead.buyerName ||
      lead.buyer_name ||
      lead.name ||
      lead.contact_person ||
      "Unknown";
    const mobile =
      lead.mobile_no || lead.mobile || lead.phone || lead.contact_mobile || "";
    const email = lead.email || lead.sender_email || lead.contact_email || "";
    const message =
      lead.query_message ||
      lead.message ||
      lead.query ||
      lead.requirement ||
      "";
    const date =
      lead.query_date || lead.date || lead.timestamp || lead.created_date || "";
    const company = lead.company_name || lead.companyName || lead.company || "";
    const location = lead.city || lead.location || "";

    // Build the lead item HTML
    let leadHtml = `<strong>${name}</strong>`;
    if (company) leadHtml += ` - ${company}`;
    leadHtml += "<br>";

    if (mobile) leadHtml += `📱 ${mobile}<br>`;
    if (email) leadHtml += `📧 ${email}<br>`;
    if (location) leadHtml += `📍 ${location}<br>`;
    if (message) leadHtml += `💬 ${message}<br>`;
    if (date) {
      try {
        const formattedDate = new Date(date).toLocaleString();
        leadHtml += `📅 ${formattedDate}<br>`;
      } catch (e) {
        leadHtml += `📅 ${date}<br>`;
      }
    }

    leadItem.innerHTML = leadHtml;
    leadsList.appendChild(leadItem);
  });

  // Store the current data for export
  window.currentLeadsData = processedData;
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

// Load initial data
chrome.storage.local.get("indiamartLeads", function (result) {
  console.log("Popup: Retrieved data from storage:", result);
  if (result.indiamartLeads) {
    updateLeadsDisplay(result.indiamartLeads);
  } else {
    console.log("Popup: No data found in storage");
  }
});

// Listen for updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Popup: Received message:", message);
  if (message.type === "NEW_LEADS") {
    updateLeadsDisplay(message.data);
    // Send an immediate response
    sendResponse({ status: "received" });
  }
  // Don't return true here since we're not using an async response
});

// Add event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("Popup: DOM content loaded");
  document.getElementById("exportCSV").addEventListener("click", exportAsCSV);
  document.getElementById("exportJSON").addEventListener("click", exportAsJSON);
  document
    .getElementById("transferSheets")
    .addEventListener("click", showTransferToSheets);
  document
    .getElementById("confirmTransfer")
    .addEventListener("click", transferToGoogleSheets);
  document
    .getElementById("clearData")
    .addEventListener("click", clearStoredData);
});
