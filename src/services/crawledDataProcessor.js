import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFormatSizing } from "../utils/formatSizing.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Process crawled website data through LLM to adapt it for specific format
 * @param {Object} crawledData - Data extracted from website
 * @param {string} format - Target post format
 * @param {string} brandStatement - Brand statement (if provided)
 * @returns {Promise<Object>} Processed and adapted brand data
 */
export async function processCrawledData(crawledData, format, brandStatement = "") {
    const formatSizing = getFormatSizing(format);
    
    const prompt = `You are a brand design expert. Analyze the following website data and adapt it for a "${format}" format post.

**Extracted Website Data:**
- Brand Name: ${crawledData.brand_name || "Not found"}
- Brand Statement: ${brandStatement || crawledData.brand_statement || "Not provided"}
- Colors Found: ${crawledData.extracted_colors?.join(", ") || "None"}
- Fonts Found: ${crawledData.extracted_fonts?.join(", ") || "None"}
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
Analyze the website's brand identity and adapt it for the "${format}" format. Return a JSON object with:

1. **Colors**: Select the most appropriate colors from the extracted colors (or suggest new ones if needed) that work well for "${format}"
   - Primary: Main brand color
   - Secondary: Supporting color
   - Accent: Highlight color
   - Background: Usually white or light
   - Text: Usually dark

2. **Fonts**: Choose the best fonts from extracted fonts (or suggest modern alternatives)
   - Heading font: For titles/headings
   - Body font: For body text

3. **Tone**: Confirm or adjust the detected tone based on the brand

4. **Spacing**: Adapt spacing values to work with the format requirements while maintaining brand consistency

5. **Borders**: Extract border radius, width, and style from the website (if found)

6. **Shadows**: Extract shadow properties (x, y, blur, color) from the website (if found)

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
  "spacing_notes": "Brief explanation of spacing adaptation"
}

IMPORTANT:
- Use the EXACT format sizing requirements provided above
- Adapt the website's brand identity to work with "${format}" constraints
- If extracted colors are not suitable, suggest complementary colors
- If extracted fonts are not available, suggest similar modern alternatives
- Return ONLY valid JSON, no markdown or code blocks
`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        // Extract text from response
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
            throw new Error("No text content found in LLM response");
        }
        
        // Clean up markdown code blocks
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON
        let processedData;
        try {
            processedData = JSON.parse(responseText);
        } catch (parseError) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    processedData = JSON.parse(jsonMatch[0]);
                } catch (secondError) {
                    // Clean up common JSON issues
                    let cleanedJson = jsonMatch[0]
                        .replace(/,(\s*[}\]])/g, '$1')
                        .replace(/\/\/.*$/gm, '')
                        .replace(/\/\*[\s\S]*?\*\//g, '')
                        .replace(/[\x00-\x1F\x7F]/g, '');
                    processedData = JSON.parse(cleanedJson);
                }
            } else {
                throw new Error("No valid JSON found in LLM response");
            }
        }
        
        // Normalize tone
        if (processedData.tone && typeof processedData.tone === 'string') {
            const validTones = ['professional', 'modern', 'friendly', 'luxury', 'playful'];
            if (processedData.tone.includes('|')) {
                const tones = processedData.tone.split('|').map(t => t.trim().toLowerCase());
                processedData.tone = tones.find(t => validTones.includes(t)) || validTones[0];
            } else {
                const normalizedTone = processedData.tone.trim().toLowerCase();
                processedData.tone = validTones.includes(normalizedTone) ? normalizedTone : validTones[0];
            }
        }
        
        return processedData;
        
    } catch (error) {
        console.error("Error processing crawled data with LLM:", error.message);
        // Return fallback using extracted data directly
        return {
            colors: {
                primary: crawledData.extracted_colors?.[0] || "#1E40AF",
                secondary: crawledData.extracted_colors?.[1] || "#64748B",
                accent: crawledData.extracted_colors?.[2] || "#FACC15",
                background: "#FFFFFF",
                text: "#1F2937"
            },
            fonts: {
                heading: crawledData.extracted_fonts?.[0] || "Poppins",
                body: crawledData.extracted_fonts?.[1] || "Inter"
            },
            tone: crawledData.extracted_tone || "professional"
        };
    }
}
