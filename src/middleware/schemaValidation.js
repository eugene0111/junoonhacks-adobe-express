import { z } from 'zod';

const brandProfileSchema = z.object({
    fonts: z.object({
        heading: z.string().min(1),
        body: z.string().min(1),
        h1_size: z.number().positive(),
        h2_size: z.number().positive(),
        h3_size: z.number().positive(),
        body_size: z.number().positive(),
        caption_size: z.number().positive()
    }),
    colors: z.object({
        primary: z.string(),
        secondary: z.string().optional(),
        accent: z.string().optional(),
        background: z.string(),
        text: z.string()
    }),
    spacing: z.object({
        padding: z.number().nonnegative(),
        margin: z.number().nonnegative(),
        gap: z.number().nonnegative()
    }).optional(),
    borders: z.object({
        radius: z.number().nonnegative(),
        width: z.number().nonnegative(),
        style: z.string()
    }).optional(),
    shadows: z.object({
        enabled: z.boolean(),
        x: z.number(),
        y: z.number(),
        blur: z.number(),
        color: z.string()
    }).optional(),
    tone: z.string().optional()
});

const documentElementSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    textStyle: z.object({
        fontFamily: z.string().optional(),
        fontSize: z.union([z.number(), z.string()]).optional(),
        fontWeight: z.union([z.string(), z.number()]).optional(),
        fontStyle: z.string().optional(),
        textAlign: z.string().optional()
    }).optional(),
    fill: z.union([
        z.string(),
        z.object({
            type: z.string(),
            color: z.string().optional(),
            stops: z.array(z.object({
                color: z.string()
            })).optional()
        })
    ]).optional(),
    backgroundColor: z.string().optional(),
    borderRadius: z.number().optional(),
    padding: z.number().optional(),
    margin: z.number().optional(),
    shadow: z.any().optional()
});

const documentDataSchema = z.object({
    elements: z.array(documentElementSchema)
});

const violationSchema = z.object({
    type: z.string(),
    expected: z.any(),
    found: z.any(),
    element_id: z.string(),
    severity: z.enum(['error', 'warning']).optional(),
    message: z.string().optional()
});

const actionSchema = z.object({
    action: z.string(),
    element_id: z.string(),
    value: z.any(),
    description: z.string().optional()
});

export function validateBrandProfile(data) {
    try {
        brandProfileSchema.parse(data);
        return { valid: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                valid: false,
                error: 'Invalid brand profile',
                details: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            };
        }
        return { valid: false, error: 'Validation failed' };
    }
}

export function validateDocumentData(data) {
    try {
        documentDataSchema.parse(data);
        return { valid: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                valid: false,
                error: 'Invalid document data',
                details: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            };
        }
        return { valid: false, error: 'Validation failed' };
    }
}

export function validateViolations(data) {
    if (!Array.isArray(data)) {
        return { valid: false, error: 'violations must be an array' };
    }
    
    try {
        z.array(violationSchema).parse(data);
        return { valid: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                valid: false,
                error: 'Invalid violations format',
                details: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            };
        }
        return { valid: false, error: 'Validation failed' };
    }
}

export function validateActions(data) {
    if (!Array.isArray(data)) {
        return { valid: false, error: 'actions must be an array' };
    }
    
    try {
        z.array(actionSchema).parse(data);
        return { valid: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                valid: false,
                error: 'Invalid actions format',
                details: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            };
        }
        return { valid: false, error: 'Validation failed' };
    }
}
