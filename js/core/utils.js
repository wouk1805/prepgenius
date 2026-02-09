/**
 * js/core/utils.js
 * Shared DOM & Data Utilities
 */

const Utils = {
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /** Remove all HTML tags, returning plain text. */
    stripHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent || '';
    },

    /** Allow only safe inline tags (strong, em, b, i, br); escape everything else. */
    sanitizeHtml(text) {
        if (!text) return '';
        const allowed = ['strong', 'em', 'br', 'b', 'i'];
        return text.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (tag, name) =>
            allowed.includes(name.toLowerCase()) ? tag : Utils.escapeHtml(tag)
        );
    },

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    createEmptySpeechMetrics() {
        return {
            word_count: 0,
            filler_words: { total_count: 0, breakdown: {} },
            pace_wpm: 0,
            response_times: []
        };
    },

    /** Map a short language code to its full BCP 47 locale tag. */
    toLocale(lang) {
        const locales = { fr: 'fr-FR', en: 'en-US' };
        return locales[lang] || 'en-US';
    },

    /**
     * Resolve a bilingual display_title object to a plain string.
     * Used for JD position titles, CV candidate names, etc.
     *
     * @param {Object|null} data    - Object that may contain a `display_title` map
     * @param {string}      lang    - Preferred language code ('en' or 'fr')
     * @param {string[]}    keys    - Fallback property paths to try on `data`
     * @param {string}      fallback - Default string when nothing matches
     */
    resolveDisplayTitle(data, lang, keys = [], fallback = '') {
        if (!data) return fallback;

        const dt = data.display_title;
        if (dt) {
            const resolved = dt[lang] || dt.en || dt.fr;
            if (resolved) return resolved;
        }

        for (const key of keys) {
            const parts = key.split('.');
            let val = data;
            for (const p of parts) {
                val = val?.[p];
            }
            if (val) return val;
        }

        return fallback;
    },

    /**
     * Resolve a position value to a plain string for the given language.
     * Accepts either a bilingual map ({en, fr}) or a plain string.
     */
    resolvePosition(position, lang, fallback = '') {
        if (!position) return fallback;
        if (typeof position === 'string') return position;
        return position[lang] || position.en || position.fr || fallback;
    },

    /**
     * Extract the raw bilingual display_title map from parsed document data.
     * Falls back to building a single-language map from scalar fields.
     */
    extractPositionMap(data, lang, keys = []) {
        if (!data) return null;

        const dt = data.display_title;
        if (dt && typeof dt === 'object' && (dt.en || dt.fr)) {
            return dt;
        }

        for (const key of keys) {
            const parts = key.split('.');
            let val = data;
            for (const p of parts) {
                val = val?.[p];
            }
            if (val && typeof val === 'string') {
                return { [lang]: val };
            }
        }

        return null;
    }
};