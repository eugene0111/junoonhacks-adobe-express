import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFormatSizing } from "../utils/formatSizing.js";
import { getCachedProfile, setCachedProfile } from "../utils/cache.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyD63aeeOvmHkDCNSXV8zat5p8M_0ukiNb8");


export async function generateBrandProfile(brandData) {
    const cached = getCachedProfile(brandData);
    if (cached) {
        return cached;
    }

    // const { brand_name, brand_statement, format, extracted_colors, extracted_fonts, extracted_tone } = brandData;

    const { brand_name, brand_statement, format, extracted_colors, extracted_fonts, extracted_tone, extracted_borders, extracted_shadows } = brandData;

    
    const formatSizing = getFormatSizing(format);

    
    let prompt = `You are a brand design expert. Generate a comprehensive brand profile for the following brand:

Brand Name: ${brand_name || "Unknown Brand"}
Brand Statement/Brief: ${brand_statement || "No statement provided"}
Post Format: ${format}

`;

    
    if (extracted_colors && extracted_colors.length > 0) {
        prompt += `Extracted Colors from Website: ${extracted_colors.join(", ")}\n`;
    }
    if (extracted_fonts && extracted_fonts.length > 0) {
        prompt += `Extracted Fonts from Website: ${extracted_fonts.join(", ")}\n`;
    }
    if (extracted_tone) {
        prompt += `Detected Tone: ${extracted_tone}\n`;
    }
    if (extracted_borders && extracted_borders.length > 0) {
        prompt += `Extracted Border Properties: ${extracted_borders.join(", ")}\n`;
    }
    if (extracted_shadows && extracted_shadows.length > 0) {
        prompt += `Extracted Shadow Properties: ${extracted_shadows.join(", ")}\n`;
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
  "tone": "professional" (must be ONE of: professional, modern, friendly, luxury, or playful)
}

IMPORTANT:
1. Use the EXACT font sizes provided above for the format "${format}" - do not change them
2. Use the EXACT spacing values provided above - do not change them
3. If colors were extracted from the website, prioritize using those colors
4. If fonts were extracted, consider using those fonts if appropriate
5. If border properties were extracted, use them for the borders object
6. If shadow properties were extracted, use them for the shadows object
7. Choose colors that match the brand statement and tone
8. Select modern, web-safe fonts that complement the brand
9. Return ONLY valid JSON, no markdown formatting or code blocks
10. Do NOT include any explanatory text before or after the JSON
11. Ensure all JSON keys are properly quoted with double quotes
12. Do NOT include trailing commas in arrays or objects
13. The response must start with { and end with }
`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(prompt);
        const response = result.response;
        
        // Extract text from response
        // The response.text is a getter, but we'll access candidates directly for reliability
        let responseText = '';
        
        // Primary method: Access text through candidates array (most reliable)
        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts) {
                responseText = candidate.content.parts
                    .filter(part => part.text) // Only get parts with text
                    .map(part => part.text)
                    .join('');
            }
        }
        
        // Validate we got text
        if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
            console.error("Failed to extract text from response. Response structure:", {
                hasCandidates: !!response.candidates,
                candidatesLength: response.candidates?.length,
                firstCandidateContent: response.candidates?.[0]?.content,
                firstCandidateParts: response.candidates?.[0]?.content?.parts
            });
            throw new Error("No text content found in Gemini API response. Check API response structure.");
        }

        // Clean up markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Log the full response for debugging
        console.log("Raw AI response length:", responseText.length, "characters");
        console.log("scraped data:", brandData)
        console.log("Raw AI response (first 500 chars):", responseText.substring(0, 500));
        console.log("Raw AI response (last 200 chars):", responseText.substring(Math.max(0, responseText.length - 200)));
        
        // Remove any leading/trailing text that's not JSON
        // Try to find JSON object in the response
        let brandProfile;
        try {
            // First, try to parse the entire response
            console.log("Attempting to parse JSON...");
            brandProfile = JSON.parse(responseText);
            console.log("✓ JSON parsed successfully");
        } catch (parseError) {
            console.error("JSON parse failed:", parseError.message);
            console.error("Parse error at position:", parseError.message.includes('position') ? parseError.message : 'unknown');
            // If that fails, try to extract JSON object from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let jsonToParse = jsonMatch[0];
                
                try {
                    brandProfile = JSON.parse(jsonToParse);
                } catch (secondParseError) {
                    // If still failing, try to clean up common JSON issues
                    let cleanedJson = jsonToParse
                        // Remove trailing commas before closing braces/brackets
                        .replace(/,(\s*[}\]])/g, '$1')
                        // Remove comments (if any)
                        .replace(/\/\/.*$/gm, '')
                        .replace(/\/\*[\s\S]*?\*\//g, '')
                        // Remove any control characters
                        .replace(/[\x00-\x1F\x7F]/g, '')
                        // Fix common issues with quotes
                        .replace(/'/g, '"');
                    
                    try {
                        brandProfile = JSON.parse(cleanedJson);
                    } catch (finalError) {
                        console.error("JSON Parse Error Details:");
                        console.error("Original response:", responseText.substring(0, 1000));
                        console.error("Extracted JSON:", jsonToParse.substring(0, 1000));
                        console.error("Cleaned JSON:", cleanedJson.substring(0, 1000));
                        console.error("Parse error at position:", finalError.message);
                        throw new Error(`Failed to parse JSON from AI response: ${finalError.message}`);
                    }
                }
            } else {
                console.error("No JSON object found in response. Full response:", responseText);
                throw new Error(`No valid JSON found in AI response. Response: ${responseText.substring(0, 200)}...`);
            }
        }

        // Validate brandProfile structure before enforcing sizes
        if (!brandProfile || typeof brandProfile !== 'object') {
            throw new Error("Invalid brand profile structure from AI");
        }

        // Ensure required fields exist
        if (!brandProfile.fonts) brandProfile.fonts = {};
        if (!brandProfile.spacing) brandProfile.spacing = {};

        // Normalize tone field - ensure it's a single value, not pipe-separated
        if (brandProfile.tone && typeof brandProfile.tone === 'string') {
            const validTones = ['professional', 'modern', 'friendly', 'luxury', 'playful'];
            // If tone contains pipe, take the first valid one
            if (brandProfile.tone.includes('|')) {
                const tones = brandProfile.tone.split('|').map(t => t.trim().toLowerCase());
                brandProfile.tone = tones.find(t => validTones.includes(t)) || validTones[0];
            } else {
                // Ensure it's a valid tone
                const normalizedTone = brandProfile.tone.trim().toLowerCase();
                brandProfile.tone = validTones.includes(normalizedTone) ? normalizedTone : validTones[0];
            }
        } else {
            brandProfile.tone = 'professional';
        }

        // Enforce format-specific sizing
        brandProfile.fonts.h1_size = formatSizing.fonts.h1_size;
        brandProfile.fonts.h2_size = formatSizing.fonts.h2_size;
        brandProfile.fonts.h3_size = formatSizing.fonts.h3_size;
        brandProfile.fonts.body_size = formatSizing.fonts.body_size;
        brandProfile.fonts.caption_size = formatSizing.fonts.caption_size;

        brandProfile.spacing.padding = formatSizing.spacing.padding;
        brandProfile.spacing.margin = formatSizing.spacing.margin;
        brandProfile.spacing.gap = formatSizing.spacing.gap;

        console.log("✓ Successfully parsed and processed brand profile");
        console.log("Brand profile structure:", {
            hasFonts: !!brandProfile.fonts,
            hasColors: !!brandProfile.colors,
            hasSpacing: !!brandProfile.spacing,
            hasBorders: !!brandProfile.borders,
            hasShadows: !!brandProfile.shadows,
            hasTone: !!brandProfile.tone
        });
        setCachedProfile(brandData, brandProfile);
        return brandProfile;

    } catch (error) {
        console.error("Error generating brand profile with AI:", error.message);
        console.error("Error details:", error.stack);
        
        // Return fallback profile
        console.log("Falling back to default brand profile");
        const fallbackProfile = generateDefaultBrandProfile(format, brandData);
        setCachedProfile(brandData, fallbackProfile);
        return fallbackProfile;
    }
}


function generateDefaultBrandProfile(format, brandData) {
    const formatSizing = getFormatSizing(format);
    
    // Use extracted colors if available
    const primaryColor = brandData.extracted_colors?.[0] || "#1E40AF";
    const secondaryColor = brandData.extracted_colors?.[1] || "#64748B";
    const accentColor = brandData.extracted_colors?.[2] || "#FACC15";
    
    // Parse border data from extracted borders
    let borderRadius = 12;
    let borderWidth = 2;
    let borderStyle = "solid";
    
    if (brandData.extracted_borders && brandData.extracted_borders.length > 0) {
        brandData.extracted_borders.forEach(border => {
            if (border.startsWith('radius:')) {
                const radius = parseInt(border.split(':')[1]);
                if (!isNaN(radius)) borderRadius = radius;
            } else if (border.startsWith('width:')) {
                const width = parseInt(border.split(':')[1]);
                if (!isNaN(width)) borderWidth = width;
            } else if (border.startsWith('style:')) {
                borderStyle = border.split(':')[1];
            }
        });
    }
    
    // Parse shadow data from extracted shadows
    let shadowEnabled = true;
    let shadowX = 0;
    let shadowY = 4;
    let shadowBlur = 12;
    let shadowColor = "#00000015";
    
    if (brandData.extracted_shadows && brandData.extracted_shadows.length > 0) {
        const firstShadow = brandData.extracted_shadows[0];
        const parts = firstShadow.split(',');
        parts.forEach(part => {
            const [key, value] = part.split(':');
            if (key === 'x') shadowX = parseInt(value) || 0;
            else if (key === 'y') shadowY = parseInt(value) || 4;
            else if (key === 'blur') shadowBlur = parseInt(value) || 12;
            else if (key === 'color') shadowColor = value || "#00000015";
        });
    }
    
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
            radius: borderRadius,
            width: borderWidth,
            style: borderStyle
        },
        shadows: {
            enabled: shadowEnabled,
            x: shadowX,
            y: shadowY,
            blur: shadowBlur,
            color: shadowColor
        },
        tone: brandData.extracted_tone || "professional"
    };
}
