// Function to ensure refresh button is enabled
function ensureRefreshButtonEnabled() {
  const refreshBtn = document.getElementById("refreshData");
  if (refreshBtn) {
    refreshBtn.disabled = false;
    refreshBtn.classList.remove("spinning");
    refreshBtn.title = "Refresh Data";
    console.log("Refresh button enabled");
  }
}

// Add event listener to run when the popup is shown
window.addEventListener("load", ensureRefreshButtonEnabled);
document.addEventListener("DOMContentLoaded", ensureRefreshButtonEnabled);
