import { normalizeFontFamily, normalizeColor } from './documentConverter.js';

export function detectViolations(brandProfile, documentData) {
    const violations = [];

    if (!documentData || !documentData.elements) {
        return violations;
    }

    documentData.elements.forEach(element => {
        const elementViolations = [];

        if (element.styles.font_family) {
            const normalizedFound = normalizeFontFamily(element.styles.font_family);
            const normalizedHeading = normalizeFontFamily(brandProfile.fonts.heading);
            const normalizedBody = normalizeFontFamily(brandProfile.fonts.body);

            if (normalizedFound !== normalizedHeading && normalizedFound !== normalizedBody) {
                elementViolations.push({
                    type: 'font_family',
                    expected: brandProfile.fonts.heading,
                    found: element.styles.font_family,
                    element_id: element.element_id,
                    severity: 'error',
                    message: `Font family "${element.styles.font_family}" does not match brand fonts (${brandProfile.fonts.heading} or ${brandProfile.fonts.body})`
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
            const normalizedFound = normalizeColor(element.styles.color);
            const brandColors = [
                normalizeColor(brandProfile.colors.primary),
                normalizeColor(brandProfile.colors.secondary),
                normalizeColor(brandProfile.colors.accent),
                normalizeColor(brandProfile.colors.text)
            ];

            if (!isColorInPalette(normalizedFound, brandColors)) {
                elementViolations.push({
                    type: 'color',
                    expected: brandProfile.colors.text,
                    found: element.styles.color,
                    element_id: element.element_id,
                    severity: 'warning',
                    message: `Color "${element.styles.color}" is not in the brand color palette`
                });
            }
        }

        if (element.styles.background_color) {
            const normalizedFound = normalizeColor(element.styles.background_color);
            const brandBackground = normalizeColor(brandProfile.colors.background);

            if (normalizedFound !== brandBackground) {
                elementViolations.push({
                    type: 'background_color',
                    expected: brandProfile.colors.background,
                    found: element.styles.background_color,
                    element_id: element.element_id,
                    severity: 'warning',
                    message: `Background color "${element.styles.background_color}" does not match brand background color`
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

    const normalizedColor = color.toLowerCase().trim();

    return palette.some(paletteColor => {
        if (!paletteColor) return false;
        return normalizeColor(paletteColor) === normalizedColor;
    });
}
