# IndiaMart Lead Manager Chrome Extension

This Chrome extension captures and manages lead data from IndiaMart's Lead Manager page.

## Features

- Automatically captures lead data from IndiaMart
- Displays leads in a clean, organized interface
- Export specific lead fields as CSV
- Export all lead data as JSON
- Transfer specific lead fields directly to Google Sheets
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
3. Click the extension icon to view captured leads
4. Use the buttons at the bottom to export or transfer the data

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

The extension provides a simple way to transfer data to Google Sheets:

### Direct Transfer to Google Sheets

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

## Troubleshooting

If you encounter any issues:

1. Make sure you're logged into your IndiaMart seller account
2. Check the browser console for error messages (F12 > Console)
3. Try clearing the extension's stored data and capturing leads again
4. Ensure you have the necessary permissions to access Google Sheets (if using that feature)

## Privacy

This extension only captures data from the IndiaMart Lead Manager page and stores it locally in your browser. No data is sent to any external servers except when you explicitly choose to transfer it to Google Sheets.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
