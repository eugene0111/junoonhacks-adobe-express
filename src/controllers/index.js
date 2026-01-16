export function healthCheck(req, res) {
    res.json({ 
        status: 'ok', 
        message: 'BrandGuard API is running' 
    });
}
