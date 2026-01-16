# How to Test the BrandGuard API

## Quick Start (3 Steps)

### Step 1: Start the Server

Open a PowerShell terminal and run:
```powershell
npm start
```

You should see:
```
BrandGuard API listening on port 3000
```

**Keep this terminal open!** The server needs to be running.

---

### Step 2: Open a New PowerShell Window

Open a **second** PowerShell window (keep the server running in the first one).

---

### Step 3: Run the Test Script

In the new PowerShell window, navigate to your project directory and run:
```powershell
.\test-api.ps1
```

That's it! The script will automatically test all endpoints.

---

## Manual Testing (Step-by-Step)

If you prefer to test manually, here are the commands:

### Test 1: Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:3000" -Method Get
```

**Expected Output:**
```json
{
  "status": "ok",
  "message": "BrandGuard API is running"
}
```

---

### Test 2: Generate Brand Profile (Basic)

```powershell
$body = @{
    brand_name = "TechStart"
    brand_statement = "Fintech startup for Gen Z focusing on mobile-first banking"
    format = "instagram_post"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
```

**Expected Output:** A complete brand profile with fonts, colors, spacing, etc.

---

### Test 3: Generate Brand Profile (Different Format)

```powershell
$body = @{
    brand_name = "DesignCo"
    brand_statement = "Modern design agency specializing in digital experiences"
    format = "youtube_thumbnail"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
```

Notice how the font sizes change based on the format!

---

### Test 4: Generate with Website URL (Optional)

```powershell
$body = @{
    brand_name = "Example Brand"
    website_url = "https://example.com"
    format = "facebook_post"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
```

**Note:** This requires Puppeteer and Chrome to be installed. If it fails, the API will still work but won't crawl the website.

---

## Testing Different Formats

Try these different formats to see how sizing changes:

```powershell
# Instagram Story (vertical, larger fonts)
$body = @{
    brand_name = "MyBrand"
    brand_statement = "A cool brand"
    format = "instagram_story"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
```

```powershell
# Banner (small, compact fonts)
$body = @{
    brand_name = "MyBrand"
    brand_statement = "A cool brand"
    format = "banner"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
```

---

## Using Postman or Thunder Client (VS Code Extension)

### Setup

1. **Install Thunder Client** (VS Code extension) or use **Postman**

2. **Create a new request:**

   **Health Check:**
   - Method: `GET`
   - URL: `http://localhost:3000`

   **Generate Brand Profile:**
   - Method: `POST`
   - URL: `http://localhost:3000/brand/generate`
   - Headers:
     - Key: `Content-Type`
     - Value: `application/json`
   - Body (raw JSON):
     ```json
     {
       "brand_name": "TechStart",
       "brand_statement": "Fintech startup for Gen Z",
       "format": "instagram_post"
     }
     ```

---

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health check endpoint returns success
- [ ] Brand generation works with brand_statement
- [ ] Different formats produce different font sizes
- [ ] Response includes all required fields (fonts, colors, spacing, etc.)
- [ ] Format-specific sizing is enforced correctly

---

## Common Issues

### "Cannot connect to server"
- Make sure the server is running (`npm start`)
- Check if port 3000 is available
- Verify the server is listening on `localhost:3000`

### "GEMINI_API_KEY not found"
- Create a `.env` file in the root directory
- Add: `GEMINI_API_KEY=your_key_here`
- Restart the server

### "Website crawling failed"
- This is optional! The API will still work
- Website crawling requires Puppeteer and Chrome
- You can test without it by only using `brand_statement`

### PowerShell Execution Policy Error

If you get an execution policy error when running the script:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try running the script again.

---

## Quick Test Commands (Copy & Paste)

```powershell
# 1. Health Check
Invoke-RestMethod -Uri "http://localhost:3000" -Method Get

# 2. Basic Brand Generation
$body = @{brand_name="Test"; brand_statement="A test brand"; format="instagram_post"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"

# 3. Different Format
$body = @{brand_name="Test"; brand_statement="A test brand"; format="banner"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
```

---

## Expected Response Structure

Every successful response should have:
- ✅ `brand_profile` object
- ✅ `fonts` with heading, body, and all size fields
- ✅ `colors` with primary, secondary, accent, background, text
- ✅ `spacing` with padding, margin, gap
- ✅ `borders` with radius, width, style
- ✅ `shadows` with enabled, x, y, blur, color
- ✅ `tone` string

Font sizes should match the format type (e.g., `instagram_post` has different sizes than `banner`).
