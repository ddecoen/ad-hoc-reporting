# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Frontend (public/index.html)                 │   │
│  │  • Drag-and-drop file upload                             │   │
│  │  • Interactive P&L visualization                         │   │
│  │  • CSV export functionality                              │   │
│  └──────────────┬───────────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────────┘
                  │ HTTP POST (multipart/form-data)
                  │ CSV File Upload
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                          │
│  • Global CDN                                                   │
│  • Automatic HTTPS                                              │
│  • DDoS Protection                                              │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Vercel Serverless Function (Go)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              api/analyze.go Handler                       │   │
│  │                                                           │   │
│  │  1. Receive CSV file                                     │   │
│  │  2. Parse CSV → Transaction structs                      │   │
│  │  3. Categorize transactions:                             │   │
│  │     • Revenue detection                                  │   │
│  │     • COGS classification                                │   │
│  │     • OpEx categorization (S&M, R&D, G&A)               │   │
│  │     • Headcount vs non-headcount split                  │   │
│  │  4. Calculate P&L metrics                                │   │
│  │  5. Return JSON response                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────────┘
                  │ JSON Response
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     User's Browser                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          JavaScript (public/app.js)                       │   │
│  │  • Parse JSON response                                   │   │
│  │  • Render summary cards                                  │   │
│  │  • Display category breakdowns                           │   │
│  │  • Enable CSV export                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
NetSuite → CSV Export → User Upload → Parse → Categorize → Calculate → Display
```

### Step-by-Step Data Flow

1. **CSV Upload**
   - User drags/drops or selects CSV file
   - JavaScript validates file type
   - File sent via FormData to `/api/analyze`

2. **Server Processing**
   ```go
   parseCSV()
   ├── Read header row
   ├── Map columns dynamically
   └── Parse each transaction
   
   generatePLReport()
   ├── Categorize each transaction
   │   ├── isRevenue() → Revenue bucket
   │   ├── isCOGS() → COGS with subcategories
   │   └── determineOpExCategory() → S&M, R&D, or G&A
   ├── Identify headcount costs
   └── Calculate totals & metrics
   ```

3. **Response & Display**
   - JSON returned to browser
   - JavaScript renders interactive UI
   - Export functionality available

## File Structure

```
netsuite-pl-analyzer/
├── api/
│   └── analyze.go              # Go serverless function
│       ├── Handler()           # Main HTTP handler
│       ├── parseCSV()          # CSV parsing logic
│       ├── generatePLReport()  # P&L calculation
│       ├── categorization functions
│       └── calculation utilities
│
├── public/
│   ├── index.html              # Frontend UI & styles
│   └── app.js                  # Client-side logic
│       ├── File upload handling
│       ├── API communication
│       ├── Results rendering
│       └── CSV export
│
├── go.mod                      # Go dependencies
├── vercel.json                 # Vercel configuration
├── package.json                # Node scripts
├── sample-data.csv             # Example dataset
│
└── Documentation/
    ├── README.md               # Main documentation
    ├── QUICKSTART.md          # 5-minute setup guide
    ├── DEPLOYMENT.md          # Deployment instructions
    └── ARCHITECTURE.md        # This file
```

## Technology Stack

### Backend
- **Language**: Go 1.21+
- **Runtime**: Vercel Serverless Functions
- **Libraries**: Standard library only (no external dependencies)
- **Processing**: In-memory CSV parsing

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern responsive design with gradients
- **JavaScript**: Vanilla ES6+ (no frameworks)
- **Features**: 
  - Drag-and-drop file upload
  - Dynamic DOM manipulation
  - Client-side CSV generation

### Infrastructure
- **Hosting**: Vercel
- **CDN**: Vercel Edge Network (global)
- **SSL**: Automatic HTTPS
- **Deployment**: Git-based continuous deployment

## Key Design Decisions

### 1. Serverless Architecture
**Why**: 
- Zero infrastructure management
- Automatic scaling
- Pay-per-use pricing
- Global edge deployment

**Trade-offs**:
- Cold start latency (mitigated by small codebase)
- 10MB file size limit (sufficient for most use cases)

### 2. Go for Backend
**Why**:
- Fast execution (important for CSV parsing)
- Small binary size (fast cold starts)
- Strong standard library (CSV, HTTP)
- Type safety

**Trade-offs**:
- Less familiar than Node.js/Python
- Fewer serverless examples (but simple code)

### 3. Vanilla JavaScript Frontend
**Why**:
- No build step required
- Fast load times
- Simple to understand and modify
- No framework lock-in

**Trade-offs**:
- More verbose than React/Vue
- Manual DOM manipulation (manageable for this scope)

### 4. In-Memory Processing
**Why**:
- Fast processing
- Simple implementation
- No database needed
- Stateless (better for serverless)

**Trade-offs**:
- Limited by function memory (10GB Vercel limit)
- No persistence (by design - security feature)

## Categorization Algorithm

### Classification Pipeline

```
Transaction
    ↓
┌───────────────────────┐
│ Extract Features      │
│ • Account name        │
│ • Department          │
│ • Class               │
│ • Memo                │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ Revenue Check         │
│ Keywords: revenue,    │
│ sales, income         │
└──────────┬────────────┘
           ↓ (if not revenue)
┌───────────────────────┐
│ COGS Check            │
│ Keywords: cogs, cost  │
│ of goods, cost of     │
│ sales                 │
└──────────┬────────────┘
           ↓ (if not COGS)
┌───────────────────────┐
│ OpEx Categorization   │
│ • S&M: sales,         │
│   marketing, sdr, ae  │
│ • R&D: engineering,   │
│   product, r&d        │
│ • G&A: finance, legal,│
│   hr, facilities      │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ Headcount Check       │
│ Keywords: salary,     │
│ payroll, benefits,    │
│ commission            │
└───────────────────────┘
```

### Keyword Matching Strategy

- **Case-insensitive**: All comparisons use lowercase
- **Multi-field**: Combines account, department, class, memo
- **Priority order**: More specific keywords first
- **Flexible**: Easy to customize in code

## Performance Characteristics

### Expected Performance

| Metric | Value |
|--------|-------|
| Cold start | ~200-500ms |
| Warm execution | ~50-100ms |
| CSV parsing (1000 rows) | ~10-20ms |
| Total request time | ~100-600ms |
| File size limit | 10MB |
| Max rows (typical) | ~50,000 |

### Optimization Opportunities

1. **Caching**: Add Redis for frequently analyzed files
2. **Batch Processing**: Support multiple files at once
3. **Streaming**: Stream large CSV files instead of loading entirely
4. **WebAssembly**: Compile Go to WASM for client-side processing

## Security Considerations

### Current Security Features

✅ **No Data Persistence**
- Files processed in-memory only
- No database or file storage
- Automatic cleanup after request

✅ **HTTPS Only**
- Automatic SSL via Vercel
- Encrypted data in transit

✅ **Input Validation**
- File type checking
- Size limits
- CSV format validation

✅ **CORS Enabled**
- Configurable origins
- Default: allow all (can be restricted)

### Optional Security Enhancements

🔐 **Authentication**
- Add basic auth for internal use
- OAuth integration for enterprise
- API key protection

🔐 **Rate Limiting**
- Prevent abuse
- Quota management

🔐 **Data Sanitization**
- Remove PII before processing
- Anonymize sensitive data

## Scalability

### Current Limits

- **Vercel Free Tier**: 100 GB bandwidth, 100 hours execution
- **File Size**: 10MB per request
- **Concurrent Users**: Unlimited (auto-scales)
- **Processing Speed**: ~10,000 rows/second

### Scaling Strategy

**Phase 1** (Current): Serverless single-function
- ✅ Good for: <1000 analyses/month
- ✅ Cost: Free

**Phase 2**: Multi-region deployment
- Add caching layer
- Database for historical analysis
- User accounts

**Phase 3**: Enterprise features
- Multi-company support
- Real-time NetSuite integration
- Advanced analytics & ML

## API Specification

### POST /api/analyze

**Request**
```http
POST /api/analyze
Content-Type: multipart/form-data

file: [CSV file]
```

**Response**
```json
{
  "revenue": float64,
  "cogs": {
    "name": string,
    "total": float64,
    "headcount": float64,
    "nonHeadcount": float64,
    "subcategories": {
      "<name>": {
        "name": string,
        "headcount": float64,
        "nonHeadcount": float64,
        "total": float64
      }
    }
  },
  "grossProfit": float64,
  "grossMargin": float64,
  "opex": {
    "S&M": { /* PLCategory */ },
    "R&D": { /* PLCategory */ },
    "G&A": { /* PLCategory */ }
  },
  "totalOpex": float64,
  "ebitda": float64
}
```

**Error Responses**
- `400 Bad Request`: Invalid CSV format
- `413 Payload Too Large`: File exceeds 10MB
- `500 Internal Server Error`: Processing error

## Future Enhancements

### Planned Features
- [ ] Date range filtering
- [ ] Month-over-month comparison
- [ ] Budget vs. actual analysis
- [ ] Multi-currency support
- [ ] Custom categorization rules (UI)
- [ ] Excel export with formatting
- [ ] Saved reports & history
- [ ] Direct NetSuite API integration

### Technology Evolution
- [ ] Add TypeScript for frontend
- [ ] Implement state management
- [ ] Add unit tests
- [ ] Add end-to-end tests
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)

## Contributing

See [README.md](README.md) for contribution guidelines.

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**Architecture Version**: 1.0  
**Last Updated**: January 2024
