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
	Debug        map[string]interface{}    `json:"debug,omitempty"`
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
		Debug:       make(map[string]interface{}),
	}
	
	// Debug: Store row count
	report.Debug["totalRows"] = len(rows)
	report.Debug["row7"] = ""
	report.Debug["row8"] = ""
	if len(rows) > 6 {
		report.Debug["row7"] = fmt.Sprintf("%v", rows[6])
	}
	if len(rows) > 7 {
		report.Debug["row8"] = fmt.Sprintf("%v", rows[7])
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

	// Get merged cells to find department column ranges
	mergeCells, _ := f.GetMergeCells(sheets[0])
	
	// Find department columns
	departments := []struct {
		name      string
		startCol  int
		endCol    int
		totalCol  int
	}{}

	// Try to use merged cells first
	foundDepts := false
	for _, merge := range mergeCells {
		startCol, startRow, _ := excelize.CellNameToCoordinates(merge.GetStartAxis())
		endCol, endRow, _ := excelize.CellNameToCoordinates(merge.GetEndAxis())
		
		// Check if this merge is in row 7
		if startRow == 7 && endRow == 7 {
			value := strings.TrimSpace(merge.GetCellValue())
			if value != "" && isMainDepartment(value) {
				foundDepts = true
				// The Total column is the rightmost column (convert to 0-indexed)
				totalCol := endCol - 1
				
				departments = append(departments, struct {
					name      string
					startCol  int
					endCol    int
					totalCol  int
				}{
					name:     value,
					startCol: startCol - 1,
					endCol:   endCol - 1,
					totalCol: totalCol,
				})
				
				report.Debug[fmt.Sprintf("merge_%s", value)] = fmt.Sprintf("Cols %d-%d", startCol, endCol)
				report.Debug[fmt.Sprintf("dept_%s_col", value)] = totalCol
			}
		}
	}
	
	// Fallback: scan row 7 if merged cells didn't work
	if !foundDepts {
		headerRow := rows[6]
		for colIdx, cell := range headerRow {
		cell = strings.TrimSpace(cell)
		if cell == "" || colIdx < 2 { // Changed from 3 to 2 to catch earlier columns
			continue
		}

		// Check if this is a main department header
		if isMainDepartment(cell) {
			// Find the "Total" column for this department
			totalCol := -1
			
			// First, find the end of this department (where next dept starts)
			deptEndCol := len(headerRow) - 1
			for j := colIdx + 1; j < len(headerRow); j++ {
				nextCell := strings.TrimSpace(headerRow[j])
				if nextCell != "" && isMainDepartment(nextCell) {
					deptEndCol = j - 1
					break
				}
			}
			
			// Strategy 1: Look in row 8 for "Total" followed by "Amount"
			// We want the RIGHTMOST "Amount" in this department's range
			if len(rows) > 7 {
				lastAmountCol := -1
				for j := colIdx; j <= deptEndCol && j < len(rows[7]); j++ {
					subHeader := strings.ToLower(strings.TrimSpace(rows[7][j]))
					// Look for "Amount" columns
					if subHeader == "amount" {
						lastAmountCol = j
						// Don't break - keep looking for the rightmost one
					}
				}
				if lastAmountCol != -1 {
					totalCol = lastAmountCol
				}
			}
			
			// Strategy 2: Look for "Total" in row 8 if no Amount found
			if totalCol == -1 && len(rows) > 7 {
				for j := deptEndCol; j >= colIdx && j < len(rows[7]); j-- {
					subHeader := strings.ToLower(strings.TrimSpace(rows[7][j]))
					if subHeader == "total" || strings.HasPrefix(subHeader, "total") {
						totalCol = j
						break
					}
				}
			}
			
			// Strategy 3: Look in row 9 for "Total" or "Amount" (some formats have it here)
			if totalCol == -1 && len(rows) > 8 {
				for j := deptEndCol; j >= colIdx && j < len(rows[8]); j-- {
					subHeader := strings.ToLower(strings.TrimSpace(rows[8][j]))
					if subHeader == "total" || 
					   strings.HasPrefix(subHeader, "total") ||
					   subHeader == "amount" {
						totalCol = j
						break
					}
				}
			}
			
			// Strategy 3: Use the last non-empty column in the department range
			if totalCol == -1 {
				// Find the rightmost column with data in this department
				for j := deptEndCol; j >= colIdx; j-- {
					hasData := false
					// Check if this column has numeric data in rows 10-15
					for rowIdx := 9; rowIdx < 15 && rowIdx < len(rows); rowIdx++ {
						if j < len(rows[rowIdx]) {
							val := strings.TrimSpace(rows[rowIdx][j])
							if val != "" && val != "-" {
								hasData = true
								break
							}
						}
					}
					if hasData {
						totalCol = j
						break
					}
				}
			}
			
			// Fallback: use department start column
			if totalCol == -1 {
				totalCol = colIdx
			}

			departments = append(departments, struct {
				name      string
				startCol  int
				endCol    int
			}{
				name:     cell,
				startCol: totalCol,
				endCol:   totalCol,
			})
			
				// Debug: Store column info
				debugKey := fmt.Sprintf("dept_%s_col", cell)
				report.Debug[debugKey] = totalCol
			}
		}
	}
	
	// Debug: Store department count
	report.Debug["departmentCount"] = len(departments)

	// Initialize department data structures
	for _, dept := range departments {
		report.Departments[dept.name] = &DepartmentData{
			Department: dept.name,
			Months:     []MonthData{},
			LineItems:  make(map[string]float64),
		}
	}

	// Parse data rows (starting from row 10+)
	rowsProcessed := 0
	valuesFound := 0
	
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
		
		rowsProcessed++

		// Extract amounts for each department using the Total column
		for _, dept := range departments {
			deptData := report.Departments[dept.name]
			
			// Get value from the Total column (rightmost column of merged range)
			if dept.totalCol < len(row) {
				cellValue := strings.TrimSpace(row[dept.totalCol])
				if cellValue != "" && cellValue != "-" {
					amount := parseAmountQuarterly(cellValue)
					if amount != 0 {
						deptData.LineItems[lineItem] = amount
						deptData.Total += amount
						valuesFound++
						
						// Debug: Store first few values
						if valuesFound <= 3 {
							debugKey := fmt.Sprintf("sample_%d", valuesFound)
							report.Debug[debugKey] = fmt.Sprintf("Row %d, Col %d (%s): %s = %.2f", 
								rowIdx+1, dept.totalCol, dept.name, lineItem, amount)
						}
					}
				}
			}
		}
	}
	
	// Debug: Store processing stats
	report.Debug["rowsProcessed"] = rowsProcessed
	report.Debug["valuesFound"] = valuesFound

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
	
	// Direct matches
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
		if header == dept {
			return true
		}
	}
	
	// Partial matches (more flexible)
	if strings.Contains(header, "general") && strings.Contains(header, "administrative") {
		return true
	}
	if strings.Contains(header, "g&a") {
		return true
	}
	if header == "marketing" {
		return true
	}
	if strings.Contains(header, "research") && strings.Contains(header, "development") {
		return true
	}
	if header == "r&d" {
		return true
	}
	if header == "revenue" || header == "revenues" {
		return true
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
