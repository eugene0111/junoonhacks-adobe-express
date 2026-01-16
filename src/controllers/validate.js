import { convertAdobeDocument } from '../services/documentConverter.js';
import { detectViolations } from '../services/violationDetector.js';
import { groupViolations } from '../services/violationGrouper.js';
import { validateBrandProfile, validateDocumentData } from '../middleware/validateRequest.js';

export async function validateDesign(req, res, next) {
    try {
        const { brand_profile, document_data } = req.body;

        const brandValidation = validateBrandProfile(brand_profile);
        if (!brandValidation.valid) {
            return res.status(400).json({
                error: brandValidation.error
            });
        }

        const documentValidation = validateDocumentData(document_data);
        if (!documentValidation.valid) {
            return res.status(400).json({
                error: documentValidation.error
            });
        }

        const convertedDocument = convertAdobeDocument(document_data);
        const violations = detectViolations(brand_profile, convertedDocument);
        const groupedViolations = groupViolations(violations);

        res.json({
            violations: violations,
            grouped: groupedViolations,
            summary: {
                total: violations.length,
                errors: violations.filter(v => (v.severity || 'warning') === 'error').length,
                warnings: violations.filter(v => (v.severity || 'error') === 'warning').length,
                by_type: Object.keys(groupedViolations.by_type).map(type => ({
                    type: type,
                    count: groupedViolations.by_type[type].length
                }))
            }
        });
    } catch (error) {
        console.error('Error validating design:', error);
        next(error);
    }
}
