import { Buffer } from 'buffer';

const TEXTURE_PRESETS = {
    professional: [
        {
            id: 'subtle-grain',
            name: 'Subtle Grain',
            type: 'overlay',
            svg: generateGrainSVG(0.3),
            description: 'Subtle texture for professional designs'
        },
        {
            id: 'geometric-grid',
            name: 'Geometric Grid',
            type: 'pattern',
            svg: generateGridSVG(20, '#00000010'),
            description: 'Clean geometric pattern'
        },
        {
            id: 'minimal-dots',
            name: 'Minimal Dots',
            type: 'pattern',
            svg: generateDotsSVG(4, 20, '#00000008'),
            description: 'Subtle dot pattern'
        }
    ],
    modern: [
        {
            id: 'tech-grid',
            name: 'Tech Grid',
            type: 'pattern',
            svg: generateGridSVG(15, '#00000015'),
            description: 'Modern tech-inspired grid'
        },
        {
            id: 'smooth-grain',
            name: 'Smooth Grain',
            type: 'overlay',
            svg: generateGrainSVG(0.2),
            description: 'Smooth modern texture'
        },
        {
            id: 'hex-pattern',
            name: 'Hex Pattern',
            type: 'pattern',
            svg: generateHexSVG(30, '#00000010'),
            description: 'Modern hexagonal pattern'
        }
    ],
    friendly: [
        {
            id: 'soft-grain',
            name: 'Soft Grain',
            type: 'overlay',
            svg: generateGrainSVG(0.15),
            description: 'Soft, friendly texture'
        },
        {
            id: 'organic-dots',
            name: 'Organic Dots',
            type: 'pattern',
            svg: generateDotsSVG(6, 25, '#00000006'),
            description: 'Organic, friendly pattern'
        }
    ],
    luxury: [
        {
            id: 'fine-grain',
            name: 'Fine Grain',
            type: 'overlay',
            svg: generateGrainSVG(0.4),
            description: 'Fine texture for luxury designs'
        },
        {
            id: 'elegant-pattern',
            name: 'Elegant Pattern',
            type: 'pattern',
            svg: generateElegantPattern(),
            description: 'Elegant luxury pattern'
        }
    ],
    playful: [
        {
            id: 'bold-grain',
            name: 'Bold Grain',
            type: 'overlay',
            svg: generateGrainSVG(0.5),
            description: 'Bold, playful texture'
        },
        {
            id: 'fun-dots',
            name: 'Fun Dots',
            type: 'pattern',
            svg: generateDotsSVG(8, 15, '#00000012'),
            description: 'Playful dot pattern'
        },
        {
            id: 'zigzag',
            name: 'Zigzag',
            type: 'pattern',
            svg: generateZigzagSVG(20, '#00000010'),
            description: 'Playful zigzag pattern'
        }
    ]
};

export function getTexturesForTone(tone, brandColors = {}) {
    const toneKey = tone?.toLowerCase() || 'professional';
    const textures = TEXTURE_PRESETS[toneKey] || TEXTURE_PRESETS.professional;

    return textures.map(texture => {
        const base64 = Buffer.from(texture.svg).toString('base64');
        return {
            ...texture,
            url: `data:image/svg+xml;base64,${base64}`,
            preview_url: texture.url || `data:image/svg+xml;base64,${base64}`,
            compatible_colors: getCompatibleColors(texture, brandColors)
        };
    });
}

export function getTextureById(id) {
    for (const toneTextures of Object.values(TEXTURE_PRESETS)) {
        const texture = toneTextures.find(t => t.id === id);
        if (texture) {
            const base64 = Buffer.from(texture.svg).toString('base64');
            return {
                ...texture,
                url: `data:image/svg+xml;base64,${base64}`
            };
        }
    }
    return null;
}

function getCompatibleColors(texture, brandColors) {
    if (!brandColors.primary) return [];
    
    return [
        brandColors.primary,
        brandColors.secondary || brandColors.primary,
        brandColors.accent || brandColors.primary
    ].filter(Boolean);
}

function generateGrainSVG(intensity) {
    const opacity = Math.min(intensity, 0.5);
    return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
            <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" opacity="${opacity}"/>
    </svg>`;
}

function generateGridSVG(size, color) {
    return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="grid" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
                <path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="${color}" stroke-width="1"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
    </svg>`;
}

function generateDotsSVG(radius, spacing, color) {
    return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="dots" x="0" y="0" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
                <circle cx="${spacing/2}" cy="${spacing/2}" r="${radius}" fill="${color}"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)"/>
    </svg>`;
}

function generateHexSVG(size, color) {
    const hexPath = `M ${size} 0 L ${size*1.5} ${size*0.866} L ${size} ${size*1.732} L 0 ${size*1.732} L ${-size*0.5} ${size*0.866} Z`;
    return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="hex" x="0" y="0" width="${size*2}" height="${size*1.732}" patternUnits="userSpaceOnUse">
                <path d="${hexPath}" fill="none" stroke="${color}" stroke-width="1"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)"/>
    </svg>`;
}

function generateElegantPattern() {
    return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="elegant" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="2" fill="#00000008"/>
                <path d="M 0 20 L 40 20 M 20 0 L 20 40" stroke="#00000005" stroke-width="1"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#elegant)"/>
    </svg>`;
}

function generateZigzagSVG(size, color) {
    return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="zigzag" x="0" y="0" width="${size}" height="${size*2}" patternUnits="userSpaceOnUse">
                <path d="M 0 ${size} L ${size/2} 0 L ${size} ${size} L ${size} ${size*2}" 
                      fill="none" stroke="${color}" stroke-width="1"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#zigzag)"/>
    </svg>`;
}
