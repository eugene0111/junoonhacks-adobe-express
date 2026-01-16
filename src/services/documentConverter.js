export function convertAdobeDocument(adobeDocument) {
    const elements = [];

    if (!adobeDocument || !adobeDocument.elements) {
        return { elements: [] };
    }

    adobeDocument.elements.forEach((element, index) => {
        const convertedElement = {
            element_id: element.id || `element_${index}`,
            type: element.type || 'unknown',
            styles: {}
        };

        if (element.textStyle) {
            convertedElement.styles.font_family = element.textStyle.fontFamily || null;
            convertedElement.styles.font_size = element.textStyle.fontSize || null;
            convertedElement.styles.font_weight = element.textStyle.fontWeight || null;
            convertedElement.styles.font_style = element.textStyle.fontStyle || null;
            convertedElement.styles.text_align = element.textStyle.textAlign || null;
        }

        if (element.fill) {
            if (typeof element.fill === 'string') {
                convertedElement.styles.color = element.fill;
            } else if (element.fill.type === 'solid') {
                convertedElement.styles.color = element.fill.color || null;
            } else if (element.fill.type === 'gradient') {
                convertedElement.styles.color = element.fill.stops?.[0]?.color || null;
            }
        }

        if (element.backgroundColor) {
            convertedElement.styles.background_color = element.backgroundColor;
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

export function normalizeFontFamily(fontFamily) {
    if (!fontFamily) return null;
    
    return fontFamily
        .replace(/['"]/g, '')
        .split(',')[0]
        .trim()
        .toLowerCase();
}

export function normalizeColor(color) {
    if (!color) return null;
    
    if (typeof color === 'string') {
        return color.trim().toLowerCase();
    }
    
    if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
        const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
        const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
        const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    
    return null;
}
