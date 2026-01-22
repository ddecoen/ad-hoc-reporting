# HC Analysis Export Feature Demo

## What This Feature Does

The HC Analysis Export feature allows you to download HC (Human Capital) vs Non-HC expense breakdowns from quarterly income statements as CSV files.

## Live Demo

**App URL:** https://ad-hoc-reporting-hisl6m6so-ddecoens-projects.vercel.app/

### Step-by-Step Usage

1. **Upload File**
   - Click the "Quarterly Income Statement" tab
   - Upload an Excel file (.xlsx or .xls) containing NetSuite quarterly income data

2. **Run HC Analysis**
   - Click the "HC vs Non-HC Summary" button (green button)
   - The app will analyze your data and display:
     - Summary cards showing total expenses per department
     - Detailed breakdown table with HC vs Non-HC columns

3. **Export to CSV**
   - Click the "Export HC Analysis" button (appears after analysis runs)
   - A CSV file will download automatically
   - Filename format: `hc-vs-nonhc-breakdown-2026-01-22.csv`

## Example Export Output

```csv
HC vs Non-HC Breakdown
Company,Your Company Name
Period,Q4 2025

Department,HC (61000 series),Non-HC,Total
Engineering,$500000.00,$150000.00,$650000.00
Sales & Marketing,$300000.00,$200000.00,$500000.00
Operations,$200000.00,$100000.00,$300000.00
TOTAL,$1000000.00,$450000.00,$1450000.00
```

## Technical Details

### What Makes an Expense "HC"?

The app identifies HC (Human Capital) expenses using NetSuite account numbers:
- **HC Expenses:** Accounts 61000-61999
  - Salaries, wages, benefits, payroll taxes, etc.
- **Non-HC Expenses:** All other operating expenses (60000-69999, excluding 61000 series)
  - Rent, utilities, software licenses, marketing costs, etc.

### Key Features

✅ **Department Normalization**
   - Automatically combines duplicate departments with different capitalizations
   - Example: "Sales & Marketing" + "sales & marketing" → "Sales & Marketing"

✅ **Smart Expense Detection**
   - Finds "Total Operating Expenses" lines automatically
   - Falls back to calculating from individual line items if needed
   - Filters out revenue, net income, and other non-expense items

✅ **CSV Formatting**
   - Properly escapes special characters
   - Handles commas and quotes in department names
   - Uses consistent currency formatting

✅ **Date-Stamped Files**
   - Auto-generated filenames with current date
   - Easy to organize and track exports over time

## Use Cases

### Financial Planning
Export HC vs Non-HC data to:
- Track compensation costs across departments
- Budget for non-labor expenses separately
- Analyze expense ratios over time

### Executive Reporting
Create summaries for:
- Board meetings showing expense composition
- Department head reviews of team costs
- Quarterly business reviews

### Analysis & Modeling
Feed exported data into:
- Excel models for forecasting
- Tableau/Power BI dashboards
- Custom analytics tools

## Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari

## Privacy & Security

- All processing happens in your browser
- Files are not stored on servers
- Export downloads directly to your device
- No data is transmitted after initial upload for analysis

## Troubleshooting

**Export button not showing?**
- Make sure you clicked "HC vs Non-HC Summary" first
- The button only appears after analysis completes

**Empty or incorrect data?**
- Verify your Excel file is a NetSuite quarterly income statement
- Check that accounts are numbered in the 60000+ range
- Ensure departments are properly labeled in the source data

**CSV won't open correctly?**
- Open with Excel, Google Sheets, or any spreadsheet app
- Select "Comma" as the delimiter if prompted
- Check that currency values imported as text (they have $ symbols)
