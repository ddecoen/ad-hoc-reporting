let currentReport = null;

// Initialize drag and drop
document.addEventListener('DOMContentLoaded', function() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');

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
});

function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        showError('Please select a CSV file');
        return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const uploadZone = document.getElementById('uploadZone');
    
    uploadZone.querySelector('h3').textContent = file.name;
    uploadZone.querySelector('p').textContent = `Size: ${formatFileSize(file.size)}`;
    uploadBtn.disabled = false;
    
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

        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to analyze file');
        }

        const report = await response.json();
        currentReport = report;
        
        // Display results
        displayResults(report);
        
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
    
    // Header
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
    a.download = 'pl-report-' + new Date().toISOString().split('T')[0] + '.csv';
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
