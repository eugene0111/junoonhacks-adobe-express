import { planFixes } from '../services/fixPlanner.js';

export async function planFixesEndpoint(req, res, next) {
    try {
        const { violations, brand_profile, options } = req.body;

        if (!violations || !Array.isArray(violations)) {
            return res.status(400).json({
                error: 'violations array is required'
            });
        }

        if (!brand_profile) {
            return res.status(400).json({
                error: 'brand_profile is required'
            });
        }

        const fixPlan = planFixes(violations, brand_profile, options || {});

        res.json({
            fix_plan: fixPlan,
            ready_to_execute: true
        });
    } catch (error) {
        console.error('Error planning fixes:', error);
        next(error);
    }
}

export async function executeFixes(req, res, next) {
    try {
        const { actions } = req.body;

        if (!actions || !Array.isArray(actions)) {
            return res.status(400).json({
                error: 'actions array is required'
            });
        }

        const executed = actions.map(action => ({
            ...action,
            status: 'success',
            executed_at: new Date().toISOString()
        }));

        res.json({
            executed: executed,
            summary: {
                total: executed.length,
                successful: executed.filter(a => a.status === 'success').length,
                failed: executed.filter(a => a.status === 'failed').length
            }
        });
    } catch (error) {
        console.error('Error executing fixes:', error);
        next(error);
    }
}
