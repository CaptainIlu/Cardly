# Cardly

Cardly is a local-first credit card manager. It runs directly in Google Chrome and does not need a server or internet connection.

## Open Cardly

1. Double-click `index.html`.
2. Choose **Create Data File** and save `cardly-data.json` somewhere convenient, or choose **Open Data File** if you already have one.
3. Cardly saves cards, bills, payments, milestones, and transactions directly to that JSON file as you make changes.

Dates are entered and displayed as `DD-MM-YYYY` (for example, `26-09-2026`).

When you reopen Cardly, Chrome may restore the last file automatically. If it asks, choose **Reopen Last Data File** or select the file with **Open Data File**. Chrome may ask you to grant file access again.

Keep a backup copy of `cardly-data.json` if you want an extra safeguard. The file contains your financial details, so store it somewhere private.

## Browser support

Direct file saving uses Chrome's File System Access API. Use an up-to-date version of Google Chrome.

## iPhone

On iPhone, open `index.html` in Chrome or Safari and choose **Import Data File**. Select `cardly-data.json` from the Files app or iCloud Drive. Cardly keeps edits on that iPhone while you use it.

When you finish, tap **Export Data** and save the new `cardly-data.json` back to iCloud Drive. Use that exported file the next time you open Cardly on your Mac or iPhone. iPhone browsers cannot update the selected iCloud Drive file directly, so exporting after edits keeps the shared file current.

## Existing browser data

Data saved by an earlier version while it was open at `http://localhost:8080` is stored separately in Chrome's browser storage. It is not automatically moved into a Cardly JSON file.
