import { generateBrandProfile as generateProfile } from '../services/brandGenerator.js';
import { crawlWebsite } from '../services/websiteCrawler.js';
import { processCrawledData } from '../services/crawledDataProcessor.js';
import logger from '../utils/logger.js';

export async function generateBrandProfile(req, res, next) {
    try {
        const { brand_name, brand_statement, format, website_url } = req.body;

        // Validate required fields
        if (!format) {
            return res.status(400).json({
                success: false,
                error: "format is required (e.g., 'instagram_post', 'facebook_post', 'banner', etc.)"
            });
        }

        if (!brand_statement && !website_url) {
            return res.status(400).json({
                success: false,
                error: "Either brand_statement or website_url is required"
            });
        }

        logger.info('Generating brand profile', {
            brand_name: brand_name || 'Unknown',
            format: format,
            has_website_url: !!website_url,
            has_brand_statement: !!brand_statement
        });

        // Initialize brand data
        let brandData = {
            brand_name: brand_name || 'Unknown Brand',
            brand_statement: brand_statement || '',
            format: format
        };

        // If website URL is provided, crawl and process it
        if (website_url) {
            try {
                logger.info('Crawling website', { url: website_url });
                const crawledData = await crawlWebsite(website_url);
                
                // Print logo colors if found
                if (crawledData.logo_colors && crawledData.logo_colors.length > 0) {
                    console.log(`\n✅ LOGO COLORS EXTRACTED FROM WEBSITE:`);
                    crawledData.logo_colors.forEach((color, index) => {
                        console.log(`   ${index + 1}. ${color}`);
                    });
                    console.log(`\n`);
                }
                
                logger.info('Processing crawled data with LLM for format', { 
                    format: format,
                    colors_found: crawledData.colors_ranked?.length || 0,
                    heading_fonts_found: crawledData.heading_fonts_ranked?.length || 0,
                    body_fonts_found: crawledData.body_fonts_ranked?.length || 0
                });
                
                // Process crawled data through LLM to adapt for format
                const processedData = await processCrawledData(crawledData, format, brand_statement);
                
                // Merge processed data with brand data
                brandData = {
                    ...brandData,
                    // Use brand_statement from request if provided, otherwise use crawled
                    brand_statement: brand_statement || crawledData.brand_statement || brandData.brand_statement,
                    // Override with LLM-processed values
                    extracted_colors: processedData.colors ? [
                        processedData.colors.primary,
                        processedData.colors.secondary,
                        processedData.colors.accent,
                        processedData.colors.background,
                        processedData.colors.text
                    ] : (crawledData.colors_ranked?.slice(0, 5).map(c => c.color) || []),
                    extracted_fonts: processedData.fonts ? [
                        processedData.fonts.heading,
                        processedData.fonts.body
                    ] : [
                        crawledData.heading_fonts_ranked?.[0]?.font,
                        crawledData.body_fonts_ranked?.[0]?.font
                    ].filter(Boolean),
                    extracted_tone: processedData.tone || crawledData.extracted_tone,
                    // Include border and shadow data if processed
                    extracted_borders: processedData.borders ? [
                        `radius:${processedData.borders.radius || 0}`,
                        `width:${processedData.borders.width || 0}`,
                        `style:${processedData.borders.style || 'solid'}`
                    ] : crawledData.extracted_borders,
                    extracted_shadows: processedData.shadows ? [
                        `x:${processedData.shadows.x || 0},y:${processedData.shadows.y || 0},blur:${processedData.shadows.blur || 0},color:${processedData.shadows.color || '#00000015'}`
                    ] : crawledData.extracted_shadows,
                    // Keep font sizes and spacing from crawled data
                    extracted_font_sizes: crawledData.extracted_font_sizes,
                    extracted_spacing: crawledData.extracted_spacing
                };
                
                logger.info('Website data processed and adapted for format', {
                    format: format,
                    processed_colors: brandData.extracted_colors?.length || 0,
                    processed_fonts: brandData.extracted_fonts?.length || 0,
                    tone: brandData.extracted_tone
                });
            } catch (error) {
                logger.warn('Website crawling/processing error', { 
                    url: website_url, 
                    error: error.message 
                });
                // Continue with brand_statement only if crawling fails
                if (!brand_statement) {
                    return res.status(500).json({
                        success: false,
                        error: "Website crawling failed and no brand_statement provided",
                        details: error.message
                    });
                }
            }
        }

        // Generate brand profile (works with or without crawled data)
        const brandProfile = await generateProfile(brandData);

        logger.info('Brand profile generated successfully', {
            format: format,
            used_website_data: !!website_url
        });

        res.json({
            success: true,
            brand_profile: brandProfile
        });
    } catch (error) {
        logger.error('Error generating brand profile', { 
            error: error.message, 
            stack: error.stack 
        });
        next(error);
    }
}
