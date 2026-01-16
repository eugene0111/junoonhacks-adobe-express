export function validateBrandRequest(req, res, next) {
    const { brand_statement, website_url, format } = req.body;

    if (!brand_statement && !website_url) {
        return res.status(400).json({
            error: 'Either brand_statement or website_url is required'
        });
    }

    if (!format) {
        return res.status(400).json({
            error: 'format is required (e.g., \'instagram_post\', \'facebook_post\', \'story\', \'banner\', \'poster\')'
        });
    }

    next();
}
