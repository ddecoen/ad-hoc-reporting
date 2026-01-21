package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

// DepartmentData represents financial data for a department
type DepartmentData struct {
	Department string             `json:"department"`
	Months     []MonthData        `json:"months"`
	LineItems  map[string]float64 `json:"lineItems"`
	Total      float64            `json:"total"`
}

// MonthData represents data for a specific month
type MonthData struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

// QuarterlyReport represents the complete quarterly income statement
type QuarterlyReport struct {
	CompanyName  string                    `json:"companyName"`
	Period       string                    `json:"period"`
	Departments  map[string]*DepartmentData `json:"departments"`
	RevenueTotal float64                   `json:"revenueTotal"`
	Summary      map[string]float64        `json:"summary"`
}

// QuarterlyHandler processes quarterly income statement Excel files
func QuarterlyHandler(w http.ResponseWriter, r *http.Request) {
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

	// Only accept Excel files for quarterly reports
	ext := strings.ToLower(header.Filename[strings.LastIndex(header.Filename, "."):])
	if ext != ".xlsx" && ext != ".xls" {
		http.Error(w, "Quarterly income statements must be in Excel format (.xlsx or .xls)", http.StatusBadRequest)
		return
	}

	// Parse quarterly income statement
	report, err := parseQuarterlyIncomeStatement(file)
	if err != nil {
		http.Error(w, "Failed to parse quarterly income statement: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Return JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

// parseQuarterlyIncomeStatement reads the Excel file and extracts department hierarchy
func parseQuarterlyIncomeStatement(r io.Reader) (*QuarterlyReport, error) {
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

	if len(rows) < 8 {
		return nil, fmt.Errorf("file does not have enough rows (expected at least 8 rows)")
	}

	// Extract company name and period
	report := &QuarterlyReport{
		Departments: make(map[string]*DepartmentData),
		Summary:     make(map[string]float64),
	}

	// Find company name (usually in rows 1-3)
	for i := 0; i < 3 && i < len(rows); i++ {
		for _, cell := range rows[i] {
			if strings.Contains(cell, "Inc") || strings.Contains(cell, "LLC") || strings.Contains(cell, "Corp") {
				report.CompanyName = strings.TrimSpace(cell)
				break
			}
		}
	}

	// Find period (row 4)
	if len(rows) > 3 {
		for _, cell := range rows[3] {
			if strings.Contains(cell, "Q") || strings.Contains(cell, "2025") || strings.Contains(cell, "2024") {
				report.Period = strings.TrimSpace(cell)
				break
			}
		}
	}

	// Row 7 (index 6) contains department headers
	if len(rows) <= 6 {
		return nil, fmt.Errorf("row 7 (department headers) not found")
	}

	headerRow := rows[6]
	
	// Find department columns (skip first few columns which are account info)
	departments := []struct {
		name      string
		startCol  int
		endCol    int
	}{}

	// Scan row 7 for department names and find their "Total" column
	for colIdx, cell := range headerRow {
		cell = strings.TrimSpace(cell)
		if cell == "" || colIdx < 3 {
			continue
		}

		// Check if this is a main department header
		if isMainDepartment(cell) {
			// Find the "Total" column for this department
			// Look in row 8 (subdepartment row) for "Total" or "Amount" keywords
			totalCol := -1
			
			// Search forward from this column to find the Total column
			searchLimit := colIdx + 20 // Look ahead up to 20 columns
			if searchLimit > len(headerRow) {
				searchLimit = len(headerRow)
			}
			
			for j := colIdx; j < searchLimit; j++ {
				// Check row 8 (index 7) for "Total" or "Amount"
				if len(rows) > 7 && j < len(rows[7]) {
					subHeader := strings.ToLower(strings.TrimSpace(rows[7][j]))
					if strings.Contains(subHeader, "total") || 
					   (strings.Contains(subHeader, "amount") && !strings.Contains(subHeader, "and")) {
						totalCol = j
						break
					}
				}
				
				// Also check if the next main department starts (to limit search)
				if j > colIdx && j < len(headerRow) {
					nextCell := strings.TrimSpace(headerRow[j])
					if nextCell != "" && isMainDepartment(nextCell) {
						break
					}
				}
			}
			
			// If we didn't find a "Total" column, use the last column in the department range
			if totalCol == -1 {
				totalCol = colIdx
				for j := colIdx + 1; j < len(headerRow); j++ {
					nextCell := strings.TrimSpace(headerRow[j])
					if nextCell != "" && isMainDepartment(nextCell) {
						break
					}
					totalCol = j
				}
			}

			departments = append(departments, struct {
				name      string
				startCol  int
				endCol    int
			}{
				name:     cell,
				startCol: totalCol, // Use Total column as both start and end
				endCol:   totalCol,
			})
		}
	}

	// Initialize department data structures
	for _, dept := range departments {
		report.Departments[dept.name] = &DepartmentData{
			Department: dept.name,
			Months:     []MonthData{},
			LineItems:  make(map[string]float64),
		}
	}

	// Parse data rows (starting from row 10+)
	for rowIdx := 9; rowIdx < len(rows); rowIdx++ {
		row := rows[rowIdx]
		if len(row) == 0 {
			continue
		}

		// Get the account name/line item (usually in column A or B)
		var lineItem string
		if len(row) > 0 {
			lineItem = strings.TrimSpace(row[0])
		}
		if lineItem == "" && len(row) > 1 {
			lineItem = strings.TrimSpace(row[1])
		}

		// Skip empty line items or headers
		if lineItem == "" || strings.Contains(lineItem, "Financial") {
			continue
		}

		// Extract amounts for each department
		for _, dept := range departments {
			deptData := report.Departments[dept.name]
			
			// Sum all amounts in this department's column range
			var total float64
			for colIdx := dept.startCol; colIdx <= dept.endCol && colIdx < len(row); colIdx++ {
				cellValue := strings.TrimSpace(row[colIdx])
				if cellValue != "" {
					amount := parseAmountQuarterly(cellValue)
					total += amount
				}
			}

			if total != 0 {
				deptData.LineItems[lineItem] = total
				deptData.Total += total
			}
		}
	}

	// Calculate summary metrics
	for deptName, deptData := range report.Departments {
		report.Summary[deptName] = deptData.Total
		if strings.Contains(strings.ToLower(deptName), "revenue") {
			report.RevenueTotal += deptData.Total
		}
	}

	return report, nil
}

// isMainDepartment checks if a header is a main department
func isMainDepartment(header string) bool {
	header = strings.ToLower(strings.TrimSpace(header))
	
	mainDepts := []string{
		"general and administrative",
		"general & administrative",
		"g&a",
		"marketing",
		"research & development",
		"research and development",
		"r&d",
		"revenue",
		"sales",
		"cost of revenue",
		"cogs",
	}

	for _, dept := range mainDepts {
		if strings.Contains(header, dept) {
			return true
		}
	}

	return false
}

// parseAmountQuarterly converts a string to float64, handling currency and formatting
func parseAmountQuarterly(s string) float64 {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "$", "")
	
	// Handle parentheses as negative
	isNegative := false
	if strings.HasPrefix(s, "(") && strings.HasSuffix(s, ")") {
		isNegative = true
		s = strings.Trim(s, "()")
	}
	
	if s == "" || s == "-" {
		return 0
	}
	
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	
	if isNegative {
		return -val
	}
	return val
}
