import { convertAdobeDocument } from '../services/documentConverter.js';
import { detectViolations } from '../services/violationDetector.js';
import { groupViolations } from '../services/violationGrouper.js';
import { validateBrandProfile, validateDocumentData } from '../middleware/schemaValidation.js';
import logger from '../utils/logger.js';

export async function validateDesign(req, res, next) {
    try {
        const { brand_profile, document_data } = req.body;

        // Check if required fields are present
        if (!brand_profile) {
            logger.warn('Missing brand_profile in request');
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'brand_profile is required',
                details: []
            });
        }

        if (!document_data) {
            logger.warn('Missing document_data in request');
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'document_data is required',
                details: []
            });
        }

        // Validate brand profile structure
        const brandValidation = validateBrandProfile(brand_profile);
        if (!brandValidation.valid) {
            logger.warn('Invalid brand profile', { details: brandValidation.details });
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: brandValidation.error,
                details: brandValidation.details
            });
        }

        // Validate document data structure
        const documentValidation = validateDocumentData(document_data);
        if (!documentValidation.valid) {
            logger.warn('Invalid document data', { details: documentValidation.details });
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: documentValidation.error,
                details: documentValidation.details
            });
        }

        // Check if document has elements
        if (!document_data.elements || document_data.elements.length === 0) {
            logger.info('Empty document - no elements to validate');
            return res.json({
                success: true,
                violations: [],
                grouped: { by_type: {} },
                summary: {
                    total: 0,
                    errors: 0,
                    warnings: 0,
                    by_type: []
                }
            });
        }

        logger.info('Validating design', {
            elements_count: document_data.elements?.length || 0
        });

        const convertedDocument = convertAdobeDocument(document_data);
        const violations = detectViolations(brand_profile, convertedDocument);
        const groupedViolations = groupViolations(violations);

        logger.info('Design validation complete', {
            violations_count: violations.length,
            errors: violations.filter(v => (v.severity || 'warning') === 'error').length,
            warnings: violations.filter(v => (v.severity || 'error') === 'warning').length
        });

        res.json({
            success: true,
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
        logger.error('Error validating design', { error: error.message, stack: error.stack });
        next(error);
    }
}
