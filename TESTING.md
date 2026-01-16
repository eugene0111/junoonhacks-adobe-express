# Testing Guide for BrandGuard API

## Prerequisites

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
   
   Get your Gemini API key from: https://makersuite.google.com/app/apikey

3. **Start the server:**
   ```powershell
   npm start
   ```
   
   Or for development with auto-reload:
   ```powershell
   npm run dev
   ```

## Testing Methods

### Method 1: Using PowerShell Script (Easiest)

Run the automated test script:
```powershell
.\test-api.ps1
```

This script will:
- Test the health check endpoint
- Test brand profile generation with brand statement
- Optionally test website crawling (commented out by default)

### Method 2: Manual PowerShell Testing

#### Test 1: Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:3000" -Method Get
```

Expected response:
```json
{
  "status": "ok",
  "message": "BrandGuard API is running"
}
```

#### Test 2: Generate Brand Profile
```powershell
$body = @{
    brand_name = "TechStart"
    brand_statement = "Fintech startup for Gen Z"
    format = "instagram_post"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
```

#### Test 3: Generate with Website URL
```powershell
$body = @{
    brand_name = "Example Brand"
    website_url = "https://example.com"
    format = "facebook_post"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
```

### Method 3: Using curl (if available)

```bash
# Health check
curl http://localhost:3000

# Generate brand profile
curl -X POST http://localhost:3000/brand/generate `
  -H "Content-Type: application/json" `
  -d '{\"brand_name\":\"TechStart\",\"brand_statement\":\"Fintech startup for Gen Z\",\"format\":\"instagram_post\"}'
```

### Method 4: Using Postman or Thunder Client

1. **Health Check:**
   - Method: `GET`
   - URL: `http://localhost:3000`

2. **Generate Brand Profile:**
   - Method: `POST`
   - URL: `http://localhost:3000/brand/generate`
   - Headers: `Content-Type: application/json`
   - Body (JSON):
     ```json
     {
       "brand_name": "TechStart",
       "brand_statement": "Fintech startup for Gen Z",
       "format": "instagram_post"
     }
     ```

## Expected Response Format

```json
{
  "brand_profile": {
    "fonts": {
      "heading": "Poppins",
      "body": "Inter",
      "h1_size": 48,
      "h2_size": 36,
      "h3_size": 24,
      "body_size": 16,
      "caption_size": 12
    },
    "colors": {
      "primary": "#1E40AF",
      "secondary": "#64748B",
      "accent": "#FACC15",
      "background": "#FFFFFF",
      "text": "#1F2937"
    },
    "spacing": {
      "padding": 24,
      "margin": 16,
      "gap": 12
    },
    "borders": {
      "radius": 12,
      "width": 2,
      "style": "solid"
    },
    "shadows": {
      "enabled": true,
      "x": 0,
      "y": 4,
      "blur": 12,
      "color": "#00000015"
    },
    "tone": "professional"
  }
}
```

## Supported Formats

- `instagram_post`
- `instagram_story`
- `facebook_post`
- `facebook_cover`
- `twitter_post`
- `linkedin_post`
- `banner`
- `poster`
- `youtube_thumbnail`
- `email_header`

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify `.env` file exists and has `GEMINI_API_KEY`
- Check `npm install` completed successfully

### API returns error
- Verify Gemini API key is valid
- Check server logs for detailed error messages
- Ensure format name is one of the supported formats

### Website crawling fails
- Website crawling is optional - API will still work without it
- Some websites may block crawlers
- Check server logs for specific error messages
