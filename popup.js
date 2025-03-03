// Function to update the leads display
function updateLeadsDisplay(data) {
  const leadsList = document.getElementById("leadsList");
  const totalLeadsSpan = document.getElementById("totalLeads");
  const exportCSVBtn = document.getElementById("exportCSV");
  const exportJSONBtn = document.getElementById("exportJSON");
  const clearDataBtn = document.getElementById("clearData");

  console.log("Popup: updateLeadsDisplay called with data:", data);

  // Check if we have valid data
  if (!data || !data.data || !Array.isArray(data.data)) {
    console.log("Popup: Invalid data format, data structure:", data);
    leadsList.innerHTML =
      '<div class="no-leads">No leads captured yet. Please visit the IndiaMart Lead Manager page.</div>';
    totalLeadsSpan.textContent = "0";
    exportCSVBtn.disabled = true;
    exportJSONBtn.disabled = true;
    clearDataBtn.disabled = true;
    return;
  }

  const leads = data.data;
  console.log("Popup: Found leads array with length:", leads.length);

  if (leads.length === 0) {
    leadsList.innerHTML =
      '<div class="no-leads">No leads found in the captured data.</div>';
    totalLeadsSpan.textContent = "0";
    exportCSVBtn.disabled = true;
    exportJSONBtn.disabled = true;
    clearDataBtn.disabled = true;
    return;
  }

  // Enable export buttons
  exportCSVBtn.disabled = false;
  exportJSONBtn.disabled = false;
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
  window.currentLeadsData = data;
}

// Function to export data as CSV
function exportAsCSV() {
  if (!window.currentLeadsData || !window.currentLeadsData.data) return;

  const leads = window.currentLeadsData.data;

  // Get all possible keys from all leads
  const allKeys = new Set();
  leads.forEach((lead) => {
    Object.keys(lead).forEach((key) => allKeys.add(key));
  });

  // Convert Set to Array
  const headers = Array.from(allKeys);

  // Create CSV content
  let csvContent = headers.join(",") + "\n";

  leads.forEach((lead) => {
    const row = headers.map((header) => {
      // Handle values that might contain commas or quotes
      let value = lead[header] || "";
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
  if (!window.currentLeadsData) return;

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
    .getElementById("clearData")
    .addEventListener("click", clearStoredData);
});
