# Brand Profile Generation API Usage Examples

## Endpoint: POST /brand/generate

### Example 1: Generate from Brand Statement

```bash
curl -X POST http://localhost:3000/brand/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "TechStart",
    "brand_statement": "Fintech startup for Gen Z focusing on mobile-first banking solutions",
    "format": "instagram_post"
  }'
```

### Example 2: Generate from Website URL

```bash
curl -X POST http://localhost:3000/brand/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "Example Brand",
    "website_url": "https://example.com",
    "format": "facebook_post"
  }'
```

### Example 3: Generate with Both Statement and Website

```bash
curl -X POST http://localhost:3000/brand/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "My Brand",
    "brand_statement": "Modern design agency specializing in digital experiences",
    "website_url": "https://mybrand.com",
    "format": "youtube_thumbnail"
  }'
```

## Supported Formats

- `instagram_post` - 1080x1080px (square)
- `instagram_story` - 1080x1920px (vertical)
- `facebook_post` - 1200x630px (landscape)
- `facebook_cover` - 1200x675px
- `twitter_post` - 1200x675px
- `linkedin_post` - 1200x627px
- `banner` - 728x90px (web banner)
- `poster` - 2160x2880px (print poster)
- `youtube_thumbnail` - 1280x720px
- `email_header` - 600x200px

## Response Format

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
