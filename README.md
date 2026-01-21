# NetSuite P&L Analyzer 📊

A serverless web application built with Go and deployed on Vercel that transforms NetSuite Transaction Detail reports into comprehensive P&L statements with headcount vs. non-headcount breakdowns.

## Features

✨ **Multiple File Format Support**
- CSV upload support
- Excel (.xlsx, .xls) upload support
- Automatic format detection

✨ **Comprehensive P&L Breakdown**
- Revenue, COGS, Gross Profit, and Gross Margin
- Operating Expenses (OpEx) categorized into:
  - Sales & Marketing (S&M)
  - Research & Development (R&D)
  - General & Administrative (G&A)
- EBITDA calculation

📊 **Headcount vs. Non-Headcount Analysis**
- Automatic classification of expenses
- Detailed subcategory breakdowns:
  - **S&M**: SDRs, AEs, Marketing, Customer Support
  - **COGS**: Customer Support, Professional Services, Infrastructure
  - **R&D**: Engineering, Product
  - **G&A**: Finance & Accounting, Legal, HR, Facilities

🎨 **Beautiful UI**
- Drag-and-drop file upload
- Interactive visualizations
- Responsive design
- Export results to CSV

## Quick Start

### Deploy to Vercel

1. **Fork/Clone this repository**

2. **Install Vercel CLI** (optional, for local testing)
   ```bash
   npm install -g vercel
   ```

3. **Deploy to Vercel**
   ```bash
   vercel
   ```
   
   Or connect your GitHub repository to Vercel for automatic deployments.

### Local Development

1. **Install Go 1.21+**
   ```bash
   go version
   ```

2. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

3. **Run locally**
   ```bash
   vercel dev
   ```

4. **Open browser**
   ```
   http://localhost:3000
   ```

## Usage

### Exporting from NetSuite

1. Navigate to **Reports > Saved Searches > All Saved Searches**
2. Create or run a **Transaction Detail** report with these columns:
   - Date / Transaction Date
   - Type / Transaction Type
   - Document Number
   - Name (Vendor/Employee/Customer)
   - Account / Account Name
   - Department
   - Class
   - Amount / Debit / Credit
   - Memo / Description

3. Export as **CSV** or **Excel** (.xlsx)

### Analyzing Your Data

1. Open the web app
2. Drag and drop your CSV or Excel file (or click to browse)
3. Click "Analyze P&L"
4. View your comprehensive P&L breakdown
5. Export results to CSV if needed

## How It Works

### Classification Logic

The application uses intelligent keyword matching to categorize transactions:

**Revenue Detection**
- Keywords: revenue, sales, income
- Excludes: deferred revenue

**COGS Classification**
- Keywords: cogs, cost of goods, cost of sales, cost of revenue
- Subcategories based on department/class

**OpEx Categories**
- **S&M**: sales, marketing, customer success, customer support, sdr, ae
- **R&D**: r&d, research, development, engineering, product
- **G&A**: general, administrative, finance, accounting, legal, hr, facilities

**Headcount Identification**
- Keywords: salary, wages, payroll, compensation, benefits, bonus, commission, stock, equity, 401k, insurance, health, dental, vision, pto, severance, recruiting

### Customization

To customize categorization logic, edit `api/analyze.go`:

```go
// Add custom keywords
func determineOpExCategory(account, dept, class string) string {
    text := strings.ToLower(account + " " + dept + " " + class)
    
    // Add your custom logic here
    if strings.Contains(text, "your-custom-keyword") {
        return "S&M"
    }
    // ...
}
```

## Project Structure

```
.
├── api/
│   └── analyze.go          # Go backend - CSV parsing & P&L logic
├── public/
│   ├── index.html          # Frontend UI
│   └── app.js              # Client-side JavaScript
├── go.mod                  # Go dependencies
├── vercel.json             # Vercel configuration
└── README.md
```

## API Endpoint

### POST /api/analyze

Processes a NetSuite CSV file and returns P&L JSON.

**Request**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: CSV file with name `file`

**Response**
```json
{
  "revenue": 1000000,
  "cogs": {
    "name": "COGS",
    "total": 300000,
    "headcount": 200000,
    "nonHeadcount": 100000,
    "subcategories": {
      "Customer Support": {
        "name": "Customer Support",
        "headcount": 150000,
        "nonHeadcount": 50000,
        "total": 200000
      }
    }
  },
  "grossProfit": 700000,
  "grossMargin": 70.0,
  "opex": {
    "S&M": { /* ... */ },
    "R&D": { /* ... */ },
    "G&A": { /* ... */ }
  },
  "totalOpex": 500000,
  "ebitda": 200000
}
```

## Tech Stack

- **Backend**: Go 1.21+
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Vercel Serverless Functions
- **File Processing**: Go CSV parser, Excel parser (excelize library)

## Configuration

### Environment Variables

No environment variables required for basic usage. The app works out of the box.

### Vercel Configuration

The `vercel.json` file configures:
- Go serverless functions in `/api`
- Static file serving from `/public`
- Routing rules

## Troubleshooting

### CSV Parse Errors

**Problem**: "Failed to parse CSV"

**Solutions**:
1. Ensure CSV has header row
2. Check that file is properly formatted
3. Verify columns include at least: Account, Amount
4. Remove any summary rows at top/bottom

### Incorrect Categorization

**Problem**: Expenses in wrong category

**Solutions**:
1. Update keywords in `api/analyze.go`
2. Ensure NetSuite data includes Department/Class fields
3. Check that account names follow standard conventions

### Local Development Issues

**Problem**: "Cannot find module '@vercel/go'"

**Solution**:
```bash
npm install -g vercel
vercel dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check existing GitHub Issues
2. Create a new issue with:
   - Sample CSV structure (anonymized)
   - Expected vs. actual behavior
   - Error messages

## Roadmap

- [ ] Multi-currency support
- [ ] Time-series analysis (monthly trends)
- [ ] Custom categorization rules via UI
- [ ] Department/team-level drill-downs
- [ ] Budget vs. actual comparisons
- [ ] Excel export with formatting
- [ ] Authentication & saved reports

## Acknowledgments

Built for finance teams who need quick P&L insights from NetSuite data without complex setup or Excel macros.

---

**Made with ❤️ for better financial reporting**