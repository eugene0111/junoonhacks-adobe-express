export function planFixes(violations, brandProfile, options = {}) {
    const { fixAllSimilar = false, selectedViolations = [] } = options;

    if (!violations || !Array.isArray(violations) || violations.length === 0) {
        return {
            actions: [],
            summary: {
                total_fixes: 0,
                by_type: {}
            }
        };
    }

    if (!brandProfile) {
        throw new Error('brandProfile is required for fix planning');
    }

    const actions = [];

    if (fixAllSimilar && selectedViolations.length > 0) {
        const violationGroups = groupSelectedViolationsByType(selectedViolations);

        Object.keys(violationGroups).forEach(violationType => {
            const group = violationGroups[violationType];
            group.forEach(({ expectedValue }) => {
                const similarViolations = violations.filter(v => 
                    v.type === violationType && 
                    v.expected === expectedValue &&
                    !actions.some(a => a.element_id === v.element_id && a.action === getActionType(violationType))
                );

                similarViolations.forEach(v => {
                    const action = createFixAction(v, brandProfile);
                    if (action) {
                        actions.push(action);
                    }
                });
            });
        });
    } else if (selectedViolations.length > 0) {
        selectedViolations.forEach(violation => {
            const action = createFixAction(violation, brandProfile);
            if (action && !actions.some(a => a.element_id === action.element_id && a.action === action.action)) {
                actions.push(action);
            }
        });
    } else {
        violations.forEach(violation => {
            // Avoid duplicate fixes for the same element and same action type
            if (!actions.some(a => a.element_id === violation.element_id && a.action === getActionType(violation.type))) {
                const action = createFixAction(violation, brandProfile);
                if (action) {
                    actions.push(action);
                }
            }
        });
    }

    return {
        actions: actions,
        summary: {
            total_fixes: actions.length,
            by_type: groupActionsByType(actions)
        }
    };
}

function groupSelectedViolationsByType(selectedViolations) {
    const groups = {};
    selectedViolations.forEach(violation => {
        const type = violation.type || 'unknown';
        const expected = violation.expected;
        if (!groups[type]) {
            groups[type] = [];
        }
        const exists = groups[type].some(g => g.expectedValue === expected);
        if (!exists) {
            groups[type].push({ violation, expectedValue: expected });
        }
    });
    return groups;
}

function getActionType(violationType) {
    const actionMap = {
        'font_size': 'update_font_size',
        'font_family': 'update_font_family',
        'color': 'update_color',
        'background_color': 'update_background_color',
        'contrast': 'update_color',
        'shadow': 'apply_shadow',
        'border': 'update_border',
        'spacing': 'apply_spacing',
        'spacing_padding': 'move_element',
        'out_of_bounds': 'move_element',
        'spacing_overlap': 'move_element'
    };
    return actionMap[violationType] || 'unknown';
}

function createFixAction(violation, brandProfile) {
    switch (violation.type) {
        case 'spacing_overlap':
            return createOverlapFix(violation, brandProfile);

        case 'spacing_padding':
            return createSpatialPaddingFix(violation, brandProfile);

        case 'out_of_bounds':
            return createOutOfBoundsFix(violation);

        case 'font_size':
            return {
                action: 'update_font_size',
                element_id: violation.element_id,
                value: violation.expected,
                description: `Update font size from ${violation.found}px to ${violation.expected}px`,
                payload: {
                    textStyle: {
                        fontSize: violation.expected
                    }
                }
            };

        case 'font_family': {
            const targetFont = determineTargetFont(violation, brandProfile);
            return {
                action: 'update_font_family',
                element_id: violation.element_id,
                value: targetFont,
                description: `Update font family from "${violation.found}" to "${targetFont}"`,
                payload: {
                    textStyle: {
                        fontFamily: targetFont
                    }
                }
            };
        }

        case 'color':
            const validPalette = [
                brandProfile.colors.primary,
                brandProfile.colors.secondary,
                brandProfile.colors.accent,
                brandProfile.colors.text,
                brandProfile.colors.background
            ].filter(Boolean);

            return {
                action: 'update_color',
                element_id: violation.element_id,
                value: violation.expected,
                description: `Update color from "${violation.found}" to "${violation.expected}"`,
                payload: {
                    fill: violation.expected,
                    brandPalette: validPalette
                }
            };

        case 'background_color':
            return {
                action: 'update_background_color',
                element_id: violation.element_id,
                value: violation.expected,
                description: `Update background color from "${violation.found}" to "${violation.expected}"`,
                payload: {
                    backgroundColor: violation.expected
                }
            };

        case 'shadow':
            return createShadowAction(violation, brandProfile);

        case 'border':
            return createBorderAction(violation, brandProfile);

        case 'spacing':
            return createSpacingAction(violation, brandProfile);

        case 'contrast':
            return {
                action: 'update_color',
                element_id: violation.element_id,
                value: violation.expected,
                description: `Fix contrast ratio: update color to meet WCAG AA standards`,
                payload: {
                    fill: violation.expected
                }
            };

        default:
            return null;
    }
}

// --- NEW FIX LOGIC ---

function createOverlapFix(violation, brandProfile) {
    // If the detector didn't pass bounds, we cannot calculate a move.
    if (!violation.found || !violation.found.bounds || !violation.found.related_bounds) {
        return null;
    }

    const A = violation.found.bounds;
    const B = violation.found.related_bounds;
    const gap = brandProfile.spacing?.gap || 10;

    // We want to move A so it no longer overlaps B.
    // There are 4 possible directions. We choose the smallest move.

    // 1. Move A to the LEFT of B
    // New A.x + A.width = B.x - gap  =>  New A.x = B.x - gap - A.width
    // dx = New A.x - Old A.x
    const moveLeftVal = (B.x - gap - A.width) - A.x;

    // 2. Move A to the RIGHT of B
    // New A.x = B.x + B.width + gap
    // dx = New A.x - Old A.x
    const moveRightVal = (B.x + B.width + gap) - A.x;

    // 3. Move A UP (Above B)
    // New A.y + A.height = B.y - gap => New A.y = B.y - gap - A.height
    // dy = New A.y - Old A.y
    const moveUpVal = (B.y - gap - A.height) - A.y;

    // 4. Move A DOWN (Below B)
    // New A.y = B.y + B.height + gap
    // dy = New A.y - Old A.y
    const moveDownVal = (B.y + B.height + gap) - A.y;

    // Determine minimal distance (absolute value of move)
    const moves = [
        { dir: 'left',  val: Math.abs(moveLeftVal),  dx: moveLeftVal,  dy: 0 },
        { dir: 'right', val: Math.abs(moveRightVal), dx: moveRightVal, dy: 0 },
        { dir: 'up',    val: Math.abs(moveUpVal),    dx: 0,            dy: moveUpVal },
        { dir: 'down',  val: Math.abs(moveDownVal),  dx: 0,            dy: moveDownVal }
    ];

    // Sort by smallest distance
    moves.sort((a, b) => a.val - b.val);
    const best = moves[0];

    return {
        action: 'move_element',
        element_id: violation.element_id,
        value: { dx: best.dx, dy: best.dy },
        description: `Move element ${best.dir} to clear overlap with other element`,
        payload: {
            motion: {
                dx: best.dx,
                dy: best.dy,
                isAbsolute: false
            }
        }
    };
}

function createSpatialPaddingFix(violation, brandProfile) {
    const padding = brandProfile.spacing?.padding || 0;
    
    let moveX = 0;
    let moveY = 0;
    const found = violation.found;

    if (found.left < padding) {
        moveX += (padding - found.left);
    }
    if (found.top < padding) {
        moveY += (padding - found.top);
    }
    if (found.right < padding) {
        moveX -= (padding - found.right);
    }
    if (found.bottom < padding) {
        moveY -= (padding - found.bottom);
    }

    return {
        action: 'move_element',
        element_id: violation.element_id,
        value: { dx: moveX, dy: moveY },
        description: `Adjust position to respect padding`,
        payload: {
            motion: {
                dx: moveX,
                dy: moveY,
                isAbsolute: false
            }
        }
    };
}

function createOutOfBoundsFix(violation) {
    const bounds = violation.found;
    const canvas = violation.expected;
    
    let newX = bounds.x;
    let newY = bounds.y;
    
    if (bounds.x < 0) newX = 0;
    if (bounds.y < 0) newY = 0;
    
    // Check right edge
    if (bounds.right > canvas.width) {
        newX = canvas.width - (bounds.right - bounds.x);
    }
    // Check bottom edge
    if (bounds.bottom > canvas.height) {
        newY = canvas.height - (bounds.bottom - bounds.y);
    }

    return {
        action: 'move_element',
        element_id: violation.element_id,
        value: { x: newX, y: newY },
        description: `Move element inside canvas boundaries`,
        payload: {
            motion: {
                x: newX,
                y: newY,
                isAbsolute: true
            }
        }
    };
}

// --- EXISTING HELPERS ---

function createShadowAction(violation, brandProfile) {
    const shadow = brandProfile.shadows || {
        enabled: true,
        x: 0,
        y: 4,
        blur: 12,
        color: '#00000015'
    };

    return {
        action: 'apply_shadow',
        element_id: violation.element_id,
        value: shadow,
        description: `Apply brand shadow (x: ${shadow.x}, y: ${shadow.y}, blur: ${shadow.blur})`,
        payload: {
            shadow: {
                x: shadow.x,
                y: shadow.y,
                blur: shadow.blur,
                color: shadow.color,
                enabled: shadow.enabled
            }
        }
    };
}

function createBorderAction(violation, brandProfile) {
    const border = brandProfile.borders || {
        radius: 12,
        width: 2,
        style: 'solid'
    };

    return {
        action: 'update_border',
        element_id: violation.element_id,
        value: border,
        description: `Apply brand border (radius: ${border.radius}px, width: ${border.width}px)`,
        payload: {
            borderRadius: border.radius,
            borderWidth: border.width,
            borderStyle: border.style
        }
    };
}

function createSpacingAction(violation, brandProfile) {
    const spacing = brandProfile.spacing || {
        padding: 24,
        margin: 16,
        gap: 12
    };

    return {
        action: 'apply_spacing',
        element_id: violation.element_id,
        value: spacing,
        description: `Apply brand spacing (padding: ${spacing.padding}px, margin: ${spacing.margin}px)`,
        payload: {
            padding: spacing.padding,
            margin: spacing.margin,
            gap: spacing.gap
        }
    };
}

function determineTargetFont(violation, brandProfile) {
    if (!brandProfile || !brandProfile.fonts) {
        return null;
    }

    if (violation.expected === brandProfile.fonts.heading) {
        return brandProfile.fonts.heading;
    }

    if (violation.expected === brandProfile.fonts.body) {
        return brandProfile.fonts.body;
    }

    if (violation.found_font_size && brandProfile.fonts) {
        const foundSize = parseFloat(violation.found_font_size);
        if (foundSize >= brandProfile.fonts.h1_size) {
            return brandProfile.fonts.heading;
        } else if (foundSize >= brandProfile.fonts.h2_size) {
            return brandProfile.fonts.heading;
        } else if (foundSize >= brandProfile.fonts.h3_size) {
            return brandProfile.fonts.heading;
        }
    }

    return brandProfile.fonts.body;
}

function groupActionsByType(actions) {
    const grouped = {};
    actions.forEach(action => {
        if (!grouped[action.action]) {
            grouped[action.action] = 0;
        }
        grouped[action.action]++;
    });
    return grouped;
}