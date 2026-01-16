# BrandGuard Setup Guide

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Add your Google Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

3. **Start the server:**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoint

### POST /brand/generate

**Request Body:**
```json
{
  "brand_name": "Your Brand Name",
  "brand_statement": "Brand description or brief",
  "format": "instagram_post",
  "website_url": "https://example.com" // Optional
}
```

**Response:**
```json
{
  "brand_profile": {
    "fonts": { ... },
    "colors": { ... },
    "spacing": { ... },
    "borders": { ... },
    "shadows": { ... },
    "tone": "professional"
  }
}
```

## Features Implemented (Person A)

✅ **Brand Profile Generation**
- AI-powered brand profile generation using Google Gemini API
- Takes input: brand name, statement/brief, and post format
- Outputs complete brand profile in specified format

✅ **Website Crawling**
- Crawls websites to extract brand information
- Extracts colors, fonts, tone, and brand name
- Uses Puppeteer for web scraping

✅ **Format-Specific Sizing**
- Strict sizing rules for 10+ post formats
- Ensures font sizes and spacing are coherent with format type
- Supports: Instagram, Facebook, Twitter, LinkedIn, YouTube, Banner, Poster, Email, etc.

✅ **Brand Profile Validation**
- Validates brand profile structure
- Ensures font hierarchy is maintained
- Validates color formats and spacing values

## Supported Formats

- `instagram_post` - Square format (1080x1080px)
- `instagram_story` - Vertical story format (1080x1920px)
- `facebook_post` - Landscape post (1200x630px)
- `facebook_cover` - Cover photo (1200x675px)
- `twitter_post` - Twitter post (1200x675px)
- `linkedin_post` - LinkedIn post (1200x627px)
- `banner` - Web banner (728x90px)
- `poster` - Print poster (2160x2880px)
- `youtube_thumbnail` - YouTube thumbnail (1280x720px)
- `email_header` - Email header (600x200px)

## Testing

Test the API using curl or Postman:

```bash
curl -X POST http://localhost:3000/brand/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "TechStart",
    "brand_statement": "Fintech startup for Gen Z",
    "format": "instagram_post"
  }'
```

## Notes

- Website crawling may take a few seconds
- If Gemini API key is not set, the system will use fallback default values
- Format sizing is strictly enforced - sizes cannot be changed for a given format
- Get your Gemini API key from: https://makersuite.google.com/app/apikey