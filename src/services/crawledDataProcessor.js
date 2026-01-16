import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFormatSizing } from "../utils/formatSizing.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Step 1: Normalize and rank extracted design tokens (no image)
 */
async function normalizeDesignTokens(crawledData, format, brandStatement = "") {
    const formatSizing = getFormatSizing(format);
    
    const prompt = `You are a brand design expert. Normalize and rank the extracted design tokens from a website.

**Extracted Website Data:**
- Brand Name: ${crawledData.brand_name || "Not found"}
- Brand Statement: ${brandStatement || crawledData.brand_statement || "Not provided"}

**🎯 LOGO COLORS (HIGHEST PRIORITY - BRAND-DEFINING):**
${crawledData.logo_colors && crawledData.logo_colors.length > 0 
    ? `- Logo Type: ${crawledData.logo_info?.type || 'unknown'}
- Logo Confidence Score: ${crawledData.logo_info?.score || 'N/A'}
- Logo Colors Found: ${crawledData.logo_colors.join(", ")}
- ⚠️ CRITICAL: These logo colors MUST be used for primary and/or secondary colors. They represent the core brand identity.
- Logo colors are extracted directly from the logo element (${crawledData.logo_info?.type === 'svg' ? 'SVG attributes' : 'image/screenshot'})`
    : "- No logo colors detected"}

- Colors (ranked by frequency): ${JSON.stringify(crawledData.colors_ranked?.slice(0, 15) || [])}
- Heading Fonts (ranked): ${JSON.stringify(crawledData.heading_fonts_ranked || [])}
- Body Fonts (ranked): ${JSON.stringify(crawledData.body_fonts_ranked || [])}
- Font Sizes: H1=${crawledData.extracted_font_sizes?.h1 || "N/A"}, H2=${crawledData.extracted_font_sizes?.h2 || "N/A"}, H3=${crawledData.extracted_font_sizes?.h3 || "N/A"}, Body=${crawledData.extracted_font_sizes?.body || "N/A"}
- Spacing Values: ${crawledData.extracted_spacing?.join(", ") || "None"}
- Border Properties: ${crawledData.extracted_borders?.join(", ") || "None"}
- Shadow Properties: ${crawledData.extracted_shadows?.join(", ") || "None"}
- Detected Tone: ${crawledData.extracted_tone || "professional"}

**Target Format Requirements for "${format}":**
- H1 Size: ${formatSizing.fonts.h1_size}px
- H2 Size: ${formatSizing.fonts.h2_size}px
- H3 Size: ${formatSizing.fonts.h3_size}px
- Body Size: ${formatSizing.fonts.body_size}px
- Caption Size: ${formatSizing.fonts.caption_size}px
- Padding: ${formatSizing.spacing.padding}px
- Margin: ${formatSizing.spacing.margin}px
- Gap: ${formatSizing.spacing.gap}px

**Your Task:**
Analyze the frequency-weighted colors and their usage contexts. Based on frequency and context, assign color roles:

**🎯 LOGO COLOR PRIORITY (MANDATORY):**
${crawledData.logo_colors && crawledData.logo_colors.length > 0 
    ? `- **LOGO COLORS ARE THE MOST IMPORTANT**: ${crawledData.logo_colors.join(", ")}
- **PRIMARY color MUST be one of the logo colors** (choose the most prominent/darkest logo color)
- **SECONDARY color SHOULD be another logo color** (if multiple logo colors exist, use the second one)
- Logo colors represent the core brand identity - they override frequency rankings
- If only one logo color exists, use it for PRIMARY and derive secondary from other colors`
    : "- No logo colors detected - proceed with frequency-based assignment"}

1. **Primary**: ${crawledData.logo_colors && crawledData.logo_colors.length > 0 
    ? '**MUST be a logo color** (most prominent logo color)' 
    : 'Highest frequency color used in logos, headers, main CTAs, or marked as primary/brand in CSS variables'}
2. **Secondary**: ${crawledData.logo_colors && crawledData.logo_colors.length > 1 
    ? '**SHOULD be another logo color** (second logo color if available)' 
    : 'Second most prominent color, or used in backgrounds, borders'}
3. **Accent**: Color used in buttons, CTAs, highlights (often high frequency in button context)
4. **Background**: Usually white or light color, high frequency in background context
5. **Text**: Usually dark color, high frequency in text context

**Constraints (CRITICAL - DO NOT VIOLATE):**
- **If logo colors exist, PRIMARY MUST be a logo color** (highest priority rule)
- **If multiple logo colors exist, SECONDARY SHOULD be another logo color**
- Primary color CANNOT be white (#FFFFFF, #FFF, rgb(255,255,255)) unless it's the only logo color
- Text color CANNOT be the same as accent color
- Background color CANNOT be a saturated/bright color (should be white, light gray, or very light tint)

Return ONLY valid JSON in this format:
{
  "colors_normalized": {
    "primary": "#HEXCODE",
    "secondary": "#HEXCODE",
    "accent": "#HEXCODE",
    "background": "#HEXCODE",
    "text": "#HEXCODE"
  },
  "fonts_normalized": {
    "heading": "Font Name",
    "body": "Font Name"
  },
  "tone": "professional|modern|friendly|luxury|playful",
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
  "reasoning": "Brief explanation of color role assignments based on frequency and context"
}

Return ONLY valid JSON, no markdown or code blocks.`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        let responseText = '';
        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts) {
                responseText = candidate.content.parts
                    .filter(part => part.text)
                    .map(part => part.text)
                    .join('');
            }
        }
        
        if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
            throw new Error("No text content found in normalization step");
        }
        
        // Clean up markdown code blocks
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON
        let normalizedData;
        try {
            normalizedData = JSON.parse(responseText);
        } catch (parseError) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    normalizedData = JSON.parse(jsonMatch[0]);
                } catch (secondError) {
                    let cleanedJson = jsonMatch[0]
                        .replace(/,(\s*[}\]])/g, '$1')
                        .replace(/\/\/.*$/gm, '')
                        .replace(/\/\*[\s\S]*?\*\//g, '')
                        .replace(/[\x00-\x1F\x7F]/g, '');
                    normalizedData = JSON.parse(cleanedJson);
                }
            } else {
                throw new Error("No valid JSON found in normalization response");
            }
        }
        
        return normalizedData;
        
    } catch (error) {
        console.error("Error in normalization step:", error.message);
        throw error;
    }
}

/**
 * Step 2: Validate color roles visually using screenshot
 */
async function validateWithScreenshot(normalizedData, screenshots, format, brandStatement = "") {
    const formatSizing = getFormatSizing(format);
    
    // Use hero and footer screenshots (most representative)
    const imagesToSend = [];
    if (screenshots.hero) {
        imagesToSend.push({
            inlineData: {
                mimeType: "image/png",
                data: screenshots.hero
            }
        });
    }
    if (screenshots.footer && imagesToSend.length < 2) {
        imagesToSend.push({
            inlineData: {
                mimeType: "image/png",
                data: screenshots.footer
            }
        });
    }

    if (imagesToSend.length === 0) {
        // No screenshots available, return normalized data as-is
        return normalizedData;
    }

    const prompt = `You are a brand design expert. Validate the color role assignments by visually analyzing the website screenshots.

**Normalized Color Assignments (from Step 1):**
${JSON.stringify(normalizedData.colors_normalized || {}, null, 2)}

**Brand Context:**
- Target Format: ${format}

**Your Task:**
Look at the screenshots and verify if the color role assignments are correct. **PAY SPECIAL ATTENTION TO THE LOGO IN THE SCREENSHOTS.**

**🎯 LOGO COLOR VALIDATION (HIGHEST PRIORITY):**
${logoColors && logoColors.length > 0 
    ? `- **LOGO COLORS DETECTED**: ${logoColors.join(", ")}
- **Find the logo in the screenshots** - what colors do you see in the logo?
- **PRIMARY color MUST match the dominant color in the logo** (the main logo color you see)
- **SECONDARY color SHOULD match a secondary logo color** (if the logo has multiple colors)
- Logo colors are the most brand-defining - they override everything else`
    : "- No logo colors provided - validate based on visual appearance"}

1. **Primary**: ${logoColors && logoColors.length > 0 
    ? '**MUST match the dominant logo color visible in screenshots**' 
    : 'Should be the most prominent brand color visible in logos, headers, main navigation'}
2. **Secondary**: ${logoColors && logoColors.length > 1 
    ? '**SHOULD match a secondary logo color visible in screenshots**' 
    : 'Should be a supporting color used in secondary elements'}
3. **Accent**: Should be the color used for buttons, CTAs, important highlights
4. **Background**: Should match the main background color visible in the screenshot
5. **Text**: Should match the main text color visible in the screenshot

**Validation Rules (CRITICAL):**
- **If logo colors were provided, PRIMARY MUST be one of them** (check the logo in screenshots)
- If primary is white/light and NOT a logo color, it's WRONG - find the actual brand color from the logo
- If text and accent are the same, adjust text to be darker
- If background is saturated/bright, it should be white or very light
- **Logo colors take ABSOLUTE highest priority** - they define the brand identity

If the assignments are correct, return them as-is. If they need adjustment, provide corrected values based on what you see in the screenshots.

Return ONLY valid JSON in this format:
{
  "colors": {
    "primary": "#HEXCODE",
    "secondary": "#HEXCODE",
    "accent": "#HEXCODE",
    "background": "#HEXCODE",
    "text": "#HEXCODE"
  },
  "fonts": {
    "heading": "Font Name",
    "body": "Font Name"
  },
  "tone": "professional|modern|friendly|luxury|playful",
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
  "validation_notes": "What you observed in the screenshots"
}

Return ONLY valid JSON, no markdown or code blocks.`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Prepare content with images and prompt
        const content = [...imagesToSend, prompt];
        
        const result = await model.generateContent(content);
        const response = result.response;
        
        let responseText = '';
        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts) {
                responseText = candidate.content.parts
                    .filter(part => part.text)
                    .map(part => part.text)
                    .join('');
            }
        }
        
        if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
            console.warn("No text content in validation step, using normalized data");
            return normalizedData;
        }
        
        // Clean up markdown code blocks
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON
        let validatedData;
        try {
            validatedData = JSON.parse(responseText);
        } catch (parseError) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    validatedData = JSON.parse(jsonMatch[0]);
                } catch (secondError) {
                    let cleanedJson = jsonMatch[0]
                        .replace(/,(\s*[}\]])/g, '$1')
                        .replace(/\/\/.*$/gm, '')
                        .replace(/\/\*[\s\S]*?\*\//g, '')
                        .replace(/[\x00-\x1F\x7F]/g, '');
                    validatedData = JSON.parse(cleanedJson);
                }
            } else {
                console.warn("No valid JSON in validation step, using normalized data");
                return normalizedData;
            }
        }
        
        // Merge validated colors with normalized fonts and other data
        return {
            colors: validatedData.colors || normalizedData.colors_normalized,
            fonts: validatedData.fonts || normalizedData.fonts_normalized,
            tone: validatedData.tone || normalizedData.tone,
            borders: validatedData.borders || normalizedData.borders,
            shadows: validatedData.shadows || normalizedData.shadows
        };
        
    } catch (error) {
        console.error("Error in validation step:", error.message);
        // Fall back to normalized data
        return normalizedData;
    }
}

/**
 * Process crawled website data through LLM to adapt it for specific format
 * Uses two-step process: normalize first, then validate with screenshot
 * @param {Object} crawledData - Data extracted from website
 * @param {string} format - Target post format
 * @param {string} brandStatement - Brand statement (if provided)
 * @returns {Promise<Object>} Processed and adapted brand data
 */
export async function processCrawledData(crawledData, format, brandStatement = "") {
    const hasScreenshots = !!(crawledData.screenshots?.hero || crawledData.screenshots?.footer);
    
    // Print logo colors prominently
    if (crawledData.logo_colors && crawledData.logo_colors.length > 0) {
        console.log(`\n🎨 LOGO COLORS DETECTED (${crawledData.logo_colors.length} color(s)):`);
        crawledData.logo_colors.forEach((color, index) => {
            console.log(`   ${index + 1}. ${color}`);
        });
        console.log(`   → These will be MANDATORY for PRIMARY/SECONDARY color assignment\n`);
    } else {
        console.log(`\n⚠️  No logo colors found - will use frequency-based color assignment\n`);
    }
    
    console.log(`Processing crawled data with ${hasScreenshots ? 'two-step (normalize + validate)' : 'single-step (normalize only)'} process`);
    
    try {
        // Step 1: Normalize design tokens (no image)
        console.log("Step 1: Normalizing design tokens...");
        const normalizedData = await normalizeDesignTokens(crawledData, format, brandStatement);
        
        // Step 2: Validate with screenshots (if available)
        if (hasScreenshots) {
            console.log("Step 2: Validating color roles with screenshots...");
            const validatedData = await validateWithScreenshot(
                normalizedData, 
                crawledData.screenshots, 
                format, 
                brandStatement
            );
            
            // Normalize tone
            if (validatedData.tone && typeof validatedData.tone === 'string') {
                const validTones = ['professional', 'modern', 'friendly', 'luxury', 'playful'];
                if (validatedData.tone.includes('|')) {
                    const tones = validatedData.tone.split('|').map(t => t.trim().toLowerCase());
                    validatedData.tone = tones.find(t => validTones.includes(t)) || validTones[0];
                } else {
                    const normalizedTone = validatedData.tone.trim().toLowerCase();
                    validatedData.tone = validTones.includes(normalizedTone) ? normalizedTone : validTones[0];
                }
            }
            
            return validatedData;
        } else {
            // No screenshots, use normalized data directly
            // Normalize tone
            if (normalizedData.tone && typeof normalizedData.tone === 'string') {
                const validTones = ['professional', 'modern', 'friendly', 'luxury', 'playful'];
                if (normalizedData.tone.includes('|')) {
                    const tones = normalizedData.tone.split('|').map(t => t.trim().toLowerCase());
                    normalizedData.tone = tones.find(t => validTones.includes(t)) || validTones[0];
                } else {
                    const normalizedTone = normalizedData.tone.trim().toLowerCase();
                    normalizedData.tone = validTones.includes(normalizedTone) ? normalizedTone : validTones[0];
                }
            }
            
            return {
                colors: normalizedData.colors_normalized,
                fonts: normalizedData.fonts_normalized,
                tone: normalizedData.tone,
                borders: normalizedData.borders,
                shadows: normalizedData.shadows
            };
        }
        
    } catch (error) {
        console.error("Error processing crawled data with LLM:", error.message);
        // Return fallback using extracted data directly
        const topColors = crawledData.colors_ranked?.slice(0, 5) || [];
        return {
            colors: {
                primary: topColors[0]?.color || "#1E40AF",
                secondary: topColors[1]?.color || "#64748B",
                accent: topColors[2]?.color || "#FACC15",
                background: "#FFFFFF",
                text: "#1F2937"
            },
            fonts: {
                heading: crawledData.heading_fonts_ranked?.[0]?.font || "Poppins",
                body: crawledData.body_fonts_ranked?.[0]?.font || "Inter"
            },
            tone: crawledData.extracted_tone || "professional"
        };
    }
}
