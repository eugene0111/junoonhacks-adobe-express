import { planFixes } from '../services/fixPlanner.js';
import { validateBrandProfile, validateViolations, validateActions } from '../middleware/schemaValidation.js';
import logger from '../utils/logger.js';

export async function planFixesEndpoint(req, res, next) {
    try {
        const { violations, brand_profile, options } = req.body;

        const violationsValidation = validateViolations(violations);
        if (!violationsValidation.valid) {
            logger.warn('Invalid violations', { details: violationsValidation.details });
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: violationsValidation.error,
                details: violationsValidation.details
            });
        }

        const brandValidation = validateBrandProfile(brand_profile);
        if (!brandValidation.valid) {
            logger.warn('Invalid brand profile in fix planning', { details: brandValidation.details });
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: brandValidation.error,
                details: brandValidation.details
            });
        }

        logger.info('Planning fixes', {
            violations_count: violations.length,
            fix_all_similar: options?.fixAllSimilar || false
        });

        const fixPlan = planFixes(violations, brand_profile, options || {});

        logger.info('Fix plan created', {
            actions_count: fixPlan.actions.length
        });

        res.json({
            success: true,
            fix_plan: fixPlan,
            ready_to_execute: true,
            estimated_time_ms: fixPlan.actions.length * 50
        });
    } catch (error) {
        logger.error('Error planning fixes', { error: error.message, stack: error.stack });
        if (error.message === 'brandProfile is required for fix planning') {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: error.message
            });
        }
        next(error);
    }
}

export async function executeFixes(req, res, next) {
    try {
        const { actions } = req.body;

        const actionsValidation = validateActions(actions);
        if (!actionsValidation.valid) {
            logger.warn('Invalid actions', { details: actionsValidation.details });
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: actionsValidation.error,
                details: actionsValidation.details
            });
        }

        logger.info('Executing fixes', { actions_count: actions.length });

        const executed = actions.map((action, index) => {
            try {
                return {
                    ...action,
                    status: 'success',
                    executed_at: new Date().toISOString(),
                    execution_order: index + 1
                };
            } catch (execError) {
                logger.warn('Action execution failed', {
                    action: action.action,
                    element_id: action.element_id,
                    error: execError.message
                });
                return {
                    ...action,
                    status: 'failed',
                    error: execError.message,
                    executed_at: new Date().toISOString(),
                    execution_order: index + 1
                };
            }
        });

        const successful = executed.filter(a => a.status === 'success').length;
        const failed = executed.filter(a => a.status === 'failed').length;

        logger.info('Fixes executed', {
            total: executed.length,
            successful: successful,
            failed: failed
        });

        res.json({
            success: true,
            executed: executed,
            summary: {
                total: executed.length,
                successful: successful,
                failed: failed,
                success_rate: executed.length > 0 ? (successful / executed.length * 100).toFixed(2) + '%' : '0%'
            }
        });
    } catch (error) {
        logger.error('Error executing fixes', { error: error.message, stack: error.stack });
        next(error);
    }
}
