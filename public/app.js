let currentReport = null;
let reportType = 'transaction'; // Default to transaction detail

// Initialize drag and drop
document.addEventListener('DOMContentLoaded', function() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const hcAnalysisBtn = document.getElementById('hcAnalysisBtn');

    // Report type selector
    document.querySelectorAll('.report-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.report-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            reportType = this.dataset.type;
            
            // Update file acceptance and UI text
            if (reportType === 'quarterly') {
                fileInput.accept = '.xlsx,.xls';
                document.querySelector('#uploadZone p').textContent = 'Supported formats: Excel (.xlsx, .xls)';
            } else {
                fileInput.accept = '.csv,.xlsx,.xls';
                document.querySelector('#uploadZone p').textContent = 'Supported formats: CSV, Excel (.xlsx, .xls)';
            }
            
            // Reset upload if file selected
            if (window.selectedFile) {
                window.selectedFile = null;
                uploadBtn.disabled = true;
                document.querySelector('#uploadZone h3').textContent = 'Drop your file here';
            }
        });
    });

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Upload button
    uploadBtn.addEventListener('click', uploadFile);
    
    // HC Analysis button
    hcAnalysisBtn.addEventListener('click', analyzeHCvsNonHC);
});

function handleFile(file) {
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    // Validate based on report type
    if (reportType === 'quarterly') {
        if (fileExt !== '.xlsx' && fileExt !== '.xls') {
            showError('Quarterly Income Statements must be Excel files (.xlsx, .xls)');
            return;
        }
    } else {
        const validExtensions = ['.csv', '.xlsx', '.xls'];
        if (!validExtensions.includes(fileExt)) {
            showError('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
            return;
        }
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const uploadZone = document.getElementById('uploadZone');
    
    uploadZone.querySelector('h3').textContent = file.name;
    uploadZone.querySelector('p').textContent = `Size: ${formatFileSize(file.size)}`;
    uploadBtn.disabled = false;
    
    // Enable HC Analysis button only for quarterly reports
    if (reportType === 'quarterly') {
        hcAnalysisBtn.disabled = false;
    }
    
    // Store file for upload
    uploadBtn.dataset.file = file.name;
    window.selectedFile = file;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function uploadFile() {
    const file = window.selectedFile;
    if (!file) return;

    const loading = document.getElementById('loading');
    const uploadCard = document.querySelector('.upload-card');
    const errorDiv = document.getElementById('errorMessage');
    const results = document.getElementById('results');

    // Hide previous results
    errorDiv.classList.remove('active');
    results.classList.remove('active');
    
    // Show loading
    uploadCard.style.display = 'none';
    loading.classList.add('active');

    try {
        const formData = new FormData();
        formData.append('file', file);

        // Use appropriate endpoint based on report type
        const endpoint = reportType === 'quarterly' ? '/api/quarterly' : '/api/analyze';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to analyze file');
        }

        const report = await response.json();
        currentReport = report;
        
        // Display results based on report type
        if (reportType === 'quarterly') {
            displayQuarterlyResults(report);
        } else {
            displayResults(report);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to process file: ' + error.message);
        uploadCard.style.display = 'block';
    } finally {
        loading.classList.remove('active');
    }
}

function displayResults(report) {
    const results = document.getElementById('results');
    const summaryCards = document.getElementById('summaryCards');
    const categoriesContainer = document.getElementById('categoriesContainer');

    // Clear previous results
    summaryCards.innerHTML = '';
    categoriesContainer.innerHTML = '';

    // Summary cards
    const summaries = [
        { label: 'Revenue', value: report.revenue, type: 'positive' },
        { label: 'Gross Profit', value: report.grossProfit, type: report.grossProfit >= 0 ? 'positive' : 'negative' },
        { label: 'Gross Margin', value: report.grossMargin, format: 'percent', type: report.grossMargin >= 0 ? 'positive' : 'negative' },
        { label: 'Total OpEx', value: report.totalOpex, type: '' },
        { label: 'EBITDA', value: report.ebitda, type: report.ebitda >= 0 ? 'positive' : 'negative' }
    ];

    summaries.forEach(summary => {
        const card = document.createElement('div');
        card.className = `summary-card ${summary.type}`;
        card.innerHTML = `
            <h3>${summary.label}</h3>
            <div class="amount">${formatCurrency(summary.value, summary.format === 'percent')}</div>
        `;
        summaryCards.appendChild(card);
    });

    // COGS Section
    if (report.cogs) {
        categoriesContainer.appendChild(createCategorySection('COGS', report.cogs));
    }

    // OpEx Sections
    const opexOrder = ['S&M', 'R&D', 'G&A'];
    opexOrder.forEach(catName => {
        if (report.opex[catName]) {
            categoriesContainer.appendChild(createCategorySection(catName, report.opex[catName]));
        }
    });

    results.classList.add('active');
}

function createCategorySection(name, category) {
    const section = document.createElement('div');
    section.className = 'category-section';

    // Category header
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
        <h2>${name}</h2>
        <div style="font-size: 1.3rem; font-weight: bold; color: #667eea;">
            ${formatCurrency(category.total)}
        </div>
    `;
    section.appendChild(header);

    // Category stats
    const stats = document.createElement('div');
    stats.className = 'category-stats';
    stats.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">Total</div>
            <div class="stat-value">${formatCurrency(category.total)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Headcount</div>
            <div class="stat-value">${formatCurrency(category.headcount)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Non-Headcount</div>
            <div class="stat-value">${formatCurrency(category.nonHeadcount)}</div>
        </div>
    `;
    section.appendChild(stats);

    // Subcategories
    if (category.subcategories && Object.keys(category.subcategories).length > 0) {
        const subcatsDiv = document.createElement('div');
        subcatsDiv.className = 'subcategories';

        // Header row
        const headerRow = document.createElement('div');
        headerRow.className = 'subcategory-row';
        headerRow.style.background = '#f0f0f0';
        headerRow.style.fontWeight = 'bold';
        headerRow.innerHTML = `
            <div>Subcategory</div>
            <div class="subcategory-value">Headcount</div>
            <div class="subcategory-value">Non-Headcount</div>
            <div class="subcategory-value">Total</div>
        `;
        subcatsDiv.appendChild(headerRow);

        // Sort subcategories by total descending
        const subcatArray = Object.values(category.subcategories);
        subcatArray.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

        subcatArray.forEach(subcat => {
            const row = document.createElement('div');
            row.className = 'subcategory-row';
            row.innerHTML = `
                <div class="subcategory-name">${subcat.name}</div>
                <div class="subcategory-value">${formatCurrency(subcat.headcount)}</div>
                <div class="subcategory-value">${formatCurrency(subcat.nonHeadcount)}</div>
                <div class="subcategory-value" style="font-weight: bold;">${formatCurrency(subcat.total)}</div>
            `;
            subcatsDiv.appendChild(row);
        });

        section.appendChild(subcatsDiv);
    }

    return section;
}

function formatCurrency(value, isPercent = false) {
    if (isPercent) {
        return value.toFixed(1) + '%';
    }
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000) {
        return sign + '$' + (absValue / 1000000).toFixed(2) + 'M';
    } else if (absValue >= 1000) {
        return sign + '$' + (absValue / 1000).toFixed(1) + 'K';
    } else {
        return sign + '$' + absValue.toFixed(2);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
}

function exportToCSV() {
    if (!currentReport) return;

    const rows = [];
    
    // Check if this is a quarterly report or transaction detail report
    const isQuarterly = reportType === 'quarterly';
    
    if (isQuarterly) {
        // Quarterly Income Statement Export
        rows.push(['Quarterly Income Statement']);
        if (currentReport.companyName) {
            rows.push(['Company', currentReport.companyName]);
        }
        if (currentReport.period) {
            rows.push(['Period', currentReport.period]);
        }
        rows.push([]);
        
        // Export each department
        Object.keys(currentReport.departments).forEach(deptName => {
            const dept = currentReport.departments[deptName];
            
            rows.push([deptName, formatCurrencyExport(dept.total)]);
            rows.push(['Line Item', 'Amount']);
            
            // Sort line items by account number
            const sortedItems = Object.entries(dept.lineItems).sort((a, b) => {
                const getAccountNum = (item) => {
                    const match = item.match(/^(\d+)/);
                    return match ? parseInt(match[1]) : 99999;
                };
                return getAccountNum(a[0]) - getAccountNum(b[0]);
            });
            
            sortedItems.forEach(([lineItem, amount]) => {
                rows.push([lineItem, formatCurrencyExport(amount)]);
            });
            
            rows.push([]);
        });
    } else {
        // Transaction Detail P&L Export
        rows.push(['NetSuite P&L Report']);
        rows.push([]);
        
        // Summary
        rows.push(['Summary']);
        rows.push(['Metric', 'Amount']);
        rows.push(['Revenue', formatCurrencyExport(currentReport.revenue)]);
        rows.push(['COGS', formatCurrencyExport(currentReport.cogs.total)]);
        rows.push(['Gross Profit', formatCurrencyExport(currentReport.grossProfit)]);
        rows.push(['Gross Margin', currentReport.grossMargin.toFixed(2) + '%']);
        rows.push(['Total OpEx', formatCurrencyExport(currentReport.totalOpex)]);
        rows.push(['EBITDA', formatCurrencyExport(currentReport.ebitda)]);
        rows.push([]);

        // COGS Detail
        rows.push(['COGS Breakdown']);
        rows.push(['Category', 'Subcategory', 'Headcount', 'Non-Headcount', 'Total']);
        addCategoryRows(rows, 'COGS', currentReport.cogs);
        rows.push([]);

        // OpEx Detail
        const opexOrder = ['S&M', 'R&D', 'G&A'];
        opexOrder.forEach(catName => {
            if (currentReport.opex[catName]) {
                rows.push([`${catName} Breakdown`]);
                rows.push(['Category', 'Subcategory', 'Headcount', 'Non-Headcount', 'Total']);
                addCategoryRows(rows, catName, currentReport.opex[catName]);
                rows.push([]);
            }
        });
    }

    // Convert to CSV
    const csv = rows.map(row => 
        row.map(cell => {
            const cellStr = String(cell);
            // Escape quotes and wrap in quotes if contains comma or quote
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(',')
    ).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = isQuarterly ? 'quarterly-income-statement-' : 'pl-report-';
    a.download = filename + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function addCategoryRows(rows, categoryName, category) {
    rows.push([
        categoryName,
        'TOTAL',
        formatCurrencyExport(category.headcount),
        formatCurrencyExport(category.nonHeadcount),
        formatCurrencyExport(category.total)
    ]);

    if (category.subcategories) {
        const subcatArray = Object.values(category.subcategories);
        subcatArray.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
        
        subcatArray.forEach(subcat => {
            rows.push([
                '',
                subcat.name,
                formatCurrencyExport(subcat.headcount),
                formatCurrencyExport(subcat.nonHeadcount),
                formatCurrencyExport(subcat.total)
            ]);
        });
    }
}

function formatCurrencyExport(value) {
    return '$' + value.toFixed(2);
}

// Analyze HC vs Non-HC for quarterly income statements
async function analyzeHCvsNonHC() {
    const file = window.selectedFile;
    if (!file || reportType !== 'quarterly') return;

    const loading = document.getElementById('loading');
    const uploadCard = document.querySelector('#uploadCard');
    const errorDiv = document.getElementById('errorMessage');
    const results = document.getElementById('results');

    // Hide previous results
    errorDiv.classList.remove('active');
    results.classList.remove('active');
    
    // Show loading
    uploadCard.style.display = 'none';
    loading.classList.add('active');

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/quarterly', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to analyze file');
        }

        const report = await response.json();
        currentReport = report;
        
        // Display HC vs Non-HC summary
        displayHCAnalysis(report);
        
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to process file: ' + error.message);
        uploadCard.style.display = 'block';
    } finally {
        loading.classList.remove('active');
    }
}

// Display HC vs Non-HC analysis
function displayHCAnalysis(report) {
    const results = document.getElementById('results');
    const summaryCards = document.getElementById('summaryCards');
    const categoriesContainer = document.getElementById('categoriesContainer');

    // Clear previous results
    summaryCards.innerHTML = '';
    categoriesContainer.innerHTML = '';

    // Company info
    if (report.companyName || report.period) {
        summaryCards.innerHTML += `
            <div class="summary-card" style="grid-column: span 2;">
                <h3>HC vs Non-HC Analysis</h3>
                <div style="margin-top: 10px;">
                    ${report.companyName ? `<div><strong>Company:</strong> ${report.companyName}</div>` : ''}
                    ${report.period ? `<div><strong>Period:</strong> ${report.period}</div>` : ''}
                </div>
            </div>
        `;
    }

    // Normalize department names and combine duplicates
    const normalizedDepts = {};
    Object.keys(report.departments).forEach(deptName => {
        // Normalize name: capitalize first letter of each word
        const normalized = deptName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .replace(/&/g, '&'); // Ensure & is consistent
        
        if (!normalizedDepts[normalized]) {
            normalizedDepts[normalized] = {
                department: normalized,
                lineItems: {},
                total: 0
            };
        }
        
        // Merge line items
        const dept = report.departments[deptName];
        Object.entries(dept.lineItems).forEach(([lineItem, amount]) => {
            if (normalizedDepts[normalized].lineItems[lineItem]) {
                normalizedDepts[normalized].lineItems[lineItem] += amount;
            } else {
                normalizedDepts[normalized].lineItems[lineItem] = amount;
            }
        });
    });
    
    // Analyze each department
    const hcAnalysis = {};
    Object.keys(normalizedDepts).forEach(deptName => {
        const dept = normalizedDepts[deptName];
        
        let hcTotal = 0;
        let totalExpenses = 0;
        let foundTotalExpenseLine = false;
        
        // First, try to find the main expense total line
        // Look for lines like "Total - 60000 - Operating expenses" or the largest expense total
        let largestExpenseTotal = 0;
        Object.entries(dept.lineItems).forEach(([lineItem, amount]) => {
            const lineItemLower = lineItem.toLowerCase().trim();
            
            // Look for "Total - 60000" or "Total - Operating expenses"
            if ((lineItemLower.startsWith('total - 6') && lineItemLower.includes('operating')) ||
                (lineItemLower.includes('total') && lineItemLower.includes('60000'))) {
                if (Math.abs(amount) > Math.abs(largestExpenseTotal)) {
                    totalExpenses = amount;
                    largestExpenseTotal = amount;
                    foundTotalExpenseLine = true;
                }
            }
        });
        
        // If we didn't find a Total Expense line, calculate it manually
        if (!foundTotalExpenseLine) {
            Object.entries(dept.lineItems).forEach(([lineItem, amount]) => {
                const lineItemLower = lineItem.toLowerCase().trim();
                
                // Skip revenue, net income, and summary lines
                if (lineItemLower.includes('revenue') || 
                    lineItemLower.includes('net income') || 
                    lineItemLower.includes('net loss') ||
                    lineItemLower.includes('net ordinary') ||
                    lineItemLower.includes('other income') ||
                    lineItemLower.startsWith('total ')) {
                    return;
                }
                
                // Check account number - only include expense accounts (60000+)
                const accountMatch = lineItem.match(/^(\d+)/);
                const accountNum = accountMatch ? parseInt(accountMatch[1]) : 0;
                
                if (accountNum >= 60000 && accountNum < 70000) {
                    totalExpenses += amount;
                }
            });
        }
        
        // Calculate HC (61000 series)
        Object.entries(dept.lineItems).forEach(([lineItem, amount]) => {
            const accountMatch = lineItem.match(/^(\d+)/);
            const accountNum = accountMatch ? parseInt(accountMatch[1]) : 0;
            
            // 61000-61999 are HC (compensation)
            if (accountNum >= 61000 && accountNum < 62000) {
                hcTotal += amount;
            }
        });
        
        // Non-HC = Total Expenses - HC
        const nonHcTotal = totalExpenses - hcTotal;
        
        hcAnalysis[deptName] = {
            hc: hcTotal,
            nonHc: nonHcTotal,
            total: totalExpenses
        };
    });

    // Create summary cards for each department
    Object.keys(hcAnalysis).forEach(deptName => {
        const analysis = hcAnalysis[deptName];
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <h3>${deptName}</h3>
            <div class="amount">${formatCurrency(analysis.total)}</div>
            <div style="margin-top: 10px; font-size: 0.85rem; opacity: 0.9;">
                HC: ${formatCurrency(analysis.hc)}<br>
                Non-HC: ${formatCurrency(analysis.nonHc)}
            </div>
        `;
        summaryCards.appendChild(card);
    });

    // Create detailed breakdown table
    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
        <h2>HC vs Non-HC Breakdown</h2>
    `;
    section.appendChild(header);

    const table = document.createElement('div');
    table.className = 'subcategories';

    // Header row
    const headerRow = document.createElement('div');
    headerRow.className = 'subcategory-row';
    headerRow.style.background = '#f0f0f0';
    headerRow.style.fontWeight = 'bold';
    headerRow.innerHTML = `
        <div>Department</div>
        <div class="subcategory-value">HC (61000 series)</div>
        <div class="subcategory-value">Non-HC</div>
        <div class="subcategory-value">Total</div>
    `;
    table.appendChild(headerRow);

    // Add rows for each department
    Object.keys(hcAnalysis).forEach(deptName => {
        const analysis = hcAnalysis[deptName];
        const row = document.createElement('div');
        row.className = 'subcategory-row';
        row.innerHTML = `
            <div class="subcategory-name">${deptName}</div>
            <div class="subcategory-value">${formatCurrency(analysis.hc)}</div>
            <div class="subcategory-value">${formatCurrency(analysis.nonHc)}</div>
            <div class="subcategory-value" style="font-weight: bold;">${formatCurrency(analysis.total)}</div>
        `;
        table.appendChild(row);
    });

    // Add total row
    const totalHC = Object.values(hcAnalysis).reduce((sum, a) => sum + a.hc, 0);
    const totalNonHC = Object.values(hcAnalysis).reduce((sum, a) => sum + a.nonHc, 0);
    const totalAll = totalHC + totalNonHC;

    const totalRow = document.createElement('div');
    totalRow.className = 'subcategory-row';
    totalRow.style.background = '#f0f0f0';
    totalRow.style.fontWeight = 'bold';
    totalRow.innerHTML = `
        <div>TOTAL</div>
        <div class="subcategory-value">${formatCurrency(totalHC)}</div>
        <div class="subcategory-value">${formatCurrency(totalNonHC)}</div>
        <div class="subcategory-value">${formatCurrency(totalAll)}</div>
    `;
    table.appendChild(totalRow);

    section.appendChild(table);
    categoriesContainer.appendChild(section);

    results.classList.add('active');
    
    // Store HC analysis for CSV export
    window.currentHCAnalysis = hcAnalysis;
    
    // Show HC export button, hide main export button
    const exportMainBtn = document.getElementById('exportMainBtn');
    const exportHCBtn = document.getElementById('exportHCBtn');
    const reportTitle = document.getElementById('reportTitle');
    
    if (exportMainBtn) exportMainBtn.style.display = 'none';
    if (exportHCBtn) exportHCBtn.style.display = 'inline-block';
    if (reportTitle) reportTitle.textContent = 'HC vs Non-HC Analysis';
}

// Display quarterly income statement results
function displayQuarterlyResults(report) {
    const results = document.getElementById('results');
    const summaryCards = document.getElementById('summaryCards');
    const categoriesContainer = document.getElementById('categoriesContainer');

    // Clear previous results
    summaryCards.innerHTML = '';
    categoriesContainer.innerHTML = '';

    // Summary cards - show department totals
    const summaryHtml = [];
    
    // Company info card
    if (report.companyName || report.period) {
        summaryCards.innerHTML += `
            <div class="summary-card" style="grid-column: span 2;">
                <h3>Report Details</h3>
                <div style="margin-top: 10px;">
                    ${report.companyName ? `<div><strong>Company:</strong> ${report.companyName}</div>` : ''}
                    ${report.period ? `<div><strong>Period:</strong> ${report.period}</div>` : ''}
                </div>
            </div>
        `;
    }

    // Department summary cards
    Object.keys(report.departments).forEach(deptName => {
        const dept = report.departments[deptName];
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <h3>${deptName}</h3>
            <div class="amount">${formatCurrency(dept.total)}</div>
        `;
        summaryCards.appendChild(card);
    });

    // Detailed breakdown by department
    Object.keys(report.departments).forEach(deptName => {
        const dept = report.departments[deptName];
        const section = document.createElement('div');
        section.className = 'category-section';

        // Department header
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `
            <h2>${deptName}</h2>
            <div style="font-size: 1.3rem; font-weight: bold; color: #667eea;">
                ${formatCurrency(dept.total)}
            </div>
        `;
        section.appendChild(header);

        // Line items table
        if (dept.lineItems && Object.keys(dept.lineItems).length > 0) {
            const table = document.createElement('div');
            table.className = 'subcategories';

            // Header row
            const headerRow = document.createElement('div');
            headerRow.className = 'subcategory-row';
            headerRow.style.background = '#f0f0f0';
            headerRow.style.fontWeight = 'bold';
            headerRow.innerHTML = `
                <div style="grid-column: span 3;">Line Item</div>
                <div class="subcategory-value">Amount</div>
            `;
            table.appendChild(headerRow);

            // Sort line items by account number (ascending)
            const sortedItems = Object.entries(dept.lineItems).sort((a, b) => {
                // Extract account numbers from line items (e.g., "40000" from "40000 - Revenue")
                const getAccountNum = (item) => {
                    const match = item.match(/^(\d+)/);
                    return match ? parseInt(match[1]) : 99999;
                };
                return getAccountNum(a[0]) - getAccountNum(b[0]);
            });

            // Add line item rows
            sortedItems.forEach(([lineItem, amount]) => {
                if (amount !== 0) {
                    const row = document.createElement('div');
                    row.className = 'subcategory-row';
                    row.innerHTML = `
                        <div class="subcategory-name" style="grid-column: span 3;">${lineItem}</div>
                        <div class="subcategory-value" style="font-weight: bold;">${formatCurrency(amount)}</div>
                    `;
                    table.appendChild(row);
                }
            });

            section.appendChild(table);
        }

        categoriesContainer.appendChild(section);


// Export HC vs Non-HC analysis to CSV
window.exportHCAnalysisToCSV = function() {
    console.log('Export HC Analysis clicked');
    console.log('currentHCAnalysis:', window.currentHCAnalysis);
    
    if (!window.currentHCAnalysis) {
        alert('No HC analysis data available. Please run HC vs Non-HC Summary first.');
        return;
    }
    
    console.log('Starting CSV export...');
    
    const rows = [];
    
    // Header
    rows.push(['HC vs Non-HC Breakdown']);
    if (currentReport.companyName) {
        rows.push(['Company', currentReport.companyName]);
    }
    if (currentReport.period) {
        rows.push(['Period', currentReport.period]);
    }
    rows.push([]);
    
    // Summary table
    rows.push(['Department', 'HC (61000 series)', 'Non-HC', 'Total']);
    
    Object.keys(window.currentHCAnalysis).forEach(deptName => {
        const analysis = window.currentHCAnalysis[deptName];
        rows.push([
            deptName,
            formatCurrencyExport(analysis.hc),
            formatCurrencyExport(analysis.nonHc),
            formatCurrencyExport(analysis.total)
        ]);
    });
    
    // Total row
    const totalHC = Object.values(window.currentHCAnalysis).reduce((sum, a) => sum + a.hc, 0);
    const totalNonHC = Object.values(window.currentHCAnalysis).reduce((sum, a) => sum + a.nonHc, 0);
    const totalAll = totalHC + totalNonHC;
    
    rows.push([
        'TOTAL',
        formatCurrencyExport(totalHC),
        formatCurrencyExport(totalNonHC),
        formatCurrencyExport(totalAll)
    ]);
    
    // Convert to CSV
    const csv = rows.map(row => 
        row.map(cell => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(',')
    ).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hc-vs-nonhc-breakdown-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}
    });

    results.classList.add('active');
}
