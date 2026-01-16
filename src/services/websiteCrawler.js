import puppeteer from "puppeteer";
import axios from "axios";

/**
 * Crawl a website to extract brand information
 * @param {string} url - Website URL to crawl
 * @returns {Promise<Object>} Extracted brand data
 */
export async function crawlWebsite(url) {
    let browser;
    
    try {
        // Validate URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set a reasonable timeout
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        // Extract brand information
        const brandData = await page.evaluate(() => {
            const data = {
                brand_name: '',
                brand_statement: '',
                colors: [],
                fonts: [],
                tone: ''
            };

            // Extract brand name from title or h1
            const title = document.querySelector('title')?.textContent || '';
            const h1 = document.querySelector('h1')?.textContent || '';
            data.brand_name = h1 || title.split('|')[0].trim() || title.split('-')[0].trim();

            // Extract meta description as brand statement
            const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
            const metaOgDesc = document.querySelector('meta[property="og:description"]')?.content || '';
            data.brand_statement = metaOgDesc || metaDesc || '';

            // Extract colors from CSS
            const styleSheets = Array.from(document.styleSheets);
            const colorRegex = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g;
            const foundColors = new Set();

            styleSheets.forEach(sheet => {
                try {
                    const rules = Array.from(sheet.cssRules || []);
                    rules.forEach(rule => {
                        if (rule.style) {
                            const bgColor = rule.style.backgroundColor;
                            const color = rule.style.color;
                            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                                foundColors.add(bgColor);
                            }
                            if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                                foundColors.add(color);
                            }
                        }
                    });
                } catch (e) {
                    // Cross-origin stylesheets may throw errors
                }
            });

            // Also check inline styles and computed styles of main elements
            const mainElements = document.querySelectorAll('header, main, nav, .hero, .banner, h1, h2, .logo');
            mainElements.forEach(el => {
                try {
                    const computedStyle = window.getComputedStyle(el);
                    const bgColor = computedStyle.backgroundColor;
                    const color = computedStyle.color;
                    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                        foundColors.add(bgColor);
                    }
                    if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                        foundColors.add(color);
                    }
                } catch (e) {
                    // Ignore errors
                }
            });

            data.colors = Array.from(foundColors).slice(0, 10); // Limit to 10 colors

            // Extract fonts
            const fontFamilies = new Set();
            mainElements.forEach(el => {
                try {
                    const computedStyle = window.getComputedStyle(el);
                    const fontFamily = computedStyle.fontFamily;
                    if (fontFamily) {
                        // Extract font name (remove quotes and fallbacks)
                        const fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                        if (fontName && !fontName.includes('serif') && !fontName.includes('sans-serif') && !fontName.includes('monospace')) {
                            fontFamilies.add(fontName);
                        }
                    }
                } catch (e) {
                    // Ignore errors
                }
            });

            data.fonts = Array.from(fontFamilies).slice(0, 5); // Limit to 5 fonts

            // Try to determine tone from content
            const bodyText = document.body?.textContent || '';
            const toneKeywords = {
                professional: ['business', 'enterprise', 'corporate', 'professional', 'solutions'],
                modern: ['modern', 'innovative', 'cutting-edge', 'tech', 'digital'],
                friendly: ['friendly', 'welcome', 'community', 'together', 'family'],
                luxury: ['luxury', 'premium', 'exclusive', 'elite', 'sophisticated'],
                playful: ['fun', 'playful', 'creative', 'exciting', 'adventure']
            };

            let maxScore = 0;
            let detectedTone = 'professional';
            Object.keys(toneKeywords).forEach(tone => {
                const score = toneKeywords[tone].reduce((acc, keyword) => {
                    return acc + (bodyText.toLowerCase().includes(keyword) ? 1 : 0);
                }, 0);
                if (score > maxScore) {
                    maxScore = score;
                    detectedTone = tone;
                }
            });

            data.tone = detectedTone;

            return data;
        });

        await browser.close();

        return {
            brand_name: brandData.brand_name,
            brand_statement: brandData.brand_statement,
            extracted_colors: brandData.colors,
            extracted_fonts: brandData.fonts,
            extracted_tone: brandData.tone
        };

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        throw new Error(`Failed to crawl website: ${error.message}`);
    }
}
