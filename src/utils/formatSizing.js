/**
 * Format-specific sizing rules for different post formats
 * Ensures sizing is strictly coherent with format type
 */

export const FORMAT_SIZING_RULES = {
    instagram_post: {
        // Instagram post: 1080x1080px (square)
        max_width: 1080,
        max_height: 1080,
        fonts: {
            h1_size: 48,
            h2_size: 36,
            h3_size: 24,
            body_size: 16,
            caption_size: 12
        },
        spacing: {
            padding: 24,
            margin: 16,
            gap: 12
        }
    },
    instagram_story: {
        // Instagram story: 1080x1920px (vertical)
        max_width: 1080,
        max_height: 1920,
        fonts: {
            h1_size: 64,
            h2_size: 48,
            h3_size: 32,
            body_size: 20,
            caption_size: 14
        },
        spacing: {
            padding: 32,
            margin: 24,
            gap: 16
        }
    },
    facebook_post: {
        // Facebook post: 1200x630px (landscape)
        max_width: 1200,
        max_height: 630,
        fonts: {
            h1_size: 42,
            h2_size: 32,
            h3_size: 24,
            body_size: 18,
            caption_size: 14
        },
        spacing: {
            padding: 28,
            margin: 20,
            gap: 14
        }
    },
    facebook_cover: {
        // Facebook cover: 1200x675px
        max_width: 1200,
        max_height: 675,
        fonts: {
            h1_size: 56,
            h2_size: 42,
            h3_size: 28,
            body_size: 20,
            caption_size: 14
        },
        spacing: {
            padding: 32,
            margin: 24,
            gap: 16
        }
    },
    twitter_post: {
        // Twitter post: 1200x675px
        max_width: 1200,
        max_height: 675,
        fonts: {
            h1_size: 40,
            h2_size: 30,
            h3_size: 22,
            body_size: 16,
            caption_size: 12
        },
        spacing: {
            padding: 24,
            margin: 18,
            gap: 12
        }
    },
    linkedin_post: {
        // LinkedIn post: 1200x627px
        max_width: 1200,
        max_height: 627,
        fonts: {
            h1_size: 44,
            h2_size: 34,
            h3_size: 26,
            body_size: 18,
            caption_size: 14
        },
        spacing: {
            padding: 26,
            margin: 20,
            gap: 14
        }
    },
    banner: {
        // Web banner: 728x90px (standard)
        max_width: 728,
        max_height: 90,
        fonts: {
            h1_size: 24,
            h2_size: 18,
            h3_size: 14,
            body_size: 12,
            caption_size: 10
        },
        spacing: {
            padding: 8,
            margin: 6,
            gap: 4
        }
    },
    poster: {
        // Poster: 18x24 inches (2160x2880px at 120dpi)
        max_width: 2160,
        max_height: 2880,
        fonts: {
            h1_size: 120,
            h2_size: 96,
            h3_size: 72,
            body_size: 48,
            caption_size: 36
        },
        spacing: {
            padding: 60,
            margin: 48,
            gap: 36
        }
    },
    youtube_thumbnail: {
        // YouTube thumbnail: 1280x720px
        max_width: 1280,
        max_height: 720,
        fonts: {
            h1_size: 64,
            h2_size: 48,
            h3_size: 36,
            body_size: 24,
            caption_size: 18
        },
        spacing: {
            padding: 32,
            margin: 24,
            gap: 16
        }
    },
    email_header: {
        // Email header: 600x200px
        max_width: 600,
        max_height: 200,
        fonts: {
            h1_size: 32,
            h2_size: 24,
            h3_size: 18,
            body_size: 14,
            caption_size: 12
        },
        spacing: {
            padding: 16,
            margin: 12,
            gap: 8
        }
    }
};

/**
 * Get sizing rules for a specific format
 * @param {string} format - The format type
 * @returns {Object} Format-specific sizing rules
 */
export function getFormatSizing(format) {
    const normalizedFormat = format.toLowerCase().replace(/\s+/g, '_');
    
    if (!FORMAT_SIZING_RULES[normalizedFormat]) {
        // Default to instagram_post if format not found
        console.warn(`Format "${format}" not found, using default instagram_post sizing`);
        return FORMAT_SIZING_RULES.instagram_post;
    }
    
    return FORMAT_SIZING_RULES[normalizedFormat];
}

/**
 * Normalize format name
 * @param {string} format - The format type
 * @returns {string} Normalized format name
 */
export function normalizeFormat(format) {
    return format.toLowerCase().replace(/\s+/g, '_');
}
