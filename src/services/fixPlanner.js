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
            const action = createFixAction(violation, brandProfile);
            if (action) {
                actions.push(action);
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
        'spacing': 'apply_spacing'
    };
    return actionMap[violationType] || 'unknown';
}

function createFixAction(violation, brandProfile) {
    switch (violation.type) {
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
            return {
                action: 'update_color',
                element_id: violation.element_id,
                value: violation.expected,
                description: `Update color from "${violation.found}" to "${violation.expected}"`,
                payload: {
                    fill: violation.expected
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
