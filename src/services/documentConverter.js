import { normalizeFontFamily, normalizeColor } from '../utils/css.js';

export function convertAdobeDocument(adobeDocument) {
    // 1. Robust Dimension Extraction
    // Check inside 'dimensions' object, or at root, or 'artboard'
    let width = 0;
    let height = 0;

    if (adobeDocument.dimensions) {
        width = parseFloat(adobeDocument.dimensions.width) || 0;
        height = parseFloat(adobeDocument.dimensions.height) || 0;
    } else if (adobeDocument.width && adobeDocument.height) {
        width = parseFloat(adobeDocument.width) || 0;
        height = parseFloat(adobeDocument.height) || 0;
    } else if (adobeDocument.artboard) {
        width = parseFloat(adobeDocument.artboard.width) || 0;
        height = parseFloat(adobeDocument.artboard.height) || 0;
    }

    // --- FALLBACK: Default to 2550x3300 if no dimensions found ---
    if (width === 0 || height === 0) {
        width = 2550;
        height = 3300;
    }

    const elements = [];
    if (!adobeDocument || !adobeDocument.elements) {
        return { elements: [], width, height };
    }

    adobeDocument.elements.forEach((element, index) => {
        // 2. Robust Bounds Extraction
        // Try 'bounds', then 'frame', then 'position'+'size', then direct x/y
        let bounds = { x: 0, y: 0, width: 0, height: 0 };

        if (element.bounds) {
            bounds = {
                x: parseFloat(element.bounds.x) || 0,
                y: parseFloat(element.bounds.y) || 0,
                width: parseFloat(element.bounds.width) || 0,
                height: parseFloat(element.bounds.height) || 0
            };
        } else if (element.frame) {
            bounds = {
                x: parseFloat(element.frame.x) || 0,
                y: parseFloat(element.frame.y) || 0,
                width: parseFloat(element.frame.width) || 0,
                height: parseFloat(element.frame.height) || 0
            };
        } else if (element.position) {
            // Using user's potential format
            bounds = {
                x: parseFloat(element.position.x) || 0,
                y: parseFloat(element.position.y) || 0,
                width: element.size ? (parseFloat(element.size.width) || 0) : 0,
                height: element.size ? (parseFloat(element.size.height) || 0) : 0
            };
        } else if (element.x !== undefined || element.y !== undefined) {
             bounds = {
                x: parseFloat(element.x) || 0,
                y: parseFloat(element.y) || 0,
                width: parseFloat(element.width) || 0,
                height: parseFloat(element.height) || 0
            };
        }

        const convertedElement = {
            element_id: element.id || `element_${index}`,
            type: element.type || 'unknown',
            styles: {},
            bounds: bounds,
            original_id: element.id
        };

        // Extract Text Styles
        if (element.textStyle) {
            const rawFontFamily = element.textStyle.fontFamily || null;
            convertedElement.styles.font_family = normalizeFontFamily(rawFontFamily);
            convertedElement.styles.font_size = element.textStyle.fontSize ? parseFloat(element.textStyle.fontSize) : null;
            convertedElement.styles.font_weight = element.textStyle.fontWeight || null;
            convertedElement.styles.font_style = element.textStyle.fontStyle || null;
            convertedElement.styles.text_align = element.textStyle.textAlign || null;
            
            if (element.textStyle.color) {
                convertedElement.styles.color = normalizeColor(element.textStyle.color);
            }
        }

        // Extract Fill Color
        if (!convertedElement.styles.color && element.fill) {
            let rawColor = null;
            if (typeof element.fill === 'string') {
                rawColor = element.fill;
            } else if (element.fill && typeof element.fill === 'object') {
                // Handle "solid" type or generic object with color property
                rawColor = element.fill.color || (element.fill.type === 'solid' ? element.fill.color : null);
                
                // Handle gradients (take first stop)
                if (!rawColor && element.fill.stops && element.fill.stops.length > 0) {
                    rawColor = element.fill.stops[0].color;
                }
            }
            
            if (rawColor) {
                convertedElement.styles.color = normalizeColor(rawColor);
            }
        }

        // Extract Other Styles
        if (element.backgroundColor) {
            convertedElement.styles.background_color = normalizeColor(element.backgroundColor);
        }
        if (element.borderRadius) {
            convertedElement.styles.border_radius = element.borderRadius;
        }
        if (element.padding !== undefined) {
            convertedElement.styles.padding = element.padding;
        }
        if (element.margin !== undefined) {
            convertedElement.styles.margin = element.margin;
        }
        if (element.shadow) {
            convertedElement.styles.shadow = element.shadow;
        }

        elements.push(convertedElement);
    });

    return { 
        elements, 
        width,
        height
    };
}