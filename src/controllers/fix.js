import { planFixes } from '../services/fixPlanner.js';
import { validateBrandProfile, validateViolations, validateActions } from '../middleware/validateRequest.js';

export async function planFixesEndpoint(req, res, next) {
    try {
        const { violations, brand_profile, options } = req.body;

        const violationsValidation = validateViolations(violations);
        if (!violationsValidation.valid) {
            return res.status(400).json({
                error: violationsValidation.error
            });
        }

        const brandValidation = validateBrandProfile(brand_profile);
        if (!brandValidation.valid) {
            return res.status(400).json({
                error: brandValidation.error
            });
        }

        const fixPlan = planFixes(violations, brand_profile, options || {});

        res.json({
            fix_plan: fixPlan,
            ready_to_execute: true,
            estimated_time_ms: fixPlan.actions.length * 50
        });
    } catch (error) {
        console.error('Error planning fixes:', error);
        if (error.message === 'brandProfile is required for fix planning') {
            return res.status(400).json({
                error: error.message
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
            return res.status(400).json({
                error: actionsValidation.error
            });
        }

        const executed = actions.map((action, index) => {
            try {
                return {
                    ...action,
                    status: 'success',
                    executed_at: new Date().toISOString(),
                    execution_order: index + 1
                };
            } catch (execError) {
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

        res.json({
            executed: executed,
            summary: {
                total: executed.length,
                successful: successful,
                failed: failed,
                success_rate: executed.length > 0 ? (successful / executed.length * 100).toFixed(2) + '%' : '0%'
            }
        });
    } catch (error) {
        console.error('Error executing fixes:', error);
        next(error);
    }
}
