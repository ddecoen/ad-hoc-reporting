# HC Analysis Export Flow

## User Journey

```mermaid
graph TD
    A[User visits app] --> B[Selects Quarterly Income Statement tab]
    B --> C[Uploads Excel file]
    C --> D[Clicks HC vs Non-HC Summary]
    D --> E[Backend analyzes data]
    E --> F[Frontend displays HC breakdown]
    F --> G[Export HC Analysis button appears]
    G --> H[User clicks Export button]
    H --> I[CSV generated in browser]
    I --> J[File downloads automatically]
    
    style D fill:#38ef7d
    style G fill:#667eea
    style J fill:#f093fb
```

## Technical Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend UI
    participant API as Backend API
    participant JS as JavaScript Export
    
    U->>UI: Upload Excel file
    U->>UI: Click "HC vs Non-HC Summary"
    UI->>API: POST /api/quarterly
    API->>API: Parse Excel, analyze departments
    API-->>UI: Return department data
    UI->>JS: Call displayHCAnalysis(report)
    JS->>JS: Calculate HC vs Non-HC splits
    JS->>JS: Store in window.currentHCAnalysis
    JS->>UI: Show HC breakdown table
    JS->>UI: Show "Export HC Analysis" button
    U->>UI: Click "Export HC Analysis"
    UI->>JS: Call exportHCAnalysisToCSV()
    JS->>JS: Generate CSV from currentHCAnalysis
    JS->>JS: Create Blob with CSV data
    JS->>U: Trigger download
```

## Data Transformation

```mermaid
graph LR
    A[Excel File] --> B[API Parser]
    B --> C[Department Objects]
    C --> D[HC Analysis Logic]
    D --> E[HC/Non-HC Split]
    E --> F[CSV Generator]
    F --> G[Downloaded File]
    
    style A fill:#ffeaa7
    style D fill:#74b9ff
    style G fill:#55efc4
```

## HC Classification Process

```mermaid
flowchart TD
    Start[Line Item from Department] --> Check{Check Account Number}
    Check -->|61000-61999| HC[Add to HC Total]
    Check -->|Other 60000+| NonHC[Include in Total Expenses]
    Check -->|< 60000| Skip[Skip - Not an expense]
    HC --> Calc[Calculate Non-HC = Total - HC]
    NonHC --> Calc
    Calc --> Store[Store in hcAnalysis object]
    Store --> Export[Ready for export]
    
    style HC fill:#ff7675
    style NonHC fill:#fdcb6e
    style Export fill:#00b894
```

## Export Button State Management

```mermaid
stateDiagram-v2
    [*] --> Hidden: Page Load
    Hidden --> Hidden: User uploads file
    Hidden --> Hidden: User analyzes P&L
    Hidden --> Visible: User runs HC Analysis
    Visible --> Active: User hovers
    Active --> Downloading: User clicks
    Downloading --> Visible: Download complete
    Visible --> Hidden: User uploads new file
```

## CSV Structure

```
┌─────────────────────────────────────────────────┐
│ HC vs Non-HC Breakdown                          │ ← Header
├─────────────────────────────────────────────────┤
│ Company, [Company Name]                         │ ← Metadata
│ Period, [Period]                                │
├─────────────────────────────────────────────────┤
│ [Blank Line]                                    │
├─────────────────────────────────────────────────┤
│ Department, HC (61000 series), Non-HC, Total    │ ← Column Headers
├─────────────────────────────────────────────────┤
│ Engineering, $500,000.00, $150,000.00, ...      │ ← Data Rows
│ Sales & Marketing, $300,000.00, $200,000.00, ...|
│ Operations, $200,000.00, $100,000.00, ...       │
├─────────────────────────────────────────────────┤
│ TOTAL, $1,000,000.00, $450,000.00, ...          │ ← Summary Row
└─────────────────────────────────────────────────┘
```

## Key Functions

### displayHCAnalysis()
**Purpose:** Analyze and display HC vs Non-HC breakdown

```
Input: report object with departments
  ↓
Normalize department names
  ↓
For each department:
  - Find total expenses
  - Sum HC (61000 series)
  - Calculate Non-HC
  ↓
Store in window.currentHCAnalysis
  ↓
Display summary cards and table
  ↓
Show export button
```

### exportHCAnalysisToCSV()
**Purpose:** Generate and download CSV file

```
Check: window.currentHCAnalysis exists?
  ↓
Build CSV rows array:
  - Header row
  - Company/Period metadata
  - Column headers
  - Department rows
  - Total row
  ↓
Format as CSV string
  ↓
Create Blob
  ↓
Generate download link
  ↓
Trigger download
  ↓
Clean up resources
```

## Browser Export Mechanism

```mermaid
graph LR
    A[CSV String] --> B[Create Blob]
    B --> C[Create Object URL]
    C --> D[Create anchor element]
    D --> E[Set href and download attributes]
    E --> F[Programmatically click]
    F --> G[Revoke Object URL]
    G --> H[File in Downloads folder]
    
    style A fill:#dfe6e9
    style B fill:#74b9ff
    style C fill:#a29bfe
    style F fill:#fd79a8
    style H fill:#00b894
```

## Error Handling

```mermaid
flowchart TD
    A[Export button clicked] --> B{Data available?}
    B -->|No| C[Alert: Run HC analysis first]
    B -->|Yes| D{Valid data structure?}
    D -->|No| E[Alert: Invalid data]
    D -->|Yes| F[Generate CSV]
    F --> G{Generation successful?}
    G -->|No| H[Console error logged]
    G -->|Yes| I[Download file]
    C --> J[Return to app]
    E --> J
    H --> J
    I --> K[Success]
    
    style C fill:#ff7675
    style E fill:#ff7675
    style H fill:#ff7675
    style K fill:#00b894
```
