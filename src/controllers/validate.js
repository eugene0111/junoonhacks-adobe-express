import { convertAdobeDocument } from '../services/documentConverter.js';
import { detectViolations } from '../services/violationDetector.js';
import { groupViolations } from '../services/violationGrouper.js';

export async function validateDesign(req, res, next) {
    try {
        const { brand_profile, document_data } = req.body;

        if (!brand_profile) {
            return res.status(400).json({
                error: 'brand_profile is required'
            });
        }

        if (!document_data) {
            return res.status(400).json({
                error: 'document_data is required'
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
                errors: violations.filter(v => v.severity === 'error').length,
                warnings: violations.filter(v => v.severity === 'warning').length,
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
