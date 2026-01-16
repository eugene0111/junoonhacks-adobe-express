import axios from 'axios';
import { classifyLogoColors, hexToRgb, getSaturation } from '../utils/colorExtractor.js';

/**
 * Search for company logo on the internet and extract brand colors
 * @param {string} brandName - Company/brand name
 * @param {string} websiteUrl - Optional website URL for context
 * @returns {Promise<Object>} Logo colors and metadata
 */
export async function searchLogoAndExtractColors(brandName, websiteUrl = null) {
    if (!brandName || brandName.trim() === '') {
        return null;
    }

    console.log(`\n🔍 Searching internet for logo: "${brandName}"`);

    try {
        // Strategy 1: Try Clearbit Logo API (free tier: 1000 requests/month)
        let logoUrl = await tryClearbitLogo(brandName, websiteUrl);
        
        // Strategy 2: Try common logo paths on the website
        if (!logoUrl && websiteUrl) {
            logoUrl = await tryCommonLogoPaths(websiteUrl);
        }
        
        // Strategy 3: Try Google Custom Search (if API key available)
        if (!logoUrl) {
            logoUrl = await tryGoogleImageSearch(brandName);
        }

        if (!logoUrl) {
            console.log(`   ⚠️  Could not find logo URL for "${brandName}"`);
            return null;
        }

        console.log(`   ✅ Found logo at: ${logoUrl}`);

        // Download and extract colors from logo
        const colors = await extractColorsFromLogoImage(logoUrl);
        
        if (colors && colors.length > 0) {
            console.log(`   🎨 Extracted ${colors.length} color(s) from logo:`);
            colors.forEach((color, index) => {
                console.log(`      ${index + 1}. ${color}`);
            });
            
            // Classify colors by role
            const classified = classifyLogoColors(colors);
            
            return {
                logo_url: logoUrl,
                colors: colors,
                primary: classified.primary,
                secondary: classified.secondary,
                accent: classified.accent,
                source: 'internet_search'
            };
        }

        return null;
    } catch (error) {
        console.warn(`   ⚠️  Error searching for logo: ${error.message}`);
        return null;
    }
}

/**
 * Try Clearbit Logo API
 */
async function tryClearbitLogo(brandName, websiteUrl) {
    try {
        // Clean domain from URL if provided
        let domain = null;
        if (websiteUrl) {
            try {
                const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
                domain = url.hostname.replace('www.', '');
            } catch (e) {
                // Invalid URL, skip
            }
        }

        // Try with domain first (more reliable)
        if (domain) {
            const clearbitUrl = `https://logo.clearbit.com/${domain}`;
            const response = await axios.head(clearbitUrl, { timeout: 5000 });
            if (response.status === 200) {
                console.log(`   ✅ Found logo via Clearbit (domain: ${domain})`);
                return clearbitUrl;
            }
        }

        // Fallback: try with brand name (less reliable)
        // Note: Clearbit works best with domains, but we can try
        return null;
    } catch (error) {
        // Logo not found or API unavailable
        return null;
    }
}

/**
 * Try common logo paths on the website
 */
async function tryCommonLogoPaths(websiteUrl) {
    try {
        const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
        const baseUrl = `${url.protocol}//${url.hostname}`;
        
        const commonPaths = [
            '/logo.png',
            '/logo.svg',
            '/images/logo.png',
            '/images/logo.svg',
            '/assets/logo.png',
            '/assets/logo.svg',
            '/static/logo.png',
            '/static/logo.svg',
            '/img/logo.png',
            '/img/logo.svg',
            '/logo/logo.png',
            '/logo/logo.svg'
        ];

        for (const path of commonPaths) {
            try {
                const logoUrl = `${baseUrl}${path}`;
                const response = await axios.head(logoUrl, { timeout: 3000 });
                if (response.status === 200) {
                    console.log(`   ✅ Found logo at common path: ${path}`);
                    return logoUrl;
                }
            } catch (e) {
                // Continue to next path
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Try Google Custom Search API (requires API key)
 */
async function tryGoogleImageSearch(brandName) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
        // API keys not configured, skip
        return null;
    }

    try {
        const searchQuery = `${brandName} logo site:${brandName.toLowerCase().replace(/\s+/g, '')}.com OR site:${brandName.toLowerCase().replace(/\s+/g, '')}.org`;
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&searchType=image&num=1`;
        
        const response = await axios.get(searchUrl, { timeout: 5000 });
        
        if (response.data?.items && response.data.items.length > 0) {
            const logoUrl = response.data.items[0].link;
            console.log(`   ✅ Found logo via Google Image Search`);
            return logoUrl;
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Download logo image and extract dominant colors
 * Uses a simple approach: download image, convert to data URL, analyze in browser context
 * For production, use sharp library for better color extraction
 */
async function extractColorsFromLogoImage(logoUrl) {
    try {
        // Download image
        const response = await axios.get(logoUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Check if it's an SVG (text-based, can extract colors directly)
        const contentType = response.headers['content-type'] || '';
        const isSvg = contentType.includes('svg') || logoUrl.endsWith('.svg');

        if (isSvg) {
            // Parse SVG to extract fill/stroke colors
            const svgText = Buffer.from(response.data).toString('utf-8');
            return extractColorsFromSvg(svgText);
        } else {
            // For raster images (PNG, JPG), we need image processing
            // For now, return empty - in production, use sharp library
            console.log(`   ⚠️  Raster image detected (${contentType}) - pixel extraction requires sharp library`);
            console.log(`   💡 Install sharp: npm install sharp`);
            console.log(`   💡 Then implement k-means clustering for color extraction`);
            return null;
        }
    } catch (error) {
        console.warn(`   ⚠️  Could not download/process logo: ${error.message}`);
        return null;
    }
}

/**
 * Extract colors from SVG text
 * NOTE: This is a fallback for downloaded SVGs. For in-page SVGs, 
 * we use getComputedStyle() which is more accurate.
 * This method tries to extract from attributes and inline styles.
 */
function extractColorsFromSvg(svgText) {
    const colors = new Map();
    
    // Extract fill and stroke attributes
    const fillMatches = svgText.match(/fill=["']([^"']+)["']/gi);
    const strokeMatches = svgText.match(/stroke=["']([^"']+)["']/gi);
    const styleMatches = svgText.match(/style=["'][^"']*["']/gi);

    // Process fill attributes
    if (fillMatches) {
        fillMatches.forEach(match => {
            const color = match.match(/fill=["']([^"']+)["']/i)?.[1];
            if (color && color !== 'none' && color !== 'transparent' && !color.startsWith('url(')) {
                const normalized = normalizeColorString(color);
                if (normalized) {
                    colors.set(normalized, (colors.get(normalized) || 0) + 1);
                }
            }
        });
    }

    // Process stroke attributes
    if (strokeMatches) {
        strokeMatches.forEach(match => {
            const color = match.match(/stroke=["']([^"']+)["']/i)?.[1];
            if (color && color !== 'none' && color !== 'transparent' && !color.startsWith('url(')) {
                const normalized = normalizeColorString(color);
                if (normalized) {
                    colors.set(normalized, (colors.get(normalized) || 0) + 1);
                }
            }
        });
    }

    // Process style attributes
    if (styleMatches) {
        styleMatches.forEach(match => {
            const fillMatch = match.match(/fill:\s*([^;]+)/i);
            const strokeMatch = match.match(/stroke:\s*([^;]+)/i);
            
            [fillMatch?.[1], strokeMatch?.[1]].forEach(color => {
                if (color && color.trim() !== 'none' && color.trim() !== 'transparent') {
                    const normalized = normalizeColorString(color.trim());
                    if (normalized) {
                        colors.set(normalized, (colors.get(normalized) || 0) + 1);
                    }
                }
            });
        });
    }

    // Return sorted by frequency (most common first)
    return [...colors.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color)
        .filter(Boolean);
}

/**
 * Normalize color string to hex format
 */
function normalizeColorString(color) {
    if (!color) return null;
    
    color = color.trim();
    
    // Already hex
    if (color.startsWith('#')) {
        return color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color;
    }
    
    // RGB/RGBA
    if (color.startsWith('rgb')) {
        const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return `#${[r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('')}`;
        }
    }
    
    // Named colors (basic set)
    const namedColors = {
        'black': '#000000',
        'white': '#FFFFFF',
        'red': '#FF0000',
        'green': '#008000',
        'blue': '#0000FF',
        'yellow': '#FFFF00',
        'orange': '#FFA500',
        'purple': '#800080',
        'pink': '#FFC0CB',
        'gray': '#808080',
        'grey': '#808080'
    };
    
    if (namedColors[color.toLowerCase()]) {
        return namedColors[color.toLowerCase()];
    }
    
    return null;
}
