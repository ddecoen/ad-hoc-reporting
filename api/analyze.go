package handler

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

// Transaction represents a NetSuite transaction detail record
type Transaction struct {
	Date        string
	Type        string
	DocNumber   string
	Name        string
	Account     string
	Department  string
	Class       string
	Amount      float64
	Memo        string
}

// PLCategory represents a P&L category with subcategories
type PLCategory struct {
	Name          string                 `json:"name"`
	Total         float64                `json:"total"`
	Headcount     float64                `json:"headcount"`
	NonHeadcount  float64                `json:"nonHeadcount"`
	Subcategories map[string]*PLSubcategory `json:"subcategories"`
}

// PLSubcategory represents a subcategory breakdown
type PLSubcategory struct {
	Name         string  `json:"name"`
	Headcount    float64 `json:"headcount"`
	NonHeadcount float64 `json:"nonHeadcount"`
	Total        float64 `json:"total"`
}

// PLReport represents the complete P&L report
type PLReport struct {
	Revenue    float64                `json:"revenue"`
	COGS       *PLCategory            `json:"cogs"`
	GrossProfit float64               `json:"grossProfit"`
	GrossMargin float64               `json:"grossMargin"`
	OpEx       map[string]*PLCategory `json:"opex"`
	TotalOpEx  float64                `json:"totalOpex"`
	EBITDA     float64                `json:"ebitda"`
}

// Handler processes the NetSuite CSV and returns P&L JSON
func Handler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		http.Error(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Determine file type and parse accordingly
	var transactions []Transaction
	ext := strings.ToLower(filepath.Ext(header.Filename))
	
	if ext == ".xlsx" || ext == ".xls" {
		// Parse Excel
		transactions, err = parseExcel(file)
		if err != nil {
			http.Error(w, "Failed to parse Excel: "+err.Error(), http.StatusBadRequest)
			return
		}
	} else if ext == ".csv" {
		// Parse CSV
		transactions, err = parseCSV(file)
		if err != nil {
			http.Error(w, "Failed to parse CSV: "+err.Error(), http.StatusBadRequest)
			return
		}
	} else {
		http.Error(w, "Unsupported file type. Please upload a CSV or Excel file.", http.StatusBadRequest)
		return
	}

	// Generate P&L report
	report := generatePLReport(transactions)

	// Return JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

// parseCSV reads the NetSuite CSV and returns transactions
func parseCSV(r io.Reader) ([]Transaction, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true

	// Read header
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	// Find column indices
	colIndex := make(map[string]int)
	for i, col := range header {
		colIndex[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// Read all records
	var transactions []Transaction
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to read record: %w", err)
		}

		// Parse amount
		amountStr := getField(record, colIndex, "amount", "debit", "credit")
		amount, _ := parseAmount(amountStr)

		trans := Transaction{
			Date:       getField(record, colIndex, "date", "transaction date"),
			Type:       getField(record, colIndex, "type", "transaction type"),
			DocNumber:  getField(record, colIndex, "document number", "doc number", "number"),
			Name:       getField(record, colIndex, "name", "vendor", "employee", "customer"),
			Account:    getField(record, colIndex, "account", "account name"),
			Department: getField(record, colIndex, "department", "dept"),
			Class:      getField(record, colIndex, "class", "classification"),
			Amount:     amount,
			Memo:       getField(record, colIndex, "memo", "description"),
		}

		transactions = append(transactions, trans)
	}

	return transactions, nil
}

// parseExcel reads an Excel file and returns transactions
func parseExcel(r io.Reader) ([]Transaction, error) {
	// Read the entire file into memory
	buf := new(bytes.Buffer)
	_, err := io.Copy(buf, r)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Open Excel file
	f, err := excelize.OpenReader(buf)
	if err != nil {
		return nil, fmt.Errorf("failed to open Excel file: %w", err)
	}
	defer f.Close()

	// Get the first sheet
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("no sheets found in Excel file")
	}

	// Read all rows from the first sheet
	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("failed to read rows: %w", err)
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("no data found in Excel file")
	}

	// Find column indices from header
	header := rows[0]
	colIndex := make(map[string]int)
	for i, col := range header {
		colIndex[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// Parse data rows
	var transactions []Transaction
	for i := 1; i < len(rows); i++ {
		record := rows[i]
		if len(record) == 0 {
			continue
		}

		// Parse amount
		amountStr := getField(record, colIndex, "amount", "debit", "credit")
		amount, _ := parseAmount(amountStr)

		trans := Transaction{
			Date:       getField(record, colIndex, "date", "transaction date"),
			Type:       getField(record, colIndex, "type", "transaction type"),
			DocNumber:  getField(record, colIndex, "document number", "doc number", "number"),
			Name:       getField(record, colIndex, "name", "vendor", "employee", "customer"),
			Account:    getField(record, colIndex, "account", "account name"),
			Department: getField(record, colIndex, "department", "dept"),
			Class:      getField(record, colIndex, "class", "classification"),
			Amount:     amount,
			Memo:       getField(record, colIndex, "memo", "description"),
		}

		transactions = append(transactions, trans)
	}

	return transactions, nil
}

// getField tries multiple possible column names
func getField(record []string, colIndex map[string]int, names ...string) string {
	for _, name := range names {
		if idx, ok := colIndex[strings.ToLower(name)]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
	}
	return ""
}

// parseAmount converts a string to float, handling various formats
func parseAmount(s string) (float64, error) {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, "(", "-")
	s = strings.ReplaceAll(s, ")", "")
	
	if s == "" {
		return 0, nil
	}
	
	return strconv.ParseFloat(s, 64)
}

// generatePLReport creates the P&L report from transactions
func generatePLReport(transactions []Transaction) *PLReport {
	report := &PLReport{
		COGS: &PLCategory{
			Name:          "COGS",
			Subcategories: make(map[string]*PLSubcategory),
		},
		OpEx: make(map[string]*PLCategory),
	}

	// Initialize OpEx categories
	categories := []string{"G&A", "R&D", "S&M"}
	for _, cat := range categories {
		report.OpEx[cat] = &PLCategory{
			Name:          cat,
			Subcategories: make(map[string]*PLSubcategory),
		}
	}

	// Process transactions
	for _, trans := range transactions {
		accountLower := strings.ToLower(trans.Account)
		deptLower := strings.ToLower(trans.Department)
		classLower := strings.ToLower(trans.Class)
		memoLower := strings.ToLower(trans.Memo)

		// Determine if this is headcount
		isHeadcount := isHeadcountCost(accountLower, memoLower)

		// Categorize transaction
		if isRevenue(accountLower) {
			report.Revenue += trans.Amount
		} else if isCOGS(accountLower, deptLower) {
			subcat := determineCOGSSubcategory(deptLower, classLower, accountLower)
			addToCategory(report.COGS, subcat, trans.Amount, isHeadcount)
		} else if category := determineOpExCategory(accountLower, deptLower, classLower); category != "" {
			if cat, ok := report.OpEx[category]; ok {
				subcat := determineSubcategory(category, deptLower, classLower, accountLower)
				addToCategory(cat, subcat, trans.Amount, isHeadcount)
			}
		}
	}

	// Calculate totals
	calculateCategoryTotals(report.COGS)
	for _, cat := range report.OpEx {
		calculateCategoryTotals(cat)
		report.TotalOpEx += cat.Total
	}

	report.GrossProfit = report.Revenue - report.COGS.Total
	if report.Revenue != 0 {
		report.GrossMargin = (report.GrossProfit / report.Revenue) * 100
	}
	report.EBITDA = report.GrossProfit - report.TotalOpEx

	return report
}

// isRevenue checks if account is revenue
func isRevenue(account string) bool {
	revenueKeywords := []string{"revenue", "sales", "income"}
	for _, kw := range revenueKeywords {
		if strings.Contains(account, kw) && !strings.Contains(account, "deferred") {
			return true
		}
	}
	return false
}

// isCOGS checks if transaction is COGS
func isCOGS(account, dept string) bool {
	cogsKeywords := []string{"cogs", "cost of goods", "cost of sales", "cost of revenue"}
	text := account + " " + dept
	for _, kw := range cogsKeywords {
		if strings.Contains(text, kw) {
			return true
		}
	}
	return false
}

// determineOpExCategory determines which OpEx bucket
func determineOpExCategory(account, dept, class string) string {
	text := strings.ToLower(account + " " + dept + " " + class)

	// S&M patterns
	smKeywords := []string{"sales", "marketing", "sales & marketing", "s&m", "customer success", 
		"customer support", "sdr", "ae", "account executive"}
	for _, kw := range smKeywords {
		if strings.Contains(text, kw) {
			return "S&M"
		}
	}

	// R&D patterns
	rdKeywords := []string{"r&d", "research", "development", "engineering", "product"}
	for _, kw := range rdKeywords {
		if strings.Contains(text, kw) {
			return "R&D"
		}
	}

	// G&A patterns (catch-all for administrative)
	gaKeywords := []string{"g&a", "general", "administrative", "finance", "accounting", 
		"legal", "hr", "human resources", "facilities"}
	for _, kw := range gaKeywords {
		if strings.Contains(text, kw) {
			return "G&A"
		}
	}

	// Default to G&A for expense accounts
	if strings.Contains(account, "expense") || strings.Contains(account, "payroll") {
		return "G&A"
	}

	return ""
}

// determineCOGSSubcategory determines COGS subcategory
func determineCOGSSubcategory(dept, class, account string) string {
	text := strings.ToLower(dept + " " + class + " " + account)

	if strings.Contains(text, "support") || strings.Contains(text, "customer success") {
		return "Customer Support"
	}
	if strings.Contains(text, "services") || strings.Contains(text, "professional services") {
		return "Professional Services"
	}
	if strings.Contains(text, "hosting") || strings.Contains(text, "infrastructure") {
		return "Infrastructure"
	}

	return "Other COGS"
}

// determineSubcategory determines subcategory for OpEx
func determineSubcategory(category, dept, class, account string) string {
	text := strings.ToLower(dept + " " + class + " " + account)

	if category == "S&M" {
		if strings.Contains(text, "sdr") {
			return "SDRs"
		}
		if strings.Contains(text, "ae") || strings.Contains(text, "account executive") {
			return "AEs"
		}
		if strings.Contains(text, "marketing") {
			return "Marketing"
		}
		if strings.Contains(text, "customer success") || strings.Contains(text, "support") {
			return "Customer Support"
		}
		return "Other S&M"
	}

	if category == "R&D" {
		if strings.Contains(text, "engineering") {
			return "Engineering"
		}
		if strings.Contains(text, "product") {
			return "Product"
		}
		return "Other R&D"
	}

	if category == "G&A" {
		if strings.Contains(text, "finance") || strings.Contains(text, "accounting") {
			return "Finance & Accounting"
		}
		if strings.Contains(text, "legal") {
			return "Legal"
		}
		if strings.Contains(text, "hr") || strings.Contains(text, "human resources") {
			return "HR"
		}
		if strings.Contains(text, "facilities") {
			return "Facilities"
		}
		return "Other G&A"
	}

	return "Other"
}

// isHeadcountCost determines if expense is headcount-related
func isHeadcountCost(account, memo string) bool {
	headcountKeywords := []string{
		"salary", "salaries", "wages", "payroll", "compensation",
		"benefits", "bonus", "commission", "stock", "equity",
		"401k", "insurance", "health", "dental", "vision",
		"pto", "vacation", "severance", "recruiting", "recruitment",
	}

	text := account + " " + memo
	for _, kw := range headcountKeywords {
		if strings.Contains(text, kw) {
			return true
		}
	}
	return false
}

// addToCategory adds amount to category and subcategory
func addToCategory(cat *PLCategory, subcatName string, amount float64, isHeadcount bool) {
	if isHeadcount {
		cat.Headcount += amount
	} else {
		cat.NonHeadcount += amount
	}

	// Add to subcategory
	if cat.Subcategories[subcatName] == nil {
		cat.Subcategories[subcatName] = &PLSubcategory{Name: subcatName}
	}

	subcat := cat.Subcategories[subcatName]
	if isHeadcount {
		subcat.Headcount += amount
	} else {
		subcat.NonHeadcount += amount
	}
}

// calculateCategoryTotals calculates totals for category and subcategories
func calculateCategoryTotals(cat *PLCategory) {
	cat.Total = cat.Headcount + cat.NonHeadcount

	for _, subcat := range cat.Subcategories {
		subcat.Total = subcat.Headcount + subcat.NonHeadcount
	}
}
