/**
 * Extract dominant colors from an image buffer using median cut algorithm
 * @param {Buffer} imageBuffer - PNG image buffer
 * @param {number} maxColors - Maximum number of colors to extract (default: 3)
 * @returns {Promise<Array<string>>} Array of hex color codes
 * 
 * CRITICAL FILTERING RULES:
 * 1. Reject transparent pixels (alpha < 220)
 * 2. Reject grayscale pixels (saturation < 12)
 * 3. Use median cut, not naive k-means (k-means collapses saturated + neutral colors)
 */
export async function extractColorsFromImage(imageBuffer, maxColors = 3) {
    try {
        // For production, use sharp library: npm install sharp
        // Then implement proper pixel extraction with filtering:
        //
        // const sharp = require('sharp');
        // const { data, info } = await sharp(imageBuffer)
        //   .raw()
        //   .toBuffer({ resolveWithObject: true });
        //
        // const pixels = [];
        // for (let i = 0; i < data.length; i += 4) {
        //   const r = data[i];
        //   const g = data[i + 1];
        //   const b = data[i + 2];
        //   const alpha = data[i + 3];
        //
        //   // CRITICAL: Reject transparent pixels
        //   if (alpha < 220) continue;
        //
        //   // CRITICAL: Reject grayscale pixels
        //   const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        //   if (saturation < 12) continue;
        //
        //   pixels.push({ r, g, b });
        // }
        //
        // Then use median cut algorithm to cluster (not k-means)
        // Limit clusters to 3 for logo colors
        
        console.warn("⚠️  Pixel-based color extraction requires sharp library");
        console.warn("   Install: npm install sharp");
        console.warn("   Then implement with proper filtering (alpha < 220, saturation < 12)");
        
        return [];
    } catch (error) {
        console.error("Error extracting colors from image:", error.message);
        return [];
    }
}

/**
 * Calculate color saturation (0-1)
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Saturation value
 */
export function getSaturation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
}

/**
 * Check if color is near white or black (should be filtered)
 * @param {string} hexColor - Hex color code
 * @returns {boolean} True if color should be filtered
 */
export function isNearWhiteOrBlack(hexColor) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return true;
    
    const { r, g, b } = rgb;
    const brightness = (r + g + b) / 3;
    
    // Filter near-white (brightness > 240) and near-black (brightness < 15)
    return brightness > 240 || brightness < 15;
}

/**
 * Convert hex to RGB
 * @param {string} hex - Hex color code
 * @returns {Object|null} {r, g, b} or null
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Convert RGB to hex
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color code
 */
export function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

/**
 * Classify logo colors by role
 * @param {Array<string>} colors - Array of hex colors
 * @returns {Object} {primary, secondary, accent}
 */
export function classifyLogoColors(colors) {
    if (!colors || colors.length === 0) {
        return { primary: null, secondary: null, accent: null };
    }
    
    // Calculate saturation for each color
    const colorsWithSaturation = colors.map(color => {
        const rgb = hexToRgb(color);
        if (!rgb) return null;
        return {
            color,
            saturation: getSaturation(rgb.r, rgb.g, rgb.b),
            brightness: (rgb.r + rgb.g + rgb.b) / 3
        };
    }).filter(Boolean);
    
    // Sort by saturation (highest = primary)
    colorsWithSaturation.sort((a, b) => b.saturation - a.saturation);
    
    return {
        primary: colorsWithSaturation[0]?.color || colors[0],
        secondary: colorsWithSaturation[1]?.color || (colors.length > 1 ? colors[1] : null),
        accent: colorsWithSaturation[2]?.color || (colors.length > 2 ? colors[2] : null)
    };
}
