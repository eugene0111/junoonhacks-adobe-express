# Google Gemini API Setup

## Getting Your API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## Environment Configuration

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

## Installation

After updating the dependencies, run:

```bash
npm install
```

This will install `@google/generative-ai` package.

## Usage

The brand generator now uses Google's Gemini Pro model. The API endpoint remains the same:

```bash
POST /brand/generate
```

The system will automatically use Gemini for AI-powered brand profile generation.

## Model Information

- **Model**: `gemini-pro`
- **SDK**: `@google/generative-ai` v0.21.0+
- **API**: Google Generative AI API

## Fallback Behavior

If the Gemini API key is not set or if there's an error, the system will:
1. Log the error
2. Fall back to default brand profile generation using extracted website data
3. Still enforce format-specific sizing rules
