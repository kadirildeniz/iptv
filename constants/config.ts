/**
 * Uygulama sabit değerleri
 * Magic number kullanımını önlemek için bu dosyayı kullanın
 */

export const CONFIG = {
    // API
    API_TIMEOUT: 15000,

    // Sync
    CHUNK_SIZE: 500,

    // Player
    CONTROLS_AUTO_HIDE_DELAY: 4000,
    BRIGHTNESS_GESTURE_SENSITIVITY: 0.005,
    VOLUME_GESTURE_SENSITIVITY: 0.005,
    SEEK_STEP_SECONDS: 10,

    // Cache
    IMAGE_CACHE_POLICY: 'memory-disk' as const,

    // Database
    WATCH_HISTORY_LIMIT: 100,
    SEARCH_RESULT_LIMIT: 20,
    AI_RECOMMENDATION_LIMIT: 15,
};

export const COLORS = {
    // Primary
    PRIMARY: '#0033ab',
    PRIMARY_LIGHT: '#3b82f6',

    // Accent
    ACCENT: '#00E5FF',

    // Background
    BACKGROUND_DARK: '#0f172a',
    BACKGROUND_CARD: '#1e293b',

    // Text
    TEXT_PRIMARY: '#ffffff',
    TEXT_SECONDARY: '#94a3b8',
    TEXT_MUTED: '#64748b',

    // States
    ERROR: '#ef4444',
    SUCCESS: '#22c55e',
    WARNING: '#f59e0b',

    // Favorites
    FAVORITE_ACTIVE: '#f97316',
};

export const FONTS = {
    REGULAR: 'Outfit-Regular',
    MEDIUM: 'Outfit-Medium',
    SEMIBOLD: 'Outfit-SemiBold',
    BOLD: 'Outfit-Bold',
};
