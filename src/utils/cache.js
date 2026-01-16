const brandProfileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function generateCacheKey(brandData) {
    const keyParts = [
        brandData.brand_name || '',
        brandData.brand_statement || '',
        brandData.format || '',
        brandData.website_url || ''
    ];
    return keyParts.join('|');
}

export function getCachedProfile(brandData) {
    const key = generateCacheKey(brandData);
    const cached = brandProfileCache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        brandProfileCache.delete(key);
        return null;
    }
    
    return cached.profile;
}

export function setCachedProfile(brandData, profile) {
    const key = generateCacheKey(brandData);
    brandProfileCache.set(key, {
        profile: profile,
        timestamp: Date.now()
    });
}

export function clearCache() {
    brandProfileCache.clear();
}

export function getCacheStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    
    brandProfileCache.forEach((value, key) => {
        if (now - value.timestamp > CACHE_TTL) {
            expired++;
        } else {
            valid++;
        }
    });
    
    return {
        total: brandProfileCache.size,
        valid,
        expired
    };
}
