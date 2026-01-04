import { supabase } from '../services/supabaseService.js';

/**
 * Middleware to resolve and validate unit access via slug
 * Expects :slug param in route or req.body.unitSlug
 */
export async function resolveUnit(req, res, next) {
    try {
        const slug = req.params.slug || req.body.unitSlug || req.query.unitSlug;

        if (!slug) {
            // If no slug provided, we can continue without unit context (e.g. super admin login)
            // But if route REQUIRES unit, it should check req.unit later.
            return next();
        }

        const { data: unit, error } = await supabase
            .from('units')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error || !unit) {
            return res.status(404).json({ error: 'Unit not found' });
        }

        req.unit = unit; // Attach unit to request
        next();
    } catch (error) {
        console.error('Unit Resolution Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Middleware to ensure request is within valid unit context
 */
export function requireUnitContext(req, res, next) {
    if (!req.unit) {
        return res.status(400).json({ error: 'Unit context required' });
    }
    next();
}
