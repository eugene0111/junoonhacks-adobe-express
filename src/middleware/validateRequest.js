export function validateBrandProfile(brandProfile) {
    if (!brandProfile) {
        return { valid: false, error: 'brand_profile is required' };
    }

    if (!brandProfile.fonts) {
        return { valid: false, error: 'brand_profile.fonts is required' };
    }

    if (!brandProfile.fonts.heading || !brandProfile.fonts.body) {
        return { valid: false, error: 'brand_profile.fonts.heading and brand_profile.fonts.body are required' };
    }

    if (!brandProfile.colors) {
        return { valid: false, error: 'brand_profile.colors is required' };
    }

    if (!brandProfile.colors.primary || !brandProfile.colors.text || !brandProfile.colors.background) {
        return { valid: false, error: 'brand_profile.colors.primary, colors.text, and colors.background are required' };
    }

    return { valid: true };
}

export function validateDocumentData(documentData) {
    if (!documentData) {
        return { valid: false, error: 'document_data is required' };
    }

    if (!Array.isArray(documentData.elements)) {
        return { valid: false, error: 'document_data.elements must be an array' };
    }

    return { valid: true };
}

export function validateViolations(violations) {
    if (!Array.isArray(violations)) {
        return { valid: false, error: 'violations must be an array' };
    }

    for (const violation of violations) {
        if (!violation.type || !violation.element_id) {
            return { valid: false, error: 'Each violation must have type and element_id' };
        }
    }

    return { valid: true };
}

export function validateActions(actions) {
    if (!Array.isArray(actions)) {
        return { valid: false, error: 'actions must be an array' };
    }

    for (const action of actions) {
        if (!action.action || !action.element_id) {
            return { valid: false, error: 'Each action must have action and element_id' };
        }
    }

    return { valid: true };
}
