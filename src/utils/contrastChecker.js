export function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWCAGAA(color1, color2, isLargeText = false) {
    const ratio = getContrastRatio(color1, color2);
    return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

export function meetsWCAGAAA(color1, color2, isLargeText = false) {
    const ratio = getContrastRatio(color1, color2);
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

export function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function suggestContrastColor(baseColor, targetRatio = 4.5) {
    const baseLum = getLuminance(baseColor);
    const targetLum = baseLum > 0.5 
        ? (baseLum + 0.05) / targetRatio - 0.05
        : (baseLum + 0.05) * targetRatio - 0.05;
    
    return targetLum > 0.5 ? '#000000' : '#FFFFFF';
}

function hexToRgb(hex) {
    if (!hex) return null;
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function validateColorContrast(foreground, background) {
    const ratio = getContrastRatio(foreground, background);
    const meetsAA = meetsWCAGAA(foreground, background);
    const meetsAAA = meetsWCAGAAA(foreground, background);
    
    return {
        ratio: Math.round(ratio * 100) / 100,
        meetsAA,
        meetsAAA,
        level: meetsAAA ? 'AAA' : meetsAA ? 'AA' : 'Fail',
        suggestion: !meetsAA ? suggestContrastColor(background) : null
    };
}
