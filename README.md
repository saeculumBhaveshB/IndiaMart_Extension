# IndiaMart Lead Manager Chrome Extension

This Chrome extension captures and manages lead data from IndiaMart's Lead Manager page.

## Features

- **Automatic Lead Capture**: Automatically captures lead data from IndiaMart seller panel.
- **Data Export**: Export your leads as CSV or JSON files for backup or analysis.
- **Google Sheets Integration**: Easily transfer your leads to Google Sheets with formatting.
- **Direct Upload**: Upload leads directly to a Google Sheet with a single click.
- **Refresh Data**: Sync data again with a single click, with smart duplicate handling.
- **Excel Export**: Download your leads as an Excel (.xlsx) file with proper formatting.
- Simplified interface with action buttons only
- **RECOMMENDED:** Direct upload to Google Sheets via API (best for regular transfers)
- Export specific lead fields as CSV
- Export all lead data as JSON
- Transfer specific lead fields via clipboard
- CSV export with Google Sheets import dialog
- Clear stored data when needed

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension folder
5. The extension is now installed and ready to use

## Usage

1. Visit the IndiaMart Lead Manager page at `https://seller.indiamart.com/messagecentre`
2. The extension will automatically capture lead data
3. Click the extension icon to view the action buttons
4. Use the buttons to export or transfer the data

## Exported Fields

Both the CSV export and Google Sheets transfer include only the following specific fields with custom column titles:

| Field in Data        | Column Title     |
| -------------------- | ---------------- |
| contact_last_product | **PRODUCT**      |
| contacts_name        | **CUSTOMER**     |
| contacts_mobile1     | **CONTACT**      |
| contact_city         | **CITY**         |
| last_contact_date    | **LEAD DATE**    |
| last_product_qty     | **REQUIREMENTS** |
| contacts_company     | **FIRM**         |

## Google Sheets Integration

The extension provides multiple ways to transfer data to Google Sheets:

### Direct Upload to Google Sheets (RECOMMENDED)

This is the most convenient method for regular transfers to the same Google Sheet. Once set up, you can upload data with just a few clicks.

#### First-Time Setup:

1. Go to https://script.google.com/ and create a new project
2. Copy and paste the script from `google-sheets-script.txt` into the editor
3. Click on Deploy > New deployment
4. Select "Web app" as the deployment type
5. Set "Who has access" to "Anyone"
6. Click "Deploy"
7. Copy the Web app URL that is generated - you'll need the Script ID from this URL
   (The Script ID is the part between `/macros/s/` and `/exec` in the URL)

#### Using Direct Upload:

1. Click the "Direct Upload to Sheets" button in the extension popup
2. For first-time use:
   - Enter your Google Sheet URL (e.g., https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit)
   - Enter your Script ID from the deployment step above
   - Click "Upload to Sheet"
3. For subsequent uses:
   - The extension will remember your last used sheet and Script ID
   - You'll be asked if you want to upload directly to the same sheet
   - Just click "OK" to proceed with the upload

The extension will:

- Directly upload your lead data to the Google Sheet
- Format the headers with bold text and larger font size
- Auto-resize columns for better readability
- Open your Google Sheet in a new tab when complete

### CSV with Import Dialog

1. Click the "CSV + Import Dialog" button in the extension popup
2. The extension will:
   - Download the CSV file to your computer
   - Ask if you want to open the Google Sheets import dialog
   - If you confirm, it will open a new Google Sheets document with the import dialog
3. In the import dialog:
   - Select the downloaded CSV file
   - Make sure "Comma" is selected as the separator
   - Click "Import data"

This method is simpler than the direct upload as it doesn't require setting up a Google Apps Script, but it does require a few more manual steps.

### Clipboard Transfer to Google Sheets

1. Click the "Transfer to Sheets" button in the extension popup
2. Enter your Google Sheet URL (e.g., https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit)
3. Click "Transfer Data"
4. The extension will:
   - Open your Google Sheet in a new tab
   - Copy the filtered lead data to your clipboard with bold, larger headers
   - Provide instructions for pasting the data into your Google Sheet

### CSV Export

1. Click the "Export as CSV" button to download your lead data as a CSV file
2. The CSV file will contain only the specific fields listed above with the custom column titles
3. You can open this file in Excel, Google Sheets, or any other spreadsheet application

### JSON Export (All Fields)

If you need all the original data fields:

1. Click the "Export as JSON" button to download your lead data as a JSON file
2. This file will contain all the original data fields from IndiaMart
3. You can use this file for backup purposes or for custom data processing

## Data Management

### Refresh Data

Click the refresh button in the header to sync data again from the IndiaMart page. The extension will:

1. Fetch the latest data from the page
2. Intelligently merge with existing data, replacing duplicates
3. Update the display with the combined data

### Duplicate Handling

When refreshing data, the extension identifies duplicates using a composite key of:

- Contact mobile number
- Contact name
- Product

If a lead with the same key exists, the newer version will replace the older one, ensuring your data stays up-to-date without duplicates.

### CSV Export

Click the "Export as CSV" button to download your leads as a CSV file. The CSV file will contain only the following specific fields with formatted headers:

| Original Field       | CSV Header       |
| -------------------- | ---------------- |
| contact_last_product | **PRODUCT**      |
| contacts_name        | **CUSTOMER**     |
| contacts_mobile1     | **CONTACT**      |
| contact_city         | **CITY**         |
| last_contact_date    | **LEAD DATE**    |
| last_product_qty     | **REQUIREMENTS** |
| contacts_company     | **FIRM**         |

### Excel Export

Click the "Export as Excel" button to download your leads as an Excel (.xlsx) file. The Excel file will contain the same fields as the CSV export, with properly formatted headers and column widths.

### JSON Export

Click the "Export as JSON" button to download your leads as a JSON file. This file contains all original data fields and is useful for backup purposes.

## Troubleshooting

If you encounter any issues:

1. Make sure you're logged into your IndiaMart seller account
2. Check the browser console for error messages (F12 > Console)
3. Try clearing the extension's stored data and capturing leads again
4. Ensure you have the necessary permissions to access Google Sheets (if using that feature)
5. For direct upload issues:
   - Verify that your Google Apps Script is properly deployed and accessible
   - Make sure you've entered the correct Script ID
   - Check that your Google Sheet is accessible (not restricted)
   - If the direct upload fails, the extension will offer to fall back to the clipboard method

## Privacy

This extension only captures data from the IndiaMart Lead Manager page and stores it locally in your browser. No data is sent to any external servers except when you explicitly choose to transfer it to Google Sheets.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
