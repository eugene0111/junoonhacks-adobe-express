import { normalizeFontFamily, normalizeColor, areColorsEqual } from '../utils/css.js';
import { validateColorContrast } from '../utils/contrastChecker.js';

export function detectViolations(brandProfile, documentData) {
    const violations = [];

    if (!documentData || !documentData.elements) {
        return violations;
    }

    const canvasWidth = documentData.width || 0;
    const canvasHeight = documentData.height || 0;
    const elements = documentData.elements;

    // Helper to safely get bounds
    const getBounds = (el) => {
        if (!el.bounds) return { x: 0, y: 0, width: 0, height: 0 };
        return el.bounds;
    };

    // Helper to check if element is Artboard/Background to be ignored
    const isIgnoredElement = (element, bounds) => {
        // 1. Explicit Artboard Check (Type + Position 0,0)
        if (element.type === 'ab:Artboard' && Math.abs(bounds.x) < 1 && Math.abs(bounds.y) < 1) {
            return true;
        }
        // 2. Full Canvas Match Check
        if (canvasWidth > 0 && canvasHeight > 0) {
            if (Math.abs(bounds.width - canvasWidth) < 2 && 
                Math.abs(bounds.height - canvasHeight) < 2 &&
                Math.abs(bounds.x) < 2 &&
                Math.abs(bounds.y) < 2) {
                return true;
            }
        }
        return false;
    };

    // ==========================================
    // 1. SPATIAL VALIDATION LOGIC
    // ==========================================
    if (brandProfile.spacing) {
        const { padding, gap } = brandProfile.spacing;
        
        elements.forEach((element, index) => {
            const bounds = getBounds(element);
            
            // SKIP Artboard/Background
            if (isIgnoredElement(element, bounds)) {
                return;
            }

            // A. Boundary & Padding Checks
            if (canvasWidth > 0) {
                // ADDING DIMENSIONS TO COORDINATES to get the last point (Right/Bottom edges)
                const rightEdge = bounds.x + bounds.width;
                const bottomEdge = bounds.y + bounds.height;
                
                // 1. Out of Bounds Check (Negative or Exceeds Size)
                const outOfBoundsErrors = [];
                
                if (bounds.x < 0) outOfBoundsErrors.push(`Left edge is negative (${bounds.x.toFixed(1)}px)`);
                if (bounds.y < 0) outOfBoundsErrors.push(`Top edge is negative (${bounds.y.toFixed(1)}px)`);
                if (rightEdge > canvasWidth) outOfBoundsErrors.push(`Right edge exceeds width (${rightEdge.toFixed(1)}px > ${canvasWidth}px)`);
                if (bottomEdge > canvasHeight) outOfBoundsErrors.push(`Bottom edge exceeds height (${bottomEdge.toFixed(1)}px > ${canvasHeight}px)`);

                if (outOfBoundsErrors.length > 0) {
                    violations.push({
                        type: 'out_of_bounds',
                        expected: { width: canvasWidth, height: canvasHeight },
                        found: { x: bounds.x, y: bounds.y, right: rightEdge, bottom: bottomEdge },
                        element_id: element.element_id,
                        severity: 'error',
                        message: `Element is out of bounds: ${outOfBoundsErrors.join(', ')}`
                    });
                } else {
                    // 2. Padding Check (Only if inside bounds)
                    const distLeft = bounds.x;
                    const distTop = bounds.y;
                    const distRight = canvasWidth - rightEdge;
                    const distBottom = canvasHeight - bottomEdge;

                    const paddingErrors = [];
                    // Check if distance is LESS than padding (Strict check)
                    if (distLeft < padding) paddingErrors.push(`Left (${distLeft.toFixed(1)}px < ${padding}px)`);
                    if (distTop < padding) paddingErrors.push(`Top (${distTop.toFixed(1)}px < ${padding}px)`);
                    if (distRight < padding) paddingErrors.push(`Right (${distRight.toFixed(1)}px < ${padding}px)`);
                    if (distBottom < padding) paddingErrors.push(`Bottom (${distBottom.toFixed(1)}px < ${padding}px)`);

                    if (paddingErrors.length > 0) {
                        violations.push({
                            type: 'spacing_padding',
                            expected: { padding: padding },
                            found: { left: distLeft, top: distTop, right: distRight, bottom: distBottom },
                            element_id: element.element_id,
                            severity: 'error',
                            message: `Element violates padding safety zone: ${paddingErrors.join(', ')}`
                        });
                    }
                }
            }

            // B. Element-to-Element Gap & Overlap Check
            for (let j = index + 1; j < elements.length; j++) {
                const otherElement = elements[j];
                const otherBounds = getBounds(otherElement);
                
                // SKIP if the OTHER element is Artboard/Background
                if (isIgnoredElement(otherElement, otherBounds)) {
                    continue;
                }

                // Check Overlap
                // Uses (x + width) to find the right edge for comparison
                const isOverlapping = (
                    bounds.x < otherBounds.x + otherBounds.width &&
                    bounds.x + bounds.width > otherBounds.x &&
                    bounds.y < otherBounds.y + otherBounds.height &&
                    bounds.y + bounds.height > otherBounds.y
                );

                if (isOverlapping) {
                    violations.push({
                        type: 'spacing_overlap',
                        expected: 'No Overlap',
                        found: 'Overlapping',
                        element_id: element.element_id,
                        related_element_id: otherElement.element_id,
                        severity: 'error',
                        message: `Element overlaps with ${otherElement.element_id || 'another element'}`
                    });
                } else {
                    // Check Gap (Distance between edges)
                    const horizontalDist = Math.max(0, bounds.x - (otherBounds.x + otherBounds.width), otherBounds.x - (bounds.x + bounds.width));
                    const verticalDist = Math.max(0, bounds.y - (otherBounds.y + otherBounds.height), otherBounds.y - (bounds.y + bounds.height));
                    
                    const distance = Math.max(horizontalDist, verticalDist);

                    if (distance > 0 && distance < gap) {
                        violations.push({
                            type: 'spacing_gap',
                            expected: { gap: gap },
                            found: { distance: distance },
                            element_id: element.element_id,
                            related_element_id: otherElement.element_id,
                            severity: 'warning',
                            message: `Distance (${distance.toFixed(1)}px) is less than required gap (${gap}px)`
                        });
                    }
                }
            }
        });
    }

    // ==========================================
    // 2. ORIGINAL STYLE VALIDATION LOGIC
    // ==========================================
    documentData.elements.forEach(element => {
        const elementViolations = [];
        
        // SKIP Artboard/Background for all style checks
        if (isIgnoredElement(element, getBounds(element))) {
            return;
        }

        // --- Font Family ---
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

        // --- Font Size ---
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

        // --- Color & Contrast ---
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

        // --- Background Color ---
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

        // --- Shadows ---
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

        // --- Borders ---
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

        // --- Original Property-Based Spacing Checks ---
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