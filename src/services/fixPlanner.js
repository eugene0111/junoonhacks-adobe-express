export function planFixes(violations, brandProfile, options = {}) {
    const { fixAllSimilar = false, selectedViolations = [] } = options;

    const actions = [];

    if (fixAllSimilar && selectedViolations.length > 0) {
        const violationType = selectedViolations[0].type;
        const expectedValue = selectedViolations[0].expected;

        const similarViolations = violations.filter(v => 
            v.type === violationType && v.expected === expectedValue
        );

        similarViolations.forEach(violation => {
            const action = createFixAction(violation, brandProfile);
            if (action) {
                actions.push(action);
            }
        });
    } else if (selectedViolations.length > 0) {
        selectedViolations.forEach(violation => {
            const action = createFixAction(violation, brandProfile);
            if (action) {
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

function createFixAction(violation, brandProfile) {
    switch (violation.type) {
        case 'font_size':
            return {
                action: 'update_font_size',
                element_id: violation.element_id,
                value: violation.expected,
                description: `Update font size from ${violation.found}px to ${violation.expected}px`
            };

        case 'font_family': {
            const targetFont = determineTargetFont(violation, brandProfile);
            return {
                action: 'update_font_family',
                element_id: violation.element_id,
                value: targetFont,
                description: `Update font family from "${violation.found}" to "${targetFont}"`
            };
        }

        case 'color':
            return {
                action: 'update_color',
                element_id: violation.element_id,
                value: violation.expected,
                description: `Update color from "${violation.found}" to "${violation.expected}"`
            };

        case 'background_color':
            return {
                action: 'update_background_color',
                element_id: violation.element_id,
                value: violation.expected,
                description: `Update background color from "${violation.found}" to "${violation.expected}"`
            };

        default:
            return null;
    }
}

function determineTargetFont(violation, brandProfile) {
    if (violation.expected === brandProfile.fonts.heading) {
        return brandProfile.fonts.heading;
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
