# BrandGuard — Brand Consistency Assistant for Adobe Express

## Overview

BrandGuard helps designers maintain brand consistency without restricting creativity. Users define brand preferences once, design freely, and run a smart consistency check that detects and fixes mismatches in fonts, sizes, and colors — similar to how Grammarly works for text.

---

## Features

### 🎨 Brand Profile Creation
- **AI-assisted setup** for new companies
- **Manual setup** for existing brands
- **Reusable saved profiles**

### ✅ Brand Consistency Check
- Font mismatch detection
- Font size violations
- Color palette enforcement
- Clear explanations for each issue

### 🔧 Smart Fixes
- Fix individual issues
- Fix all similar issues at once
- Non-destructive suggestions

### ✨ Brand-Safe Enhancements
- Add textures
- Apply gradients
- Enhance backgrounds using brand rules

---

## Architecture

### Frontend (Adobe Express Add-on)
- **HTML/CSS** for UI
- **main.js** for API communication
- **iframe.js** for Adobe Express SDK interaction

### Backend (Stateless API)
- AI-powered brand generation
- Rule-based validation engine
- Fix planning system

---

## Work Division

### Person A — Brand Intelligence & Rules Engine
**Responsibilities:**
- Brand profile schema
- AI brand suggestion logic
- Preference validation logic

### Person B — Document Analysis & Violation Mapping
**Responsibilities:**
- Convert Adobe document data to backend format
- Violation grouping logic
- Bulk-fix planning

### Person C — Fix Executor & Add-on Tools
**Responsibilities:**
- Convert fix decisions to executable instructions
- Texture/enhancement helpers
- Non-AI speed-optimized tools

### Person D — Frontend
**Responsibilities:**
- Adobe Express UI & UX
- API integration
- SDK implementation

---

## API Endpoints

### Generate Brand Profile
```http
POST /brand/generate
```
**Input:**
```json
{
  "brand_statement": "Fintech startup for Gen Z",
  "format": "instagram_post"
}
```

**Output:**
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

### Validate Design
```http
POST /brand/validate
```
**Input:**
- Brand profile
- Extracted document styles

**Output:**
```json
{
  "violations": [
    {
      "type": "font_size",
      "expected": 14,
      "found": 18,
      "element_id": "text_12"
    }
  ]
}
```

### Execute Fixes
```http
POST /fix/execute
```
**Input:**
```json
{
  "actions": [
    {
      "action": "update_font_size",
      "element_id": "text_12",
      "value": 14
    }
  ]
}
```

### Design Tools
```http
POST /tools/add-texture
POST /tools/apply-gradient
```

---

## Integration Flow

```
User clicks "Check Brand Consistency"
        ↓
iframe.js extracts document styles
        ↓
main.js → POST /brand/validate
        ↓
Backend returns violations
        ↓
Frontend shows issues
        ↓
User clicks Fix
        ↓
main.js → POST /fix/plan
        ↓
iframe.js applies fixes using SDK
```

---

## Deployment

### Backend
**Framework:** FastAPI or Express  
**Hosting Options:**
- Render
- Railway
- Fly.io

**Base URL Example:**
```
https://brandguard-backend.onrender.com
```

**Note:** No authentication required for hackathon deployment.

### Frontend (Adobe Express Add-on)
- Uses deployed backend URL
- All API calls from `main.js`
- No secrets in frontend code

---

## Demo Flow

1. **Create or load** a brand profile
2. **Design freely** in Adobe Express
3. **Click** "Check Brand Consistency"
4. **Review** detected issues
5. **Fix** individually or in bulk
6. **Apply** brand-safe enhancements

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Adobe:** Express Add-on SDK
- **Backend:** FastAPI/Express
- **AI:** Google Gemini API for brand generation
- **Deployment:** Render/Railway/Fly.io

---

## Getting Started

### Prerequisites
- Node.js 16+
- Adobe Express Add-on CLI
- Backend hosting account

### Installation

**Clone the repository:**
```bash
git clone https://github.com/your-team/brandguard
cd brandguard
```

**Install frontend dependencies:**
```bash
cd frontend
npm install
```

**Install backend dependencies:**
```bash
cd backend
npm install
# or
pip install -r requirements.txt
```

**Configure environment:**
```bash
# Backend .env
GEMINI_API_KEY=your_key_here
PORT=3000

# Frontend config.js
BACKEND_URL=https://your-backend-url.com
```

**Run locally:**
```bash
# Backend
npm start
# or
python main.py

# Frontend (Adobe Express)
npx @adobe/ccweb-add-on-scripts start
```

---

## Team

Built in 24 hours for **Adobe Express Add-on Hackathon**

---

## License

