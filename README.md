# Ad-Hoc Reporting - HC Analysis Export Feature

## Overview

This branch adds the ability to export HC (Human Capital) vs Non-HC analysis from quarterly income statements to CSV format.

## Features

### HC Analysis Export

When you analyze a quarterly income statement using the "HC vs Non-HC Summary" button, you can now export the results to CSV format.

**The export includes:**
- Company name and period information
- Department-by-department breakdown showing:
  - HC expenses (61000 series accounts - compensation)
  - Non-HC expenses (all other operating expenses)
  - Total expenses per department
- Overall totals across all departments

**How to use:**
1. Upload a quarterly income statement (Excel format)
2. Click "HC vs Non-HC Summary" button
3. Review the HC analysis displayed on screen
4. Click "Export HC Analysis" button to download the CSV file

**File naming:**
The exported file will be named: `hc-vs-nonhc-breakdown-YYYY-MM-DD.csv`

## Technical Implementation

### Frontend (app.js)
- `displayHCAnalysis()`: Analyzes departments and calculates HC vs Non-HC splits
  - Identifies HC expenses using account numbers (61000-61999 series)
  - Calculates Non-HC as Total Expenses minus HC
  - Stores analysis in `window.currentHCAnalysis` for export
  - Shows/hides appropriate export buttons

- `exportHCAnalysisToCSV()`: Generates and downloads CSV file
  - Creates properly formatted CSV with headers and totals
  - Handles special characters and commas in cell values
  - Uses `formatCurrencyExport()` for consistent number formatting

### UI (index.html)
- Export button is hidden by default
- Shows only when HC analysis is displayed
- Main "Export CSV" button is hidden during HC analysis view

## Account Classification

**HC (Human Capital) Expenses:**
- Account numbers 61000-61999
- Typically includes: salaries, wages, benefits, payroll taxes

**Non-HC Expenses:**
- All other operating expense accounts (60000-69999, excluding 61000-61999)
- Includes: rent, utilities, software, marketing, etc.

## Development Notes

- The export functionality is already fully implemented in the webapp branch
- HC analysis correctly handles:
  - Department name normalization (to combine duplicates)
  - Finding total expense lines vs. calculating manually
  - Filtering out non-expense items (revenue, net income, etc.)

## Files Modified

- `public/app.js`: Export logic and HC analysis display
- `public/index.html`: Export button UI