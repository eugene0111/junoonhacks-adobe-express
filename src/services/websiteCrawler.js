import { chromium } from "playwright";
import { searchLogoAndExtractColors } from "./logoSearchService.js";

/**
 * Crawl a website to extract brand information using Playwright
 * @param {string} url - Website URL to crawl
 * @returns {Promise<Object>} Extracted brand data
 */
export async function crawlWebsite(url) {
    let browser;
    
    try {
        // Validate and normalize URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Launch browser
        browser = await chromium.launch({
            headless: true
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });

        const page = await context.newPage();
        
        // Navigate to page with better error handling
        try {
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
        } catch (error) {
            // If networkidle fails, try with domcontentloaded
            console.warn(`⚠️  networkidle failed, trying domcontentloaded: ${error.message}`);
            try {
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
            } catch (retryError) {
                console.error(`❌ Failed to load page: ${retryError.message}`);
                throw new Error(`Failed to load website: ${retryError.message}`);
            }
        }

        // Wait for page to be fully loaded
        await page.waitForTimeout(2000);

        // Get viewport dimensions
        const viewport = await page.viewportSize();
        const viewportWidth = viewport?.width || 1920;
        const viewportHeight = viewport?.height || 1080;

        // Take multiple screenshots for better coverage
        const screenshots = {};
        
        // Hero section (top of page)
        try {
            const heroScreenshot = await page.screenshot({
                type: 'png',
                clip: { x: 0, y: 0, width: viewportWidth, height: Math.min(800, viewportHeight) }
            });
            screenshots.hero = heroScreenshot.toString('base64');
            console.log(`Hero screenshot captured: ${(screenshots.hero.length / 1024).toFixed(2)} KB (base64)`);
        } catch (error) {
            console.warn(`⚠️  Could not capture hero screenshot: ${error.message}`);
        }

        // Scroll to middle
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(1000);
        
        // Footer section
        try {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1000);
            
            // Get scroll dimensions safely
            const pageDimensions = await page.evaluate(() => ({
                scrollHeight: Math.max(document.body.scrollHeight, window.innerHeight),
                viewportHeight: window.innerHeight
            }));
            
            // Calculate footer screenshot bounds safely
            const footerHeight = Math.min(800, viewportHeight);
            const footerY = Math.max(0, Math.min(pageDimensions.scrollHeight - footerHeight, pageDimensions.scrollHeight - viewportHeight));
            
            if (footerHeight > 10 && footerY >= 0 && footerY + footerHeight <= pageDimensions.scrollHeight) {
                const footerScreenshot = await page.screenshot({
                    type: 'png',
                    clip: { x: 0, y: footerY, width: viewportWidth, height: footerHeight }
                });
                screenshots.footer = footerScreenshot.toString('base64');
                console.log(`Footer screenshot captured: ${(screenshots.footer.length / 1024).toFixed(2)} KB (base64)`);
            } else {
                console.warn(`⚠️  Footer screenshot skipped - invalid dimensions (y: ${footerY}, height: ${footerHeight}, scrollHeight: ${pageDimensions.scrollHeight})`);
            }
        } catch (error) {
            console.warn(`⚠️  Could not capture footer screenshot: ${error.message}`);
        }

        // Extract brand information using Playwright's evaluate
        const extractedData = await page.evaluate(() => {
            const data = {
                brand_name: '',
                brand_statement: '',
                colors: {}, // Frequency-weighted colors
                colors_by_context: {}, // Track color usage context
                headingFonts: {}, // Frequency-weighted heading fonts
                bodyFonts: {}, // Frequency-weighted body fonts
                fontSizes: {},
                spacing: {},
                borders: {},
                shadows: {},
                tone: '',
                logo_colors: [] // Colors extracted from logo
            };

            // Extract brand name
            const h1 = document.querySelector('h1');
            const title = document.querySelector('title');
            if (h1) {
                data.brand_name = h1.textContent?.trim() || '';
            } else if (title) {
                data.brand_name = title.textContent.split('|')[0].trim() || title.textContent.split('-')[0].trim();
            }

            // Extract brand statement
            const metaDesc = document.querySelector('meta[name="description"]');
            const metaOgDesc = document.querySelector('meta[property="og:description"]');
            if (metaOgDesc) {
                data.brand_statement = metaOgDesc.getAttribute('content') || '';
            } else if (metaDesc) {
                data.brand_statement = metaDesc.getAttribute('content') || '';
            }

            // Helper function to normalize color
            const normalizeColor = (color) => {
                if (!color) return null;
                // Convert rgba/rgb to hex if needed
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
                return color;
            };

            // Helper function to track color with frequency and context
            const trackColor = (color, context) => {
                const normalized = normalizeColor(color);
                if (!normalized || 
                    normalized === 'rgba(0, 0, 0, 0)' || 
                    normalized === 'transparent' ||
                    normalized === 'inherit' ||
                    normalized.startsWith('var(')) {
                    return;
                }
                
                if (!data.colors[normalized]) {
                    data.colors[normalized] = 0;
                    data.colors_by_context[normalized] = [];
                }
                data.colors[normalized]++;
                if (context && !data.colors_by_context[normalized].includes(context)) {
                    data.colors_by_context[normalized].push(context);
                }
            };

            // Helper function to normalize font name (handle variable fonts)
            const normalizeFont = (fontFamily) => {
                if (!fontFamily) return null;
                // Remove quotes
                let font = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                // Handle variable fonts: "Inter var" -> "Inter", "Roboto Flex" -> "Roboto"
                if (font.includes(' var')) {
                    font = font.replace(' var', '');
                }
                if (font.includes('Flex')) {
                    font = font.replace(' Flex', '');
                }
                // Filter out generic fonts
                if (font.includes('serif') || font.includes('sans-serif') || 
                    font.includes('monospace') || font === 'inherit' || 
                    font.startsWith('var(')) {
                    return null;
                }
                return font;
            };

            // Helper function to parse size
            const parseSize = (value) => {
                if (!value) return null;
                const match = value.match(/(\d+\.?\d*)/);
                if (match) {
                    const num = parseFloat(match[1]);
                    if (value.includes('em') || value.includes('rem')) {
                        return Math.round(num * 16);
                    }
                    return Math.round(num);
                }
                return null;
            };

            // Helper function to parse RGB from hex
            const parseRgbFromHex = (hex) => {
                if (!hex || !hex.startsWith('#')) return null;
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : null;
            };

            // 1. Extract CSS variables from :root (HIGH PRIORITY)
            const rootStyles = getComputedStyle(document.documentElement);
            const cssVars = {};
            
            for (let i = 0; i < rootStyles.length; i++) {
                const prop = rootStyles[i];
                if (prop.startsWith('--')) {
                    const val = rootStyles.getPropertyValue(prop).trim();
                    if (val && (val.startsWith('#') || val.startsWith('rgb'))) {
                        cssVars[prop] = val;
                    }
                }
            }

            // Categorize CSS variables by name patterns
            Object.keys(cssVars).forEach(varName => {
                const varNameLower = varName.toLowerCase();
                const color = normalizeColor(cssVars[varName]);
                if (!color) return;

                // High priority: primary, brand, accent, main
                if (varNameLower.includes('primary') || varNameLower.includes('brand') || 
                    varNameLower.includes('accent') || varNameLower.includes('main')) {
                    trackColor(color, 'css-primary');
                    // Boost frequency for CSS variables (they're design tokens)
                    data.colors[color] = (data.colors[color] || 0) + 5;
                }
                // Background
                else if (varNameLower.includes('bg') || varNameLower.includes('background')) {
                    trackColor(color, 'css-background');
                    data.colors[color] = (data.colors[color] || 0) + 3;
                }
                // Text/foreground
                else if (varNameLower.includes('text') || varNameLower.includes('foreground')) {
                    trackColor(color, 'css-text');
                    data.colors[color] = (data.colors[color] || 0) + 3;
                }
                // Secondary
                else if (varNameLower.includes('secondary')) {
                    trackColor(color, 'css-secondary');
                    data.colors[color] = (data.colors[color] || 0) + 4;
                }
                // Default: track as CSS variable
                else {
                    trackColor(color, 'css-var');
                    data.colors[color] = (data.colors[color] || 0) + 2;
                }
            });

            // 2. Extract logo using priority-based scoring system (PRODUCTION-GRADE)
            function scoreLogo(el) {
                let score = 0;
                
                const rect = el.getBoundingClientRect();
                const area = rect.width * rect.height;
                
                // SVG logos are highest quality
                if (el.tagName === 'SVG') score += 50;
                
                // Logo-sized elements (not too small, not too large)
                if (area > 2000 && area < 200000) score += 20;
                
                // Above the fold (top 40% of viewport)
                if (rect.top < window.innerHeight * 0.4) score += 15;
                
                // Left aligned (left 40% of viewport)
                if (rect.left < window.innerWidth * 0.4) score += 10;
                
                // Semantic hints
                const cls = (el.className || '').toString().toLowerCase();
                const alt = (el.getAttribute('alt') || '').toLowerCase();
                const id = (el.id || '').toString().toLowerCase();
                if (cls.includes('logo') || alt.includes('logo') || id.includes('logo')) score += 30;
                if (cls.includes('brand') || alt.includes('brand') || id.includes('brand')) score += 20;
                
                return score;
            }
            
            // Priority-based logo discovery pipeline
            const logoCandidates = [
                'header svg',
                'header img',
                'nav svg',
                'nav img',
                'img[alt*="logo" i]',
                'img[class*="logo" i]',
                'svg[class*="logo" i]',
                'a[href="/"] img',
                'a[href="/"] svg',
                '[id*="logo" i]',
                '[class*="logo" i]'
            ];
            
            let bestLogo = null;
            let bestScore = 0;
            
            logoCandidates.forEach(sel => {
                try {
                    document.querySelectorAll(sel).forEach(el => {
                        const s = scoreLogo(el);
                        if (s > bestScore) {
                            bestScore = s;
                            bestLogo = el;
                        }
                    });
                } catch (e) {
                    // Skip invalid selectors
                }
            });
            
            // Extract logo information
            if (bestLogo && bestScore > 30) { // Minimum threshold
                const rect = bestLogo.getBoundingClientRect();
                const logoInfo = {
                    type: bestLogo.tagName.toLowerCase(),
                    score: bestScore,
                    boundingBox: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    },
                    colors: []
                };
                
                // Extract colors based on logo type
                if (bestLogo.tagName === 'SVG') {
                    // SVG logo - extract colors from COMPUTED STYLES (not attributes)
                    // This correctly handles CSS-applied colors
                    function extractSvgColors(svg) {
                        const colors = new Map();
                        
                        svg.querySelectorAll('*').forEach(el => {
                            const style = window.getComputedStyle(el);
                            const fill = style.fill;
                            const stroke = style.stroke;
                            
                            [fill, stroke].forEach(c => {
                                if (c && 
                                    c !== 'none' && 
                                    c !== 'transparent' && 
                                    !c.startsWith('url(') &&
                                    (c.startsWith('rgb') || c.startsWith('#'))) {
                                    const normalized = normalizeColor(c);
                                    if (normalized) {
                                        colors.set(normalized, (colors.get(normalized) || 0) + 1);
                                    }
                                }
                            });
                        });
                        
                        // Return sorted by frequency (most common first)
                        return [...colors.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .map(([color]) => color);
                    }
                    
                    logoInfo.colors = extractSvgColors(bestLogo);
                } else if (bestLogo.tagName === 'IMG') {
                    // Image logo - will be processed via screenshot later
                    // Store for Node-side processing
                    logoInfo.sourceUrl = bestLogo.src || bestLogo.getAttribute('src');
                    logoInfo.needsPixelExtraction = true;
                }
                
                // Also check computed styles for additional colors
                const logoStyle = window.getComputedStyle(bestLogo);
                const styleColors = [
                    normalizeColor(logoStyle.fill),
                    normalizeColor(logoStyle.stroke),
                    normalizeColor(logoStyle.color)
                ].filter(Boolean);
                
                styleColors.forEach(color => {
                    if (!logoInfo.colors.includes(color)) {
                        logoInfo.colors.push(color);
                    }
                });
                
                // Store logo info for later processing
                data.logo_info = logoInfo;
                
                // Track logo colors with maximum priority
                logoInfo.colors.forEach(color => {
                    trackColor(color, 'logo');
                    // Boost logo colors MASSIVELY (they're the most brand-defining colors)
                    data.colors[color] = (data.colors[color] || 0) + 50;
                    if (!data.logo_colors.includes(color)) {
                        data.logo_colors.push(color);
                    }
                });
                
                console.log(`\n🎯 LOGO FOUND! Type: ${logoInfo.type}, Score: ${bestScore}`);
                console.log(`   Colors extracted: ${logoInfo.colors.length}`);
                console.log(`   LOGO COLORS RAW:`, logoInfo.colors);
                
                // Log extracted colors (no hardcoded color assumptions)
                logoInfo.colors.forEach((color, index) => {
                    console.log(`   ${index + 1}. ${color}`);
                });
                if (logoInfo.needsPixelExtraction) {
                    console.log(`   ⚠️  Image logo detected - will extract colors from screenshot`);
                }
                console.log(`   These colors will be prioritized for PRIMARY/SECONDARY assignment\n`);
            } else {
                console.log('⚠️  No logo element found (score threshold not met) - proceeding without logo colors');
            }

            // 3. Sample representative elements (buttons, links, CTAs)
            const importantSelectors = [
                { selector: 'header a', context: 'header-link' },
                { selector: 'nav a', context: 'nav-link' },
                { selector: 'button', context: 'button' },
                { selector: '[role="button"]', context: 'button' },
                { selector: 'a[href]', context: 'link' },
                { selector: '.btn', context: 'button' },
                { selector: '.cta', context: 'cta' },
                { selector: '[class*="cta" i]', context: 'cta' },
                { selector: 'footer a', context: 'footer-link' },
                { selector: 'svg path', context: 'icon' },
                { selector: 'svg rect', context: 'icon' }
            ];

            importantSelectors.forEach(({ selector, context }) => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    const bgColor = normalizeColor(style.backgroundColor);
                    const textColor = normalizeColor(style.color);
                    const borderColor = normalizeColor(style.borderColor);
                    const fillColor = el.tagName === 'path' || el.tagName === 'rect' 
                        ? normalizeColor(style.fill) : null;

                    [bgColor, textColor, borderColor, fillColor].forEach(color => {
                        if (color) {
                            trackColor(color, context);
                        }
                    });
                });
            });

            // 4. Extract fonts - distinguish heading vs body
            const headingSelectors = [
                ...document.querySelectorAll('h1'),
                ...document.querySelectorAll('h2'),
                ...document.querySelectorAll('h3'),
                ...document.querySelectorAll('.title'),
                ...document.querySelectorAll('.heading'),
                ...document.querySelectorAll('.hero'),
                ...document.querySelectorAll('[class*="heading" i]')
            ];

            const bodySelectors = [
                ...document.querySelectorAll('p'),
                ...document.querySelectorAll('li'),
                ...document.querySelectorAll('.content'),
                ...document.querySelectorAll('.text'),
                ...document.querySelectorAll('[class*="body" i]'),
                document.querySelector('body')
            ];

            const headingSizes = { h1: [], h2: [], h3: [] };
            const bodySizes = [];

            // Process heading fonts
            headingSelectors.forEach(el => {
                const fontFamily = normalizeFont(window.getComputedStyle(el).fontFamily);
                const fontSize = parseSize(window.getComputedStyle(el).fontSize);
                
                if (fontFamily) {
                    data.headingFonts[fontFamily] = (data.headingFonts[fontFamily] || 0) + 1;
                }
                
                if (fontSize && fontSize > 0 && fontSize < 200) {
                    const tagName = el.tagName.toLowerCase();
                    if (tagName === 'h1') {
                        headingSizes.h1.push(fontSize);
                    } else if (tagName === 'h2') {
                        headingSizes.h2.push(fontSize);
                    } else if (tagName === 'h3') {
                        headingSizes.h3.push(fontSize);
                    }
                }
            });

            // Process body fonts
            bodySelectors.forEach(el => {
                const fontFamily = normalizeFont(window.getComputedStyle(el).fontFamily);
                const fontSize = parseSize(window.getComputedStyle(el).fontSize);
                
                if (fontFamily) {
                    data.bodyFonts[fontFamily] = (data.bodyFonts[fontFamily] || 0) + 1;
                }
                
                if (fontSize && fontSize > 0 && fontSize < 200) {
                    bodySizes.push(fontSize);
                    data.fontSizes[fontSize] = (data.fontSizes[fontSize] || 0) + 1;
                }
            });

            // 5. Extract spacing, borders, shadows ONLY from UI elements (buttons, cards, modals)
            const uiElements = document.querySelectorAll('button, .card, .modal, [class*="card" i], [class*="modal" i], [class*="button" i]');
            
            uiElements.forEach(el => {
                const style = window.getComputedStyle(el);
                
                // Spacing
                const padding = style.padding;
                const margin = style.margin;
                const gap = style.gap;
                
                [padding, margin, gap].forEach(value => {
                    if (value) {
                        const matches = value.match(/(\d+\.?\d*)/g);
                        if (matches) {
                            matches.forEach(m => {
                                const num = Math.round(parseFloat(m));
                                if (num > 0 && num < 200) {
                                    data.spacing[num] = (data.spacing[num] || 0) + 1;
                                }
                            });
                        }
                    }
                });

                // Borders
                const borderRadius = parseSize(style.borderRadius);
                const borderWidth = parseSize(style.borderWidth);
                const borderStyle = style.borderStyle;
                
                if (borderRadius !== null && borderRadius >= 0) {
                    data.borders[`radius:${borderRadius}`] = (data.borders[`radius:${borderRadius}`] || 0) + 1;
                }
                if (borderWidth !== null && borderWidth >= 0) {
                    data.borders[`width:${borderWidth}`] = (data.borders[`width:${borderWidth}`] || 0) + 1;
                }
                if (borderStyle && borderStyle !== 'none') {
                    data.borders[`style:${borderStyle}`] = (data.borders[`style:${borderStyle}`] || 0) + 1;
                }

                // Shadows
                const boxShadow = style.boxShadow;
                if (boxShadow && boxShadow !== 'none') {
                    const shadowMatch = boxShadow.match(/([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+(.+)/);
                    if (shadowMatch) {
                        const x = Math.round(parseFloat(shadowMatch[1]));
                        const y = Math.round(parseFloat(shadowMatch[2]));
                        const blur = Math.round(parseFloat(shadowMatch[3]));
                        const color = shadowMatch[4].trim();
                        
                        const shadowKey = `x:${x},y:${y},blur:${blur},color:${color}`;
                        data.shadows[shadowKey] = (data.shadows[shadowKey] || 0) + 1;
                    }
                }
            });

            // Determine tone from content
            const bodyText = document.body?.textContent?.toLowerCase() || '';
            const toneKeywords = {
                professional: ['business', 'enterprise', 'corporate', 'professional', 'solutions', 'services', 'company'],
                modern: ['modern', 'innovative', 'cutting-edge', 'tech', 'digital', 'technology', 'future'],
                friendly: ['friendly', 'welcome', 'community', 'together', 'family', 'warm', 'help'],
                luxury: ['luxury', 'premium', 'exclusive', 'elite', 'sophisticated', 'prestigious', 'refined'],
                playful: ['fun', 'playful', 'creative', 'exciting', 'adventure', 'energetic', 'vibrant']
            };

            let maxScore = 0;
            let detectedTone = 'professional';
            Object.keys(toneKeywords).forEach(tone => {
                const score = toneKeywords[tone].reduce((acc, keyword) => {
                    return acc + (bodyText.includes(keyword) ? 1 : 0);
                }, 0);
                if (score > maxScore) {
                    maxScore = score;
                    detectedTone = tone;
                }
            });

            data.tone = detectedTone;

            // Calculate average sizes
            const avgH1 = headingSizes.h1.length > 0 
                ? Math.round(headingSizes.h1.reduce((a, b) => a + b, 0) / headingSizes.h1.length)
                : null;
            const avgH2 = headingSizes.h2.length > 0 
                ? Math.round(headingSizes.h2.reduce((a, b) => a + b, 0) / headingSizes.h2.length)
                : null;
            const avgH3 = headingSizes.h3.length > 0 
                ? Math.round(headingSizes.h3.reduce((a, b) => a + b, 0) / headingSizes.h3.length)
                : null;
            const avgBody = bodySizes.length > 0 
                ? Math.round(bodySizes.reduce((a, b) => a + b, 0) / bodySizes.length)
                : null;

            // Sort colors by frequency
            const colorsRanked = Object.entries(data.colors)
                .map(([color, count]) => ({
                    color,
                    count,
                    contexts: data.colors_by_context[color] || []
                }))
                .sort((a, b) => b.count - a.count);

            // Sort fonts by frequency
            const headingFontsRanked = Object.entries(data.headingFonts)
                .map(([font, count]) => ({ font, count }))
                .sort((a, b) => b.count - a.count);
            
            const bodyFontsRanked = Object.entries(data.bodyFonts)
                .map(([font, count]) => ({ font, count }))
                .sort((a, b) => b.count - a.count);

            // Get most common spacing, borders, shadows
            const spacingRanked = Object.entries(data.spacing)
                .map(([value, count]) => ({ value: parseInt(value), count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map(item => item.value);

            const bordersRanked = Object.entries(data.borders)
                .map(([key, count]) => ({ key, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(item => item.key);

            const shadowsRanked = Object.entries(data.shadows)
                .map(([key, count]) => ({ key, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map(item => item.key);

            return {
                brand_name: data.brand_name,
                brand_statement: data.brand_statement,
                colors_ranked: colorsRanked.slice(0, 20), // Top 20 colors with frequency and context
                heading_fonts_ranked: headingFontsRanked.slice(0, 5),
                body_fonts_ranked: bodyFontsRanked.slice(0, 5),
                extracted_tone: data.tone,
                extracted_font_sizes: {
                    h1: avgH1,
                    h2: avgH2,
                    h3: avgH3,
                    body: avgBody
                },
                extracted_spacing: spacingRanked,
                extracted_borders: bordersRanked,
                extracted_shadows: shadowsRanked,
                logo_colors: data.logo_colors,
                logo_info: data.logo_info || null // Include logo metadata
            };
        });

        // If logo is an image, extract colors from screenshot (before closing browser)
        if (extractedData.logo_info && extractedData.logo_info.needsPixelExtraction && extractedData.logo_info.boundingBox) {
            try {
                const logoBox = extractedData.logo_info.boundingBox;
                
                // Get viewport dimensions to validate bounding box
                const viewport = await page.viewportSize();
                const viewportWidth = viewport?.width || 1920;
                const viewportHeight = viewport?.height || 1080;
                
                // CRITICAL: Shrink box inward to remove background bleed
                // This ensures we capture the rendered glyph, not the container
                const pad = 4;
                const x = Math.max(0, Math.min(logoBox.x + pad, viewportWidth - 1));
                const y = Math.max(0, Math.min(logoBox.y + pad, viewportHeight - 1));
                const width = Math.min(logoBox.width - pad * 2, viewportWidth - x);
                const height = Math.min(logoBox.height - pad * 2, viewportHeight - y);
                
                // Ensure bounding box is valid and within viewport
                if (width > 10 && height > 10 && x >= 0 && y >= 0 && 
                    x + width <= viewportWidth && y + height <= viewportHeight) {
                    
                    const logoImage = await page.screenshot({
                        type: 'png',
                        clip: { x, y, width, height }
                    });
                    
                    // Extract colors from logo image (simplified - for production use sharp library)
                    // For now, we'll rely on SVG extraction and CSS variables
                    // In production, add: npm install sharp
                    // Then use sharp to extract dominant colors with proper filtering:
                    // - Reject transparent pixels (alpha < 220)
                    // - Reject grayscale pixels (saturation < 12)
                    // - Use median cut, not naive k-means (limit to 3 clusters)
                    console.log(`   📸 Logo screenshot captured (${width}x${height}px at ${x},${y}, padded by ${pad}px)`);
                    console.log(`   ⚠️  Pixel-based color extraction not yet implemented - using SVG/CSS colors`);
                    console.log(`   💡 When implemented, filter: alpha < 220, saturation < 12, use median cut (not k-means)`);
                    // Store logo image for future pixel extraction
                    extractedData.logo_info.screenshot_base64 = logoImage.toString('base64');
                } else {
                    console.warn(`   ⚠️  Logo bounding box invalid or outside viewport:`, {
                        original: logoBox,
                        clamped: { x, y, width, height },
                        viewport: { width: viewportWidth, height: viewportHeight }
                    });
                    console.warn(`   ⚠️  Skipping logo screenshot - using SVG/CSS colors only`);
                }
            } catch (error) {
                console.warn(`   ⚠️  Could not capture logo screenshot: ${error.message}`);
                console.warn(`   ⚠️  Continuing with SVG/CSS color extraction only`);
                // Don't fail the whole crawl if logo screenshot fails
            }
        }

        // Cross-validate logo colors with CSS variables (before closing browser)
        if (extractedData.logo_colors && extractedData.logo_colors.length > 0) {
            try {
                // Check if logo colors match CSS variables
                const cssVarColors = await page.evaluate(() => {
                    const vars = {};
                    const root = getComputedStyle(document.documentElement);
                    for (let i = 0; i < root.length; i++) {
                        const prop = root[i];
                        if (prop.startsWith('--')) {
                            const val = root.getPropertyValue(prop).trim();
                            if (val && (val.startsWith('#') || val.startsWith('rgb'))) {
                                vars[prop] = val;
                            }
                        }
                    }
                    return vars;
                });
                
                // Helper to normalize color for comparison
                const normalizeColorForCompare = (color) => {
                    if (!color) return null;
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
                    return color;
                };
                
                // Boost confidence if logo colors match CSS variables
                extractedData.logo_colors.forEach(logoColor => {
                    Object.entries(cssVarColors).forEach(([varName, varValue]) => {
                        const normalizedVar = normalizeColorForCompare(varValue);
                        if (normalizedVar === logoColor) {
                            const varNameLower = varName.toLowerCase();
                            if (varNameLower.includes('primary') || varNameLower.includes('brand')) {
                                console.log(`   ✅ Logo color ${logoColor} matches CSS variable ${varName} - HIGH CONFIDENCE`);
                            }
                        }
                    });
                });
            } catch (error) {
                console.warn(`   ⚠️  Could not cross-validate with CSS variables: ${error.message}`);
            }
        }

        await browser.close();

        // Search internet for logo if we have a brand name but no logo colors found
        if ((!extractedData.logo_colors || extractedData.logo_colors.length === 0) && extractedData.brand_name) {
            console.log(`\n🌐 No logo found on website, searching internet for "${extractedData.brand_name}"...`);
            const internetLogo = await searchLogoAndExtractColors(extractedData.brand_name, url);
            
            if (internetLogo && internetLogo.colors && internetLogo.colors.length > 0) {
                // Merge internet logo colors with extracted data
                extractedData.logo_colors = internetLogo.colors;
                extractedData.logo_info = {
                    ...extractedData.logo_info,
                    source: 'internet_search',
                    logo_url: internetLogo.logo_url,
                    primary: internetLogo.primary,
                    secondary: internetLogo.secondary,
                    accent: internetLogo.accent
                };
                
                // Boost these colors in the frequency ranking
                internetLogo.colors.forEach(color => {
                    const existing = extractedData.colors_ranked?.find(c => c.color === color);
                    if (existing) {
                        existing.count += 50; // Boost internet logo colors
                    } else {
                        // Add to colors_ranked if not present
                        if (!extractedData.colors_ranked) {
                            extractedData.colors_ranked = [];
                        }
                        extractedData.colors_ranked.push({
                            color: color,
                            count: 50,
                            contexts: ['internet_logo']
                        });
                    }
                });
                
                // Re-sort by frequency
                if (extractedData.colors_ranked) {
                    extractedData.colors_ranked.sort((a, b) => b.count - a.count);
                }
                
                console.log(`   ✅ Internet logo colors integrated into brand profile`);
            }
        }

        // Log final logo colors summary
        if (extractedData.logo_colors && extractedData.logo_colors.length > 0) {
            console.log(`\n📊 FINAL LOGO COLORS SUMMARY:`);
            console.log(`   Logo Type: ${extractedData.logo_info?.type || 'unknown'}`);
            console.log(`   Logo Source: ${extractedData.logo_info?.source || 'website'}`);
            if (extractedData.logo_info?.logo_url) {
                console.log(`   Logo URL: ${extractedData.logo_info.logo_url}`);
            }
            console.log(`   Logo Score: ${extractedData.logo_info?.score || 'N/A'}`);
            console.log(`   Logo Colors: ${extractedData.logo_colors.join(", ")}`);
            if (extractedData.logo_info?.primary) {
                console.log(`   Classified - Primary: ${extractedData.logo_info.primary}, Secondary: ${extractedData.logo_info.secondary || 'N/A'}`);
            }
            console.log(`   Total Colors Found: ${extractedData.colors_ranked?.length || 0}`);
            console.log(`   Logo colors will be emphasized in LLM processing\n`);
        }

        // Add screenshots to extracted data
        return {
            ...extractedData,
            screenshots: screenshots
        };

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error("Website crawling error:", error.message);
        throw new Error(`Failed to crawl website: ${error.message}`);
    }
}
