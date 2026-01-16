import { generateBrandProfile as generateProfile } from '../services/brandGenerator.js';
import { crawlWebsite } from '../services/websiteCrawler.js';
import logger from '../utils/logger.js';

export async function generateBrandProfile(req, res, next) {
    try {
        const { brand_name, brand_statement, format, website_url } = req.body;

        logger.info('Generating brand profile', {
            brand_name: brand_name || 'Unknown',
            format: format,
            has_website_url: !!website_url
        });

        let brandData = {
            brand_name: brand_name || 'Unknown Brand',
            brand_statement: brand_statement || '',
            format: format
        };

        if (website_url) {
            try {
                logger.info('Crawling website', { url: website_url });
                const crawledData = await crawlWebsite(website_url);
                brandData = { ...brandData, ...crawledData };
                logger.info('Website crawl successful', {
                    colors_found: crawledData.extracted_colors?.length || 0,
                    fonts_found: crawledData.extracted_fonts?.length || 0
                });
            } catch (error) {
                logger.warn('Website crawling error', { 
                    url: website_url, 
                    error: error.message 
                });
            }
        }

        const brandProfile = await generateProfile(brandData);

        logger.info('Brand profile generated successfully', {
            format: format
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
