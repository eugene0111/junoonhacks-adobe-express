import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFormatSizing } from "../utils/formatSizing.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generate brand profile using AI
 * @param {Object} brandData - Brand information
 * @param {string} brandData.brand_name - Brand name
 * @param {string} brandData.brand_statement - Brand statement/brief
 * @param {string} brandData.format - Post format type
 * @param {Array} brandData.extracted_colors - Colors extracted from website (optional)
 * @param {Array} brandData.extracted_fonts - Fonts extracted from website (optional)
 * @param {string} brandData.extracted_tone - Tone extracted from website (optional)
 * @returns {Promise<Object>} Generated brand profile
 */
export async function generateBrandProfile(brandData) {
    const { brand_name, brand_statement, format, extracted_colors, extracted_fonts, extracted_tone } = brandData;

    // Get format-specific sizing rules
    const formatSizing = getFormatSizing(format);

    // Build prompt for Gemini
    let prompt = `You are a brand design expert. Generate a comprehensive brand profile for the following brand:

Brand Name: ${brand_name || "Unknown Brand"}
Brand Statement/Brief: ${brand_statement || "No statement provided"}
Post Format: ${format}

`;

    // Add extracted data if available
    if (extracted_colors && extracted_colors.length > 0) {
        prompt += `Extracted Colors from Website: ${extracted_colors.join(", ")}\n`;
    }
    if (extracted_fonts && extracted_fonts.length > 0) {
        prompt += `Extracted Fonts from Website: ${extracted_fonts.join(", ")}\n`;
    }
    if (extracted_tone) {
        prompt += `Detected Tone: ${extracted_tone}\n`;
    }

    prompt += `
Based on this information, generate a brand profile in the following JSON format. The sizing MUST be strictly coherent with the format type "${format}".

Required JSON structure:
{
  "fonts": {
    "heading": "Font name for headings (e.g., Poppins, Montserrat)",
    "body": "Font name for body text (e.g., Inter, Open Sans)",
    "h1_size": ${formatSizing.fonts.h1_size},
    "h2_size": ${formatSizing.fonts.h2_size},
    "h3_size": ${formatSizing.fonts.h3_size},
    "body_size": ${formatSizing.fonts.body_size},
    "caption_size": ${formatSizing.fonts.caption_size}
  },
  "colors": {
    "primary": "#HEXCODE (main brand color)",
    "secondary": "#HEXCODE (secondary brand color)",
    "accent": "#HEXCODE (accent color for highlights)",
    "background": "#HEXCODE (background color, usually white or light)",
    "text": "#HEXCODE (main text color, usually dark)"
  },
  "spacing": {
    "padding": ${formatSizing.spacing.padding},
    "margin": ${formatSizing.spacing.margin},
    "gap": ${formatSizing.spacing.gap}
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
  "tone": "professional|modern|friendly|luxury|playful"
}

IMPORTANT:
1. Use the EXACT font sizes provided above for the format "${format}" - do not change them
2. Use the EXACT spacing values provided above - do not change them
3. If colors were extracted from the website, prioritize using those colors
4. If fonts were extracted, consider using those fonts if appropriate
5. Choose colors that match the brand statement and tone
6. Select modern, web-safe fonts that complement the brand
7. Return ONLY valid JSON, no markdown formatting or code blocks
`;

    try {
        // Get the Gemini Pro model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Generate content
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        // Extract JSON from response
        let responseText = response.text;
        
        // Remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON
        let brandProfile;
        try {
            brandProfile = JSON.parse(responseText);
        } catch (parseError) {
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                brandProfile = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Failed to parse JSON from AI response");
            }
        }

        // Ensure format-specific sizing is enforced
        brandProfile.fonts.h1_size = formatSizing.fonts.h1_size;
        brandProfile.fonts.h2_size = formatSizing.fonts.h2_size;
        brandProfile.fonts.h3_size = formatSizing.fonts.h3_size;
        brandProfile.fonts.body_size = formatSizing.fonts.body_size;
        brandProfile.fonts.caption_size = formatSizing.fonts.caption_size;

        brandProfile.spacing.padding = formatSizing.spacing.padding;
        brandProfile.spacing.margin = formatSizing.spacing.margin;
        brandProfile.spacing.gap = formatSizing.spacing.gap;

        return brandProfile;

    } catch (error) {
        console.error("Error generating brand profile with AI:", error);
        
        // Fallback to default brand profile if AI fails
        return generateDefaultBrandProfile(format, brandData);
    }
}

/**
 * Generate a default brand profile when AI fails
 * @param {string} format - Post format type
 * @param {Object} brandData - Brand information
 * @returns {Object} Default brand profile
 */
function generateDefaultBrandProfile(format, brandData) {
    const formatSizing = getFormatSizing(format);
    
    // Use extracted colors if available, otherwise use defaults
    const primaryColor = brandData.extracted_colors?.[0] || "#1E40AF";
    const secondaryColor = brandData.extracted_colors?.[1] || "#64748B";
    const accentColor = brandData.extracted_colors?.[2] || "#FACC15";
    
    return {
        fonts: {
            heading: brandData.extracted_fonts?.[0] || "Poppins",
            body: brandData.extracted_fonts?.[1] || "Inter",
            h1_size: formatSizing.fonts.h1_size,
            h2_size: formatSizing.fonts.h2_size,
            h3_size: formatSizing.fonts.h3_size,
            body_size: formatSizing.fonts.body_size,
            caption_size: formatSizing.fonts.caption_size
        },
        colors: {
            primary: primaryColor,
            secondary: secondaryColor,
            accent: accentColor,
            background: "#FFFFFF",
            text: "#1F2937"
        },
        spacing: {
            padding: formatSizing.spacing.padding,
            margin: formatSizing.spacing.margin,
            gap: formatSizing.spacing.gap
        },
        borders: {
            radius: 12,
            width: 2,
            style: "solid"
        },
        shadows: {
            enabled: true,
            x: 0,
            y: 4,
            blur: 12,
            color: "#00000015"
        },
        tone: brandData.extracted_tone || "professional"
    };
}
