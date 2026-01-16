import { generateBrandProfile as generateProfile } from '../services/brandGenerator.js';
import { crawlWebsite } from '../services/websiteCrawler.js';

export async function generateBrandProfile(req, res, next) {
    try {
        const { brand_name, brand_statement, format, website_url } = req.body;

        let brandData = {
            brand_name: brand_name || 'Unknown Brand',
            brand_statement: brand_statement || '',
            format: format
        };

        if (website_url) {
            try {
                const crawledData = await crawlWebsite(website_url);
                brandData = { ...brandData, ...crawledData };
            } catch (error) {
                console.error('Website crawling error:', error.message);
            }
        }

        const brandProfile = await generateProfile(brandData);

        res.json({
            brand_profile: brandProfile
        });
    } catch (error) {
        console.error('Error generating brand profile:', error);
        next(error);
    }
}
