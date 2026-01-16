export function groupViolations(violations) {
    const grouped = {
        by_type: {},
        by_element: {},
        by_severity: {
            error: [],
            warning: []
        },
        similar_violations: []
    };

    violations.forEach(violation => {
        const violationType = violation.type || 'unknown';
        const elementId = violation.element_id || 'unknown';
        const severity = violation.severity || 'warning';

        if (!grouped.by_type[violationType]) {
            grouped.by_type[violationType] = [];
        }
        grouped.by_type[violationType].push(violation);

        if (!grouped.by_element[elementId]) {
            grouped.by_element[elementId] = [];
        }
        grouped.by_element[elementId].push(violation);

        if (!grouped.by_severity[severity]) {
            grouped.by_severity[severity] = [];
        }
        grouped.by_severity[severity].push(violation);
    });

    grouped.similar_violations = findSimilarViolations(violations);

    return grouped;
}

function findSimilarViolations(violations) {
    const similarGroups = [];
    const processed = new Set();

    violations.forEach((violation, index) => {
        if (processed.has(index)) return;

        const similarGroup = [violation];
        processed.add(index);

        violations.forEach((otherViolation, otherIndex) => {
            if (index === otherIndex || processed.has(otherIndex)) return;

            if (areSimilar(violation, otherViolation)) {
                similarGroup.push(otherViolation);
                processed.add(otherIndex);
            }
        });

        if (similarGroup.length > 1) {
            similarGroups.push({
                type: violation.type,
                count: similarGroup.length,
                violations: similarGroup,
                can_fix_all: true
            });
        }
    });

    return similarGroups;
}

function areSimilar(violation1, violation2) {
    if (violation1.type !== violation2.type) return false;

    if (violation1.type === 'font_size') {
        return violation1.expected === violation2.expected && 
               Math.abs(violation1.found - violation2.found) <= 2;
    }

    if (violation1.type === 'font_family') {
        return violation1.expected === violation2.expected && 
               violation1.found === violation2.found;
    }

    if (violation1.type === 'color' || violation1.type === 'background_color') {
        return violation1.expected === violation2.expected && 
               violation1.found === violation2.found;
    }

    return false;
}
