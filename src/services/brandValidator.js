export function validateBrandProfile(brandProfile) {
    const errors = [];

    if (!brandProfile.fonts) {
        errors.push("Missing 'fonts' section");
    } else {
        const requiredFontFields = ['heading', 'body', 'h1_size', 'h2_size', 'h3_size', 'body_size', 'caption_size'];
        requiredFontFields.forEach(field => {
            if (brandProfile.fonts[field] === undefined || brandProfile.fonts[field] === null) {
                errors.push(`Missing required font field: ${field}`);
            }
        });

        const sizeFields = ['h1_size', 'h2_size', 'h3_size', 'body_size', 'caption_size'];
        sizeFields.forEach(field => {
            const size = brandProfile.fonts[field];
            if (typeof size !== 'number' || size <= 0) {
                errors.push(`Invalid font size for ${field}: must be a positive number`);
            }
        });

        if (brandProfile.fonts.h1_size <= brandProfile.fonts.h2_size) {
            errors.push("Font size hierarchy violated: h1_size must be greater than h2_size");
        }
        if (brandProfile.fonts.h2_size <= brandProfile.fonts.h3_size) {
            errors.push("Font size hierarchy violated: h2_size must be greater than h3_size");
        }
        if (brandProfile.fonts.h3_size <= brandProfile.fonts.body_size) {
            errors.push("Font size hierarchy violated: h3_size must be greater than body_size");
        }
        if (brandProfile.fonts.body_size <= brandProfile.fonts.caption_size) {
            errors.push("Font size hierarchy violated: body_size must be greater than caption_size");
        }
    }

    if (!brandProfile.colors) {
        errors.push("Missing 'colors' section");
    } else {
        const requiredColorFields = ['primary', 'secondary', 'accent', 'background', 'text'];
        requiredColorFields.forEach(field => {
            if (!brandProfile.colors[field]) {
                errors.push(`Missing required color field: ${field}`);
            } else if (!isValidColor(brandProfile.colors[field])) {
                errors.push(`Invalid color format for ${field}: ${brandProfile.colors[field]}`);
            }
        });
    }

    if (!brandProfile.spacing) {
        errors.push("Missing 'spacing' section");
    } else {
        const requiredSpacingFields = ['padding', 'margin', 'gap'];
        requiredSpacingFields.forEach(field => {
            if (brandProfile.spacing[field] === undefined || brandProfile.spacing[field] === null) {
                errors.push(`Missing required spacing field: ${field}`);
            } else if (typeof brandProfile.spacing[field] !== 'number' || brandProfile.spacing[field] < 0) {
                errors.push(`Invalid spacing value for ${field}: must be a non-negative number`);
            }
        });
    }

    if (!brandProfile.borders) {
        errors.push("Missing 'borders' section");
    } else {
        if (brandProfile.borders.radius !== undefined && 
            (typeof brandProfile.borders.radius !== 'number' || brandProfile.borders.radius < 0)) {
            errors.push("Invalid border radius: must be a non-negative number");
        }
        if (brandProfile.borders.width !== undefined && 
            (typeof brandProfile.borders.width !== 'number' || brandProfile.borders.width < 0)) {
            errors.push("Invalid border width: must be a non-negative number");
        }
    }

    if (!brandProfile.shadows) {
        errors.push("Missing 'shadows' section");
    } else {
        if (brandProfile.shadows.enabled !== undefined && typeof brandProfile.shadows.enabled !== 'boolean') {
            errors.push("Invalid shadows.enabled: must be a boolean");
        }
    }

    const validTones = ['professional', 'modern', 'friendly', 'luxury', 'playful'];
    if (!brandProfile.tone) {
        errors.push("Missing 'tone' field");
    } else if (!validTones.includes(brandProfile.tone)) {
        errors.push(`Invalid tone: must be one of ${validTones.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function isValidColor(color) {
    if (!color || typeof color !== 'string') {
        return false;
    }

    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    if (hexPattern.test(color)) {
        return true;
    }

    const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
    if (rgbPattern.test(color)) {
        return true;
    }

    const namedColors = [
        'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
        'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'transparent'
    ];
    if (namedColors.includes(color.toLowerCase())) {
        return true;
    }

    return false;
}

export function normalizeColorToHex(color) {
    if (!color) return "#000000";

    if (color.startsWith('#')) {
        if (color.length === 4) {
            return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
        }
        return color.toUpperCase();
    }

    return color;
}
