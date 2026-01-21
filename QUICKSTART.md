# Quick Start Guide 🚀

Get your NetSuite P&L Analyzer running in under 5 minutes!

## Prerequisites

- GitHub account
- Vercel account (free tier works great!)
- NetSuite Transaction Detail CSV export

## Step 1: Get the Code

### Option A: Fork this Repository (Easiest)
1. Click the "Fork" button at the top of this repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/netsuite-pl-analyzer.git
   cd netsuite-pl-analyzer
   ```

### Option B: Start Fresh
1. Create a new directory and initialize:
   ```bash
   mkdir netsuite-pl-analyzer
   cd netsuite-pl-analyzer
   git init
   ```
2. Copy all files from this repository

## Step 2: Deploy to Vercel

### Via GitHub (Recommended - 2 minutes)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/netsuite-pl-analyzer.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com/signup)
   - Sign in with GitHub
   - Click "New Project"
   - Select your repository
   - Click "Deploy" (no configuration needed!)

3. **Done!** 🎉
   - Your app is live at `https://your-project.vercel.app`
   - Copy the URL and share with your team

### Via Vercel CLI (Alternative - 3 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Step 3: Export Data from NetSuite

1. In NetSuite, go to: **Reports → Saved Searches → All Saved Searches**

2. Create a new Transaction Detail search with these columns:
   - ✅ Date
   - ✅ Type
   - ✅ Document Number
   - ✅ Name
   - ✅ Account
   - ✅ Department
   - ✅ Class
   - ✅ Amount
   - ✅ Memo

3. Apply filters for your desired time period (e.g., "This Year")

4. Run the search and click **Export → CSV**

## Step 4: Analyze Your Data

1. Open your deployed app URL
2. Drag and drop your CSV file
3. Click "Analyze P&L"
4. View your results!

## What You'll See

### Summary Dashboard
- 💰 Revenue
- 📊 Gross Profit & Margin
- 💼 Total OpEx
- 💵 EBITDA

### Detailed Breakdowns

**COGS**
- Headcount vs. Non-Headcount
- Subcategories: Support, Services, Infrastructure

**Sales & Marketing**
- SDRs, AEs, Marketing, Customer Support
- Headcount vs. Marketing Spend

**R&D**
- Engineering, Product
- Salaries vs. Tools & Infrastructure

**G&A**
- Finance, Legal, HR, Facilities
- Personnel vs. Operating Costs

## Testing with Sample Data

Try the included `sample-data.csv`:

```bash
# The repository includes sample data you can use immediately
# Just upload sample-data.csv to see how it works!
```

Expected results:
- Revenue: $150,000
- COGS: ~$37,000 (mostly headcount)
- OpEx: ~$91,000
- EBITDA: ~$22,000

## Common Issues & Solutions

### ❌ "Failed to parse CSV"

**Solution**: Ensure your CSV has a header row and includes these columns:
- Account (required)
- Amount (required)
- Department (recommended)
- Class (recommended)

### ❌ "Wrong category assignments"

**Solution**: Edit `api/analyze.go` and customize keywords:
```go
// Find the relevant function and add your keywords
smKeywords := []string{
    "sales", "marketing", 
    "your-custom-keyword",  // Add here
}
```

### ❌ "Build failed on Vercel"

**Solution**: 
1. Check `go.mod` exists
2. Ensure Go version is 1.21+
3. Review build logs in Vercel dashboard

## Customization Tips

### 1. Adjust Headcount Keywords

Edit `api/analyze.go`, function `isHeadcountCost()`:
```go
headcountKeywords := []string{
    "salary", "payroll", "wages",
    "your-keyword",  // Add custom keywords
}
```

### 2. Add New Categories

Edit `api/analyze.go`, function `determineOpExCategory()`:
```go
// Add your custom category
if strings.Contains(text, "customer-success") {
    return "CS"  // New category
}
```

### 3. Change UI Colors

Edit `public/index.html`, modify the CSS:
```css
body {
    background: linear-gradient(135deg, #YOUR_COLOR_1, #YOUR_COLOR_2);
}
```

## Pro Tips

### 💡 Export Reports
Click "Export CSV" to save results for further analysis in Excel or Google Sheets

### 💡 Regular Updates
Set up weekly/monthly exports from NetSuite and track trends over time

### 💡 Share with Team
The app is stateless - no login required! Just share the URL

### 💡 Customize for Your Business
The code is fully open source - modify the categorization logic to match your chart of accounts

## Next Steps

1. **Test with Real Data** - Upload your actual NetSuite export
2. **Customize Categories** - Adjust keywords to match your account structure
3. **Share with Finance Team** - Get feedback on accuracy
4. **Automate** - Set up regular exports from NetSuite
5. **Enhance** - Add features you need (date filters, comparisons, etc.)

## Need Help?

- 📖 Read the full [README.md](README.md)
- 🚀 Check [DEPLOYMENT.md](DEPLOYMENT.md) for advanced setup
- 🐛 Found a bug? Open an issue on GitHub
- 💬 Have questions? Check existing issues or create a new one

## Success Checklist

- [ ] Repository forked/cloned
- [ ] Pushed to GitHub
- [ ] Deployed on Vercel
- [ ] Tested with sample-data.csv
- [ ] Exported real data from NetSuite
- [ ] Analyzed first P&L report
- [ ] Shared with team
- [ ] Customized categories (optional)

---

**⏱️ Total Time: 5 minutes**

**🎯 Ready to Go: Deploy with one command:**
```bash
vercel
```

That's it! You now have a production-ready NetSuite P&L analyzer. 🎉
