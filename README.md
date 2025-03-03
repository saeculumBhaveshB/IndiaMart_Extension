# IndiaMart Lead Manager Chrome Extension

This Chrome extension captures and stores lead data from the IndiaMart Lead Manager page.

## Features

- Automatically captures lead data from IndiaMart's Lead Manager
- Stores lead information locally in your browser
- Simple popup interface to view captured leads
- Export leads as CSV or JSON files
- Real-time updates when new leads are captured

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. After installation, you'll see the extension icon in your Chrome toolbar
2. Visit the IndiaMart Lead Manager page (https://seller.indiamart.com/...)
3. The extension will automatically capture lead data when the page loads or refreshes
4. Click the extension icon to view captured leads
5. Use the export buttons to download leads as CSV or JSON
6. Data is stored locally in your browser

## How It Works

The extension works by:

1. Monitoring network requests to the IndiaMart API endpoint (`https://seller.indiamart.com/lmsreact/getContactList`)
2. Intercepting and storing the response data when the API is called
3. Providing a user interface to view and export the captured data

## Privacy & Security

- All data is stored locally in your browser
- No data is sent to external servers
- The extension only accesses the IndiaMart Lead Manager page

## Requirements

- Google Chrome browser
- Access to IndiaMart Lead Manager

## Support

If you encounter any issues or have questions, please create an issue in the repository.
