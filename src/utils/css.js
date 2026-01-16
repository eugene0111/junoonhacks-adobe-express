export function normalizeFontFamily(fontFamily) {
    if (!fontFamily) return null;
    
    return fontFamily
        .replace(/['"]/g, '')
        .split(',')[0]
        .trim()
        .toLowerCase();
}

export function normalizeColor(color) {
    if (!color) return null;
    
    if (typeof color === 'string') {
        const trimmed = color.trim().toLowerCase();
        
        if (trimmed.startsWith('#')) {
            return trimmed;
        }
        
        if (trimmed.startsWith('rgb') || trimmed.startsWith('rgba')) {
            return convertRgbToHex(trimmed);
        }
        
        return trimmed;
    }
    
    if (typeof color === 'object' && color !== null) {
        if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
            const r = Math.round((color.r <= 1 ? color.r * 255 : color.r)).toString(16).padStart(2, '0');
            const g = Math.round((color.g <= 1 ? color.g * 255 : color.g)).toString(16).padStart(2, '0');
            const b = Math.round((color.b <= 1 ? color.b * 255 : color.b)).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
    }
    
    return null;
}

function convertRgbToHex(rgbString) {
    const match = rgbString.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
        const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    return null;
}

export function areColorsEqual(color1, color2) {
    if (!color1 || !color2) return false;
    
    const normalized1 = normalizeColor(color1);
    const normalized2 = normalizeColor(color2);
    
    if (!normalized1 || !normalized2) return false;
    
    return normalized1 === normalized2;
}
