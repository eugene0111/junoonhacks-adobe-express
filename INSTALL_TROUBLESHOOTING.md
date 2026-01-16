# Installation Troubleshooting

## Puppeteer Chrome Download Timeout

If you're getting a timeout error when installing Puppeteer (Chrome download), you have a few options:

### Option 1: Skip Chrome Download (Recommended for Testing)

Set the environment variable to skip Chrome download:

**PowerShell:**
```powershell
$env:PUPPETEER_SKIP_DOWNLOAD="true"
npm install
```

**Or permanently in PowerShell:**
```powershell
[System.Environment]::SetEnvironmentVariable('PUPPETEER_SKIP_DOWNLOAD', 'true', 'User')
npm install
```

**Note:** If you skip the download, website crawling won't work until you install Chrome separately or let Puppeteer download it later.

### Option 2: Install Without Puppeteer (If You Don't Need Website Crawling)

If you only need brand generation (not website crawling), you can temporarily remove Puppeteer:

1. Comment out or remove the puppeteer line from `package.json`
2. Install dependencies: `npm install`
3. The API will work, but website crawling will fail gracefully

### Option 3: Retry Installation

Sometimes network issues cause timeouts. Try:
```powershell
npm cache clean --force
npm install
```

### Option 4: Use a Different Network/VPN

If you're behind a firewall or have network restrictions, try:
- Using a different network
- Using a VPN
- Installing from a location with better connectivity

## Permission Errors (EPERM)

If you see permission errors when installing:

1. **Close any programs using node_modules:**
   - Close VS Code/your IDE
   - Close any running Node.js processes
   - Close file explorers in the project directory

2. **Run PowerShell as Administrator:**
   - Right-click PowerShell
   - Select "Run as Administrator"
   - Navigate to project directory
   - Run `npm install`

3. **Delete node_modules manually:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Force package-lock.json
   npm install
   ```

## Quick Test Without Website Crawling

If you just want to test the brand generation API without website crawling:

1. Set `PUPPETEER_SKIP_DOWNLOAD=true` and install
2. Test the API with only `brand_statement` (no `website_url`)
3. The API will work fine without Puppeteer for basic brand generation
