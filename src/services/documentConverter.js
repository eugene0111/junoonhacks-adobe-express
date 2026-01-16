import { normalizeFontFamily, normalizeColor } from '../utils/css.js';

export function convertAdobeDocument(adobeDocument) {
    const elements = [];

    if (!adobeDocument || !adobeDocument.elements) {
        return { elements: [] };
    }

    adobeDocument.elements.forEach((element, index) => {
        const convertedElement = {
            element_id: element.id || `element_${index}`,
            type: element.type || 'unknown',
            styles: {},
            original_id: element.id
        };

        if (element.textStyle) {
            const rawFontFamily = element.textStyle.fontFamily || null;
            convertedElement.styles.font_family = normalizeFontFamily(rawFontFamily);
            convertedElement.styles.font_size = element.textStyle.fontSize ? parseFloat(element.textStyle.fontSize) : null;
            convertedElement.styles.font_weight = element.textStyle.fontWeight || null;
            convertedElement.styles.font_style = element.textStyle.fontStyle || null;
            convertedElement.styles.text_align = element.textStyle.textAlign || null;
        }

        if (element.fill) {
            let rawColor = null;
            if (typeof element.fill === 'string') {
                rawColor = element.fill;
            } else if (element.fill && typeof element.fill === 'object' && element.fill.type === 'solid') {
                rawColor = element.fill.color || null;
            } else if (element.fill && typeof element.fill === 'object' && element.fill.type === 'gradient') {
                rawColor = element.fill.stops?.[0]?.color || null;
            }
            convertedElement.styles.color = normalizeColor(rawColor);
        }

        if (element.backgroundColor) {
            convertedElement.styles.background_color = normalizeColor(element.backgroundColor);
        }

        if (element.borderRadius) {
            convertedElement.styles.border_radius = element.borderRadius;
        }

        if (element.padding) {
            convertedElement.styles.padding = element.padding;
        }

        if (element.margin) {
            convertedElement.styles.margin = element.margin;
        }

        if (element.shadow) {
            convertedElement.styles.shadow = element.shadow;
        }

        elements.push(convertedElement);
    });

    return { elements };
}
