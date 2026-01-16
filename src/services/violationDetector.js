import { normalizeFontFamily, normalizeColor, areColorsEqual } from '../utils/css.js';

export function detectViolations(brandProfile, documentData) {
    const violations = [];

    if (!documentData || !documentData.elements) {
        return violations;
    }

    documentData.elements.forEach(element => {
        const elementViolations = [];

        if (element.styles.font_family) {
            const normalizedFound = element.styles.font_family;
            const normalizedHeading = normalizeFontFamily(brandProfile.fonts.heading);
            const normalizedBody = normalizeFontFamily(brandProfile.fonts.body);

            if (normalizedFound !== normalizedHeading && normalizedFound !== normalizedBody) {
                const suggestedFont = determineSuggestedFont(element, brandProfile);
                elementViolations.push({
                    type: 'font_family',
                    expected: suggestedFont,
                    found: element.styles.font_family,
                    element_id: element.element_id,
                    severity: 'error',
                    message: `Font family does not match brand fonts (${brandProfile.fonts.heading} or ${brandProfile.fonts.body})`,
                    found_font_size: element.styles.font_size
                });
            }
        }

        if (element.styles.font_size) {
            const foundSize = parseFloat(element.styles.font_size);
            const allowedSizes = [
                brandProfile.fonts.h1_size,
                brandProfile.fonts.h2_size,
                brandProfile.fonts.h3_size,
                brandProfile.fonts.body_size,
                brandProfile.fonts.caption_size
            ];

            const closestSize = findClosestSize(foundSize, allowedSizes);
            const tolerance = 2;

            if (Math.abs(foundSize - closestSize) > tolerance) {
                elementViolations.push({
                    type: 'font_size',
                    expected: closestSize,
                    found: foundSize,
                    element_id: element.element_id,
                    severity: 'error',
                    message: `Font size ${foundSize}px does not match brand sizes. Expected one of: ${allowedSizes.join(', ')}px`
                });
            }
        }

        if (element.styles.color) {
            const normalizedFound = element.styles.color;
            const brandColors = [
                normalizeColor(brandProfile.colors.primary),
                normalizeColor(brandProfile.colors.secondary),
                normalizeColor(brandProfile.colors.accent),
                normalizeColor(brandProfile.colors.text)
            ].filter(Boolean);

            if (!isColorInPalette(normalizedFound, brandColors)) {
                const suggestedColor = findClosestBrandColor(normalizedFound, brandProfile.colors);
                elementViolations.push({
                    type: 'color',
                    expected: suggestedColor,
                    found: element.styles.color,
                    element_id: element.element_id,
                    severity: 'warning',
                    message: 'Color is not in the brand color palette'
                });
            }
        }

        if (element.styles.background_color) {
            const normalizedFound = element.styles.background_color;
            const brandBackground = normalizeColor(brandProfile.colors.background);

            if (!areColorsEqual(normalizedFound, brandBackground)) {
                elementViolations.push({
                    type: 'background_color',
                    expected: brandProfile.colors.background,
                    found: element.styles.background_color,
                    element_id: element.element_id,
                    severity: 'warning',
                    message: 'Background color does not match brand background color'
                });
            }
        }

        violations.push(...elementViolations);
    });

    return violations;
}

function findClosestSize(foundSize, allowedSizes) {
    return allowedSizes.reduce((closest, size) => {
        return Math.abs(size - foundSize) < Math.abs(closest - foundSize) ? size : closest;
    });
}

function isColorInPalette(color, palette) {
    if (!color) return false;

    return palette.some(paletteColor => {
        if (!paletteColor) return false;
        return areColorsEqual(color, paletteColor);
    });
}

function determineSuggestedFont(element, brandProfile) {
    if (!element.styles.font_size || !brandProfile.fonts) {
        return brandProfile.fonts.body;
    }

    const fontSize = parseFloat(element.styles.font_size);
    const { h1_size, h2_size, h3_size } = brandProfile.fonts;

    if (fontSize >= h1_size - 2) {
        return brandProfile.fonts.heading;
    } else if (fontSize >= h2_size - 2) {
        return brandProfile.fonts.heading;
    } else if (fontSize >= h3_size - 2) {
        return brandProfile.fonts.heading;
    }

    return brandProfile.fonts.body;
}

function findClosestBrandColor(foundColor, brandColors) {
    if (!foundColor || !brandColors) {
        return brandColors?.text || '#000000';
    }

    return brandColors.text || brandColors.primary || '#000000';
}
