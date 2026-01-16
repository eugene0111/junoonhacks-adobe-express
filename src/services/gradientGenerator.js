export function generateGradient(brandProfile, options = {}) {
    const { type = 'linear', direction = 'to right', stops = 2 } = options;
    
    if (!brandProfile || !brandProfile.colors) {
        throw new Error('Brand profile with colors is required');
    }

    const colors = brandProfile.colors;
    const colorArray = [];

    if (stops === 2) {
        colorArray.push(colors.primary || '#000000');
        colorArray.push(colors.secondary || colors.accent || colors.primary || '#FFFFFF');
    } else if (stops === 3) {
        colorArray.push(colors.primary || '#000000');
        colorArray.push(colors.accent || colors.secondary || colors.primary || '#FFD700');
        colorArray.push(colors.secondary || colors.primary || '#FFFFFF');
    } else {
        colorArray.push(colors.primary || '#000000');
        if (colors.accent) colorArray.push(colors.accent);
        if (colors.secondary) colorArray.push(colors.secondary);
        colorArray.push(colors.background || '#FFFFFF');
    }

    if (type === 'linear') {
        return generateLinearGradient(colorArray, direction);
    } else if (type === 'radial') {
        return generateRadialGradient(colorArray, options.center || 'center');
    } else if (type === 'conic') {
        return generateConicGradient(colorArray, options.angle || 0);
    }

    return generateLinearGradient(colorArray, direction);
}

function generateLinearGradient(colors, direction) {
    const stops = colors.map((color, index) => {
        const position = (index / (colors.length - 1)) * 100;
        return `${color} ${position}%`;
    }).join(', ');

    return {
        type: 'linear',
        css: `linear-gradient(${direction}, ${stops})`,
        direction: direction,
        colors: colors,
        stops: colors.map((color, index) => ({
            color: color,
            position: (index / (colors.length - 1)) * 100
        })),
        sdk_payload: {
            type: 'linear',
            direction: direction,
            stops: colors.map((color, index) => ({
                color: color,
                offset: index / (colors.length - 1)
            }))
        }
    };
}

function generateRadialGradient(colors, center) {
    const stops = colors.map((color, index) => {
        const position = (index / (colors.length - 1)) * 100;
        return `${color} ${position}%`;
    }).join(', ');

    return {
        type: 'radial',
        css: `radial-gradient(circle at ${center}, ${stops})`,
        center: center,
        colors: colors,
        stops: colors.map((color, index) => ({
            color: color,
            position: (index / (colors.length - 1)) * 100
        })),
        sdk_payload: {
            type: 'radial',
            center: center,
            stops: colors.map((color, index) => ({
                color: color,
                offset: index / (colors.length - 1)
            }))
        }
    };
}

function generateConicGradient(colors, angle) {
    const stops = colors.map((color, index) => {
        const position = (index / colors.length) * 100;
        return `${color} ${position}%`;
    }).join(', ');

    return {
        type: 'conic',
        css: `conic-gradient(from ${angle}deg, ${stops})`,
        angle: angle,
        colors: colors,
        stops: colors.map((color, index) => ({
            color: color,
            position: (index / colors.length) * 100
        })),
        sdk_payload: {
            type: 'conic',
            angle: angle,
            stops: colors.map((color, index) => ({
                color: color,
                offset: index / colors.length
            }))
        }
    };
}
