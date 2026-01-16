import { normalizeFontFamily, normalizeColor, areColorsEqual } from '../utils/css.js';
import { validateColorContrast } from '../utils/contrastChecker.js';

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

            const background = element.styles.background_color || brandProfile.colors.background;
            if (background) {
                const contrast = validateColorContrast(normalizedFound, normalizeColor(background));
                if (!contrast.meetsAA) {
                    elementViolations.push({
                        type: 'contrast',
                        expected: contrast.suggestion || brandProfile.colors.text,
                        found: element.styles.color,
                        element_id: element.element_id,
                        severity: 'error',
                        message: `Color contrast ratio ${contrast.ratio} does not meet WCAG AA standards (minimum 4.5)`,
                        contrast_ratio: contrast.ratio,
                        meets_aa: contrast.meetsAA
                    });
                }
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

        if (element.styles.shadow && brandProfile.shadows) {
            const foundShadow = element.styles.shadow;
            const brandShadow = brandProfile.shadows;
            const tolerance = 2;

            if (brandShadow.enabled) {
                const shadowMismatch = 
                    (foundShadow.x !== undefined && Math.abs(foundShadow.x - brandShadow.x) > tolerance) ||
                    (foundShadow.y !== undefined && Math.abs(foundShadow.y - brandShadow.y) > tolerance) ||
                    (foundShadow.blur !== undefined && Math.abs(foundShadow.blur - brandShadow.blur) > tolerance) ||
                    (foundShadow.color && !areColorsEqual(foundShadow.color, brandShadow.color));

                if (shadowMismatch) {
                    elementViolations.push({
                        type: 'shadow',
                        expected: brandShadow,
                        found: foundShadow,
                        element_id: element.element_id,
                        severity: 'warning',
                        message: 'Shadow does not match brand shadow settings'
                    });
                }
            }
        }

        if (element.styles.border_radius !== undefined && brandProfile.borders) {
            const foundRadius = element.styles.border_radius;
            const brandRadius = brandProfile.borders.radius;
            const tolerance = 2;

            if (Math.abs(foundRadius - brandRadius) > tolerance) {
                elementViolations.push({
                    type: 'border',
                    expected: brandProfile.borders,
                    found: { radius: foundRadius },
                    element_id: element.element_id,
                    severity: 'warning',
                    message: `Border radius ${foundRadius}px does not match brand radius ${brandRadius}px`
                });
            }
        }

        if (brandProfile.spacing) {
            const spacingViolations = [];

            if (element.styles.padding !== undefined) {
                const foundPadding = element.styles.padding;
                const brandPadding = brandProfile.spacing.padding;
                const tolerance = 4;

                if (Math.abs(foundPadding - brandPadding) > tolerance) {
                    spacingViolations.push('padding');
                }
            }

            if (element.styles.margin !== undefined) {
                const foundMargin = element.styles.margin;
                const brandMargin = brandProfile.spacing.margin;
                const tolerance = 4;

                if (Math.abs(foundMargin - brandMargin) > tolerance) {
                    spacingViolations.push('margin');
                }
            }

            if (spacingViolations.length > 0) {
                elementViolations.push({
                    type: 'spacing',
                    expected: brandProfile.spacing,
                    found: {
                        padding: element.styles.padding,
                        margin: element.styles.margin
                    },
                    element_id: element.element_id,
                    severity: 'warning',
                    message: `Spacing (${spacingViolations.join(', ')}) does not match brand spacing`,
                    violations: spacingViolations
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
