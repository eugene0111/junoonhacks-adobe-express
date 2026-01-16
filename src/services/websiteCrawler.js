import { chromium } from "playwright";

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
        
        // Navigate to page
        await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for page to be fully loaded
        await page.waitForTimeout(2000);

        // Extract brand information using Playwright's evaluate
        const extractedData = await page.evaluate(() => {
            const data = {
                brand_name: '',
                brand_statement: '',
                colors: new Set(),
                fonts: new Set(),
                fontSizes: new Set(),
                spacing: new Set(),
                borders: new Set(),
                shadows: new Set(),
                tone: ''
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

            // Helper function to get computed style
            const getComputedStyleValue = (element, property) => {
                if (!element) return null;
                return window.getComputedStyle(element).getPropertyValue(property).trim();
            };

            // Helper function to parse CSS value to number
            const parseSize = (value) => {
                if (!value) return null;
                const match = value.match(/(\d+\.?\d*)/);
                if (match) {
                    const num = parseFloat(match[1]);
                    // Convert em/rem to px (approximate: 1em/rem ≈ 16px)
                    if (value.includes('em') || value.includes('rem')) {
                        return Math.round(num * 16);
                    }
                    return Math.round(num);
                }
                return null;
            };

            // Extract colors from main elements
            const mainElements = [
                document.querySelector('body'),
                document.querySelector('header'),
                document.querySelector('main'),
                document.querySelector('nav'),
                document.querySelector('.hero'),
                document.querySelector('.banner'),
                document.querySelector('h1'),
                document.querySelector('h2'),
                document.querySelector('.logo')
            ].filter(el => el !== null);

            mainElements.forEach(el => {
                const bgColor = getComputedStyleValue(el, 'background-color');
                const textColor = getComputedStyleValue(el, 'color');
                const borderColor = getComputedStyleValue(el, 'border-color');

                [bgColor, textColor, borderColor].forEach(color => {
                    if (color && 
                        color !== 'rgba(0, 0, 0, 0)' && 
                        color !== 'transparent' &&
                        color !== 'inherit' &&
                        !color.startsWith('var(')) {
                        data.colors.add(color);
                    }
                });

                // Extract CSS variables
                const style = window.getComputedStyle(el);
                for (let i = 0; i < style.length; i++) {
                    const prop = style[i];
                    if (prop.startsWith('--')) {
                        const value = style.getPropertyValue(prop);
                        if (value && (value.startsWith('#') || value.startsWith('rgb'))) {
                            data.colors.add(value.trim());
                        }
                    }
                }
            });

            // Extract fonts and font sizes
            const textElements = [
                ...document.querySelectorAll('h1'),
                ...document.querySelectorAll('h2'),
                ...document.querySelectorAll('h3'),
                ...document.querySelectorAll('h4'),
                ...document.querySelectorAll('h5'),
                ...document.querySelectorAll('h6'),
                ...document.querySelectorAll('p'),
                ...document.querySelectorAll('.heading'),
                ...document.querySelectorAll('.title'),
                ...document.querySelectorAll('.subtitle'),
                ...document.querySelectorAll('.hero'),
                ...document.querySelectorAll('.banner'),
                ...document.querySelectorAll('.text'),
                ...document.querySelectorAll('.content'),
                document.querySelector('body')
            ].filter(el => el !== null);

            const headingSizes = { h1: [], h2: [], h3: [] };
            const bodySizes = [];

            textElements.forEach(el => {
                const fontFamily = getComputedStyleValue(el, 'font-family');
                const fontSize = getComputedStyleValue(el, 'font-size');

                // Extract font family
                if (fontFamily) {
                    const fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                    if (fontName && 
                        !fontName.includes('serif') && 
                        !fontName.includes('sans-serif') && 
                        !fontName.includes('monospace') &&
                        fontName !== 'inherit' &&
                        !fontName.startsWith('var(')) {
                        data.fonts.add(fontName);
                    }
                }

                // Extract font size
                if (fontSize) {
                    const size = parseSize(fontSize);
                    if (size && size > 0 && size < 200) {
                        data.fontSizes.add(size);
                        
                        // Categorize by element type
                        const tagName = el.tagName.toLowerCase();
                        if (tagName === 'h1') {
                            headingSizes.h1.push(size);
                        } else if (tagName === 'h2') {
                            headingSizes.h2.push(size);
                        } else if (tagName === 'h3') {
                            headingSizes.h3.push(size);
                        } else if (tagName === 'p' || tagName === 'body' || el.classList.contains('body') || el.classList.contains('text') || el.classList.contains('content')) {
                            bodySizes.push(size);
                        }
                    }
                }
            });

            // Extract spacing values
            const containerElements = [
                document.querySelector('body'),
                document.querySelector('main'),
                document.querySelector('section'),
                ...document.querySelectorAll('.container'),
                ...document.querySelectorAll('.content'),
                ...document.querySelectorAll('header'),
                ...document.querySelectorAll('footer')
            ].filter(el => el !== null);

            containerElements.forEach(el => {
                const padding = getComputedStyleValue(el, 'padding');
                const margin = getComputedStyleValue(el, 'margin');
                const gap = getComputedStyleValue(el, 'gap');

                [padding, margin, gap].forEach(value => {
                    if (value) {
                        const matches = value.match(/(\d+\.?\d*)/g);
                        if (matches) {
                            matches.forEach(m => {
                                const num = parseFloat(m);
                                if (num > 0 && num < 200) {
                                    data.spacing.add(Math.round(num));
                                }
                            });
                        }
                    }
                });
            });

            // Extract border properties
            const borderedElements = [
                ...document.querySelectorAll('button'),
                ...document.querySelectorAll('.card'),
                ...document.querySelectorAll('.box'),
                ...document.querySelectorAll('[class*="border"]'),
                ...document.querySelectorAll('[style*="border"]')
            ].filter(el => el !== null);

            borderedElements.forEach(el => {
                const borderRadius = getComputedStyleValue(el, 'border-radius');
                const borderWidth = getComputedStyleValue(el, 'border-width');
                const borderStyle = getComputedStyleValue(el, 'border-style');

                if (borderRadius) {
                    const radius = parseSize(borderRadius);
                    if (radius !== null && radius >= 0) {
                        data.borders.add(`radius:${radius}`);
                    }
                }

                if (borderWidth) {
                    const width = parseSize(borderWidth);
                    if (width !== null && width >= 0) {
                        data.borders.add(`width:${width}`);
                    }
                }

                if (borderStyle && borderStyle !== 'none') {
                    data.borders.add(`style:${borderStyle}`);
                }
            });

            // Extract shadow properties
            const shadowElements = [
                ...document.querySelectorAll('[class*="shadow"]'),
                ...document.querySelectorAll('.card'),
                ...document.querySelectorAll('.box'),
                ...document.querySelectorAll('button')
            ].filter(el => el !== null);

            shadowElements.forEach(el => {
                const boxShadow = getComputedStyleValue(el, 'box-shadow');
                if (boxShadow && boxShadow !== 'none') {
                    // Parse box-shadow: x y blur color
                    const shadowMatch = boxShadow.match(/([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+(.+)/);
                    if (shadowMatch) {
                        const x = Math.round(parseFloat(shadowMatch[1]));
                        const y = Math.round(parseFloat(shadowMatch[2]));
                        const blur = Math.round(parseFloat(shadowMatch[3]));
                        const color = shadowMatch[4].trim();
                        
                        data.shadows.add(`x:${x},y:${y},blur:${blur},color:${color}`);
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

            // Calculate average heading sizes
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
            console.log(data)
            return {
                brand_name: data.brand_name,
                brand_statement: data.brand_statement,
                extracted_colors: Array.from(data.colors).slice(0, 15),
                extracted_fonts: Array.from(data.fonts).slice(0, 5),
                extracted_tone: data.tone,
                extracted_font_sizes: {
                    h1: avgH1,
                    h2: avgH2,
                    h3: avgH3,
                    body: avgBody,
                    all_sizes: Array.from(data.fontSizes).sort((a, b) => b - a).slice(0, 10)
                },
                extracted_spacing: Array.from(data.spacing).sort((a, b) => b - a).slice(0, 10),
                extracted_borders: Array.from(data.borders),
                extracted_shadows: Array.from(data.shadows)
            };
        });

        await browser.close();

        return extractedData;

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error("Website crawling error:", error.message);
        throw new Error(`Failed to crawl website: ${error.message}`);
    }
}
