import { generateGradient } from '../services/gradientGenerator.js';
import { getTexturesForTone, getTextureById } from '../services/textureLibrary.js';
import { validateBrandProfile } from '../middleware/schemaValidation.js';
import logger from '../utils/logger.js';

export async function addTexture(req, res, next) {
    try {
        const { brand_profile, texture_id } = req.body;

        if (!brand_profile) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'brand_profile is required'
            });
        }

        const validation = validateBrandProfile(brand_profile);
        if (!validation.valid) {
            logger.warn('Invalid brand profile in addTexture', { details: validation.details });
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: validation.error,
                details: validation.details
            });
        }

        const tone = brand_profile.tone || 'professional';
        let textures;

        if (texture_id) {
            const texture = getTextureById(texture_id);
            if (!texture) {
                return res.status(404).json({
                    success: false,
                    error: 'NotFound',
                    message: `Texture with id "${texture_id}" not found`
                });
            }
            textures = [texture];
        } else {
            textures = getTexturesForTone(tone, brand_profile.colors);
        }

        logger.info('Textures retrieved', {
            tone: tone,
            count: textures.length,
            texture_id: texture_id || 'all'
        });

        res.json({
            success: true,
            textures: textures,
            tone: tone,
            count: textures.length
        });
    } catch (error) {
        logger.error('Error in addTexture', { error: error.message, stack: error.stack });
        next(error);
    }
}

export async function applyGradient(req, res, next) {
    try {
        const { brand_profile, options } = req.body;

        if (!brand_profile) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'brand_profile is required'
            });
        }

        const validation = validateBrandProfile(brand_profile);
        if (!validation.valid) {
            logger.warn('Invalid brand profile in applyGradient', { details: validation.details });
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: validation.error,
                details: validation.details
            });
        }

        const gradient = generateGradient(brand_profile, options || {});

        logger.info('Gradient generated', {
            type: gradient.type,
            colors_count: gradient.colors.length
        });

        res.json({
            success: true,
            gradient: gradient
        });
    } catch (error) {
        logger.error('Error in applyGradient', { error: error.message, stack: error.stack });
        next(error);
    }
}
