# Deployment Guide

## Deploying to Vercel

### Option 1: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: NetSuite P&L Analyzer"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/netsuite-pl-analyzer.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel will auto-detect the configuration
   - Click "Deploy"

3. **Done!**
   - Your app will be live at `https://your-project.vercel.app`
   - Automatic deployments on every push to main

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Local Testing

### Prerequisites
- Go 1.21 or higher
- Node.js 16+ (for Vercel CLI)

### Run Development Server

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Start local dev server
vercel dev
```

The app will be available at `http://localhost:3000`

### Test the API directly

```bash
# Test with sample data
curl -X POST http://localhost:3000/api/analyze \
  -F "file=@sample-data.csv"
```

## Environment Configuration

### Production Settings

No environment variables needed for basic deployment!

### Optional: Custom Configuration

If you want to add custom features, you can set environment variables in Vercel:

1. Go to your project in Vercel Dashboard
2. Navigate to Settings > Environment Variables
3. Add variables as needed

Example variables you might add:
```
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_ORIGINS=*       # CORS configuration
```

## Custom Domain

1. In Vercel Dashboard, go to your project
2. Click Settings > Domains
3. Add your custom domain
4. Follow DNS configuration instructions

## Monitoring & Logs

### View Logs
```bash
vercel logs
```

### Monitor Performance
- Go to Vercel Dashboard
- Click on your project
- View Analytics tab for:
  - Request counts
  - Response times
  - Error rates
  - Geographic distribution

## Updating Your Deployment

### Via GitHub
```bash
git add .
git commit -m "Update feature"
git push
```
Vercel automatically deploys on push.

### Via CLI
```bash
vercel --prod
```

## Troubleshooting Deployment

### Build Fails

**Error**: "go.mod not found"
```bash
# Ensure go.mod exists
go mod init netsuite-pl-analyzer
go mod tidy
```

**Error**: "Handler function not found"
- Check that `api/analyze.go` has `func Handler(w http.ResponseWriter, r *http.Request)`
- Ensure package is named `handler`

### Runtime Errors

**Error**: "502 Bad Gateway"
- Check function logs: `vercel logs`
- Verify Go version in `go.mod` matches Vercel's supported versions
- Test locally first with `vercel dev`

**Error**: "CSV parse failed"
- Test with sample-data.csv first
- Check CSV format matches expected columns
- Verify file size is under 10MB

### CORS Issues

If you get CORS errors:
1. Check browser console for specific error
2. Verify CORS headers in `api/analyze.go`:
   ```go
   w.Header().Set("Access-Control-Allow-Origin", "*")
   ```

## Performance Optimization

### Cold Start Optimization
Vercel serverless functions may have cold starts. To minimize:
- Keep function code small and focused
- Use Vercel's caching features
- Consider Vercel Pro for better cold start times

### File Size Limits
- Default: 10MB per request
- Can be increased with Vercel Pro/Enterprise

## Security Considerations

### Production Checklist
- [ ] Update CORS to specific origins if needed
- [ ] Add rate limiting if processing sensitive data
- [ ] Consider authentication for internal use
- [ ] Review file upload size limits
- [ ] Monitor for abuse via Vercel Analytics

### Adding Authentication (Optional)

For internal company use, add basic auth:

```go
// In api/analyze.go
func Handler(w http.ResponseWriter, r *http.Request) {
    // Basic auth check
    user, pass, ok := r.BasicAuth()
    if !ok || user != os.Getenv("AUTH_USER") || pass != os.Getenv("AUTH_PASS") {
        w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    // ... rest of handler
}
```

Then set environment variables in Vercel:
```
AUTH_USER=your-username
AUTH_PASS=your-secure-password
```

## Cost Estimation

### Vercel Free Tier
- 100GB bandwidth/month
- 100 hours serverless function execution/month
- Perfect for small teams (< 100 analyses/month)

### Vercel Pro ($20/month)
- 1TB bandwidth/month
- 1000 hours execution/month
- Better for medium teams (< 1000 analyses/month)

Typical usage per analysis:
- ~100ms execution time
- ~500KB bandwidth (upload + download)

## Backup & Data

**Important**: This app is stateless - no data is stored on the server.
- All processing happens in-memory
- Files are not saved after processing
- Export important reports to CSV immediately

## Getting Help

If you encounter issues:
1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review [Go Runtime Documentation](https://vercel.com/docs/runtimes#official-runtimes/go)
3. Check Vercel Status: [vercel-status.com](https://www.vercel-status.com/)
4. Open an issue on GitHub

## Next Steps After Deployment

1. **Test with real data**: Upload your NetSuite CSV
2. **Customize categorization**: Edit keywords in `api/analyze.go`
3. **Share with team**: Send them the deployment URL
4. **Monitor usage**: Check Vercel Analytics
5. **Collect feedback**: Iterate based on team needs

---

**Ready to deploy? Run `vercel` and you're live in 30 seconds!** 🚀
