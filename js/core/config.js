/**
 * js/core/config.js
 * Frontend Configuration & Shared Utilities
 */

const Config = {

    // Domain & URLs
    DOMAIN: 'wouk1805.com',
    PROTOCOL: 'https',

    get BASE_URL() {
        return `${this.PROTOCOL}://${this.DOMAIN}`;
    },

    // Project Identity
    PROJECT_NAME: 'PrepGenius',
    PROJECT_TAGLINE: 'AI-Powered Interview Preparation',
    PROJECT_VERSION: '1.0.0',

    get PROJECT_SLUG() {
        return this.PROJECT_NAME.toLowerCase().replace(/[^a-z0-9]/g, '');
    },

    get PROJECT_URL() {
        return `${this.BASE_URL}/projects/${this.PROJECT_SLUG}`;
    },

    // API Configuration
    get API_BASE_URL() {
        const base = window.location.hostname === 'localhost'
            ? `http://localhost/projects/${this.PROJECT_SLUG}`
            : this.PROJECT_URL;
        return `${base}/api`;
    },

    // Defaults
    DEFAULT_LANGUAGE: 'en',
    DEFAULT_QUESTION_STYLE: 'balanced',

    // Interview Types
    INTERVIEW_TYPES: {
        full: { name: 'Full Interview', questions: 8, duration: 20, icon: '\u{1F4CB}' },
        behavioral: { name: 'Behavioral', questions: 5, duration: 12, icon: '\u{1F4AC}' },
        technical: { name: 'Technical', questions: 5, duration: 12, icon: '\u{1F9E0}' },
        quick: { name: 'Quick Practice', questions: 3, duration: 8, icon: '\u{26A1}' }
    },

    // Audio Settings
    MIN_AUDIO_BLOB_SIZE: 1000,

    // Video Settings
    VIDEO_MAX_FRAMES: 50
};

Object.freeze(Config);
Object.freeze(Config.INTERVIEW_TYPES);