# What Changed to Enable HC Export

## Summary

The HC Analysis export feature was **already implemented** in the webapp branch. This document shows what's included in that implementation for reference.

## Files with Export Functionality

### 1. `public/app.js`

#### Added Function: `exportHCAnalysisToCSV()`
**Location:** Lines 801-868

```javascript
window.exportHCAnalysisToCSV = function() {
    // Validates window.currentHCAnalysis exists
    // Builds CSV with headers, department rows, and totals
    // Creates Blob and triggers download
    // Filename: hc-vs-nonhc-breakdown-YYYY-MM-DD.csv
}
```

**Key Features:**
- ✅ Checks for data availability before export
- ✅ Includes company name and period metadata
- ✅ Properly formats CSV (escapes commas, quotes)
- ✅ Uses `formatCurrencyExport()` for consistent formatting
- ✅ Generates date-stamped filename
- ✅ Cleans up resources after download

#### Modified Function: `displayHCAnalysis()`
**Location:** Lines 482-698

**Key Addition (Lines 684-697):**
```javascript
// Store HC analysis for CSV export
window.currentHCAnalysis = hcAnalysis;

// Show HC export button, hide main export button
const exportMainBtn = document.getElementById('exportMainBtn');
const exportHCBtn = document.getElementById('exportHCBtn');
const reportTitle = document.getElementById('reportTitle');

if (exportMainBtn) exportMainBtn.style.display = 'none';
if (exportHCBtn) {
    exportHCBtn.style.display = 'inline-block';
    // Add click handler
    exportHCBtn.onclick = window.exportHCAnalysisToCSV;
}
if (reportTitle) reportTitle.textContent = 'HC vs Non-HC Analysis';
```

**What This Does:**
- ✅ Stores the HC analysis data in a global variable
- ✅ Hides the main "Export CSV" button (for full P&L)
- ✅ Shows the "Export HC Analysis" button
- ✅ Binds the click handler to the export function
- ✅ Updates the report title

### 2. `public/index.html`

#### Export Button HTML
**Location:** Line 236-238 (in results section)

```html
<button class="btn export-btn" id="exportHCBtn" style="display: none;">
    Export HC Analysis
</button>
```

**Key Attributes:**
- `id="exportHCBtn"` - Referenced by JavaScript
- `style="display: none;"` - Hidden by default
- Class `export-btn` - Styled like other export buttons

**Button Container Structure:**
```html
<div style="display: flex; justify-content: space-between; ...">
    <h2 id="reportTitle">P&L Report</h2>
    <div>
        <button onclick="location.reload()">Upload New File</button>
        <button onclick="exportToCSV()" id="exportMainBtn">Export CSV</button>
        <button id="exportHCBtn" style="display: none;">Export HC Analysis</button>
    </div>
</div>
```

## How the Export Works

### Step 1: User Runs HC Analysis
```javascript
// User clicks "HC vs Non-HC Summary" button
analyzeHCvsNonHC() {
    // ... fetch data from API ...
    displayHCAnalysis(report);
}
```

### Step 2: Analysis Calculates and Stores Data
```javascript
displayHCAnalysis(report) {
    // Normalize departments
    // Calculate HC (61000 series) and Non-HC
    const hcAnalysis = {
        "Engineering": { hc: 500000, nonHc: 150000, total: 650000 },
        "Sales & Marketing": { hc: 300000, nonHc: 200000, total: 500000 },
        // ...
    };
    
    // Store for export
    window.currentHCAnalysis = hcAnalysis;
    
    // Show export button
    document.getElementById('exportHCBtn').style.display = 'inline-block';
}
```

### Step 3: User Clicks Export
```javascript
exportHCAnalysisToCSV() {
    // Build CSV rows
    const rows = [
        ['HC vs Non-HC Breakdown'],
        ['Company', currentReport.companyName],
        ['Period', currentReport.period],
        [],
        ['Department', 'HC (61000 series)', 'Non-HC', 'Total'],
        // ... department rows ...
        ['TOTAL', totalHC, totalNonHC, totalAll]
    ];
    
    // Convert to CSV string
    const csv = rows.map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hc-vs-nonhc-breakdown-2026-01-22.csv';
    a.click();
    URL.revokeObjectURL(url);
}
```

## Data Flow Diagram

```
User Action          JavaScript Function              Data Storage
─────────────        ────────────────────────         ───────────────
Upload Excel  →      uploadFile()                     
                     ↓
Click HC      →      analyzeHCvsNonHC()              
Analysis             ↓
                     fetch('/api/quarterly')          
                     ↓
                     displayHCAnalysis(report)  →     window.currentHCAnalysis
                     ↓                                      ↓
                     Show export button                    │
                     ↓                                     │
Click Export  →      exportHCAnalysisToCSV()  ←───────────┘
Button               ↓
                     Generate CSV
                     ↓
                     Download file
```

## Button Visibility Logic

```
State                        Export Buttons Visible
─────────────────────────    ──────────────────────────────
Page Load                    Neither (no analysis yet)
Upload P&L file             Neither (not analyzed yet)
Analyze P&L (transaction)   "Export CSV" only
Analyze HC vs Non-HC        "Export HC Analysis" only
Upload new file             Neither (reset state)
```

## CSV Format Details

### Headers and Metadata
```csv
HC vs Non-HC Breakdown          # Title
Company,Acme Corp               # Optional: only if in source data
Period,Q4 2025                  # Optional: only if in source data
                                # Blank line separator
Department,HC (61000 series),Non-HC,Total   # Column headers
```

### Data Rows
```csv
Engineering,$500000.00,$150000.00,$650000.00
Sales & Marketing,$300000.00,$200000.00,$500000.00
Operations,$200000.00,$100000.00,$300000.00
```

### Total Row
```csv
TOTAL,$1000000.00,$450000.00,$1450000.00
```

## Helper Functions Used

### `formatCurrencyExport(value)`
**Purpose:** Convert numbers to CSV-friendly currency strings

```javascript
function formatCurrencyExport(value) {
    return '$' + Math.abs(value).toFixed(2);
}
```

**Example:**
- Input: `500000` → Output: `$500000.00`
- Input: `-150000` → Output: `$150000.00` (absolute value)

### CSV Cell Escaping
**Purpose:** Handle special characters in CSV

```javascript
row.map(cell => {
    const cellStr = String(cell);
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return '"' + cellStr.replace(/"/g, '""') + '"';
    }
    return cellStr;
})
```

**Examples:**
- `Sales & Marketing` → `Sales & Marketing` (no escaping needed)
- `Sales, Marketing` → `"Sales, Marketing"` (comma requires quotes)
- `"Special" Dept` → `"""Special"" Dept"` (quotes doubled)

## Testing Checklist

When testing the export feature, verify:

- [ ] Button is hidden on page load
- [ ] Button stays hidden after uploading file
- [ ] Button stays hidden after running regular P&L analysis
- [ ] Button appears after running HC analysis
- [ ] Clicking button downloads a file
- [ ] Filename includes today's date
- [ ] CSV opens correctly in Excel/Google Sheets
- [ ] Company name appears (if in source data)
- [ ] Period appears (if in source data)
- [ ] All departments are listed
- [ ] HC totals match 61000-series accounts
- [ ] Non-HC = Total - HC for each department
- [ ] TOTAL row sums all departments correctly
- [ ] Currency formatting is consistent
- [ ] Special characters don't break CSV format

## No Backend Changes Required

**Important:** The export happens entirely in the browser using JavaScript. No changes to the Go backend API were needed because:

1. The `/api/quarterly` endpoint already returns all necessary data
2. The HC classification logic runs in the frontend
3. CSV generation uses browser APIs (Blob, URL.createObjectURL)
4. File download is triggered client-side

This makes the feature:
- ✅ Fast (no server round-trip)
- ✅ Secure (data stays in browser)
- ✅ Simple (no backend deployment needed)
- ✅ Reliable (works offline after data loads)

## Browser Compatibility

**Blob API Support:**
- ✅ Chrome 20+
- ✅ Firefox 13+
- ✅ Safari 6+
- ✅ Edge (all versions)

**URL.createObjectURL Support:**
- ✅ Chrome 23+
- ✅ Firefox 19+
- ✅ Safari 6.1+
- ✅ Edge (all versions)

**Conclusion:** Works in all modern browsers (2013+).
