/**
 * js/share.js
 * Share Page Controller
 * 
 * Handles loading and displaying shared interview feedback
 * with bilingual support and live language switching
 */

const ShareViewer = {
    shareId: null,
    shareData: null,
    errorState: null,
    _keyboardHandler: null,

    async init() {
        this.restoreLanguage();
        this.setupEventListeners();
        this.applyTranslations();

        this.shareId = this.extractShareId();
        
        if (!this.shareId) {
            this.showError('Invalid share link');
            return;
        }

        this.showLoading();

        try {
            this.shareData = await this.loadShareData(this.shareId);
            
            if (!this.shareData) {
                this.showError('Share not found');
                return;
            }

            if (this.shareData.language && !localStorage.getItem('language')) {
                i18n.setLanguage(this.shareData.language);
                this.syncLanguageSelector();
                document.documentElement.lang = i18n.getLanguage();
            }

            this.updatePageMeta();
            this.renderFeedback();

        } catch (e) {
            if (e.message === 'Share not found') {
                console.warn('Share not found:', this.shareId);
            } else {
                console.error('Failed to load share:', e);
            }
            this.showError(e.message || 'Failed to load share');
        }
    },

    restoreLanguage() {
        const saved = localStorage.getItem('language');
        if (saved && i18n[saved]) {
            i18n.setLanguage(saved);
        }
        document.documentElement.lang = i18n.getLanguage();
        this.syncLanguageSelector();
    },

    setupEventListeners() {
        document.getElementById('language-select')?.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });
    },

    extractShareId() {
        const path = window.location.pathname;
        const match = path.match(/\/share\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    },

    async loadShareData(shareId) {
        const response = await fetch(`${this.getApiBaseUrl()}/share/${shareId}`);

        if (!response.ok) {
            throw new Error('Share not found');
        }

        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error('Share not found');
        }

        if (!result.success) {
            throw new Error(result.message || 'Share not found');
        }

        return result.data;
    },

    getApiBaseUrl() {
        if (window.PREPGENIUS_BASE_PATH) {
            return `${window.location.origin}${window.PREPGENIUS_BASE_PATH}/api`;
        }
        const path = window.location.pathname;
        const match = path.match(/^(\/projects\/[^/]+)/);
        const basePath = match ? match[1] : '';
        return `${window.location.origin}${basePath}/api`;
    },

    setLanguage(lang) {
        i18n.setLanguage(lang);
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        this.syncLanguageSelector();
        this.applyTranslations();
        if (this.shareData) {
            this.updatePageMeta();
            this.renderFeedback();
        }
        if (this.errorState) {
            this.updateErrorContent();
        }
    },

    applyTranslations() {
        const headerTitle = document.getElementById('share-header-title');
        if (headerTitle) {
            headerTitle.textContent = i18n.t('share.header');
        }

        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = i18n.t(el.getAttribute('data-i18n-title'));
        });
    },

    syncLanguageSelector() {
        const select = document.getElementById('language-select');
        if (select) select.value = i18n.getLanguage();
    },

    updatePageMeta() {
        const lang = i18n.getLanguage();
        const position = Utils.resolvePosition(this.shareData.position, lang)
            || i18n.t('nav.interview')
            || 'Interview';
        const appName = window.APP_NAME || '';

        document.title = i18n.t('share.pageTitle', { position, appName });

        const dateEl = document.getElementById('share-date');
        if (dateEl && this.shareData.created_at) {
            const date = new Date(this.shareData.created_at);
            const dateStr = date.toLocaleDateString(Utils.toLocale(lang), {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            dateEl.textContent = i18n.t('share.date', { date: dateStr });
        }

        const positionEl = document.getElementById('share-position');
        if (positionEl) {
            positionEl.textContent = position;
        }
    },

    renderFeedback() {
        const container = document.getElementById('share-feedback-content');
        if (!container) return;

        const savedIndex = FeedbackRenderer.currentQuestionIndex || 0;

        document.getElementById('share-loading')?.classList.add('hidden');
        document.getElementById('share-content')?.classList.remove('hidden');

        const resolvedFeedback = FeedbackUtils.resolveFeedback(this.shareData.feedback, i18n.getLanguage());

        const data = {
            feedback: resolvedFeedback,
            transcript: this.shareData.transcript,
            speechMetrics: this.shareData.speech_metrics,
            language: i18n.getLanguage()
        };

        FeedbackRenderer.render(container, data, {
            readOnly: true,
            showActions: false,
            showShareButton: false,
            showCTA: true
        });

        if (savedIndex > 0 && savedIndex < FeedbackRenderer.questionFeedback.length) {
            FeedbackRenderer.goToQuestion(savedIndex, container);
        }

        this.setupKeyboardShortcuts(container);
    },

    setupKeyboardShortcuts(container) {
        if (this._keyboardHandler) {
            document.removeEventListener('keydown', this._keyboardHandler);
        }

        this._keyboardHandler = (e) => {
            if (FeedbackRenderer.questionFeedback.length === 0) return;
            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                FeedbackRenderer.navigateQuestion(-1, container);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                FeedbackRenderer.navigateQuestion(1, container);
            }
        };

        document.addEventListener('keydown', this._keyboardHandler);
    },

    showLoading() {
        document.getElementById('share-loading')?.classList.remove('hidden');
        document.getElementById('share-content')?.classList.add('hidden');
        document.getElementById('share-error')?.classList.add('hidden');
    },

    showError(messageKey) {
        this.errorState = messageKey;
        document.getElementById('share-loading')?.classList.add('hidden');
        document.getElementById('share-content')?.classList.add('hidden');
        document.getElementById('share-error')?.classList.remove('hidden');
        this.updateErrorContent();
    },

    updateErrorContent() {
        const titleEl = document.getElementById('share-error-title');
        const msgEl = document.getElementById('share-error-message');
        const backEl = document.getElementById('share-error-back');

        if (titleEl) titleEl.textContent = i18n.t('share.error.title');
        if (msgEl) msgEl.textContent = i18n.t('share.error.message');
        if (backEl) backEl.textContent = '\u2190 ' + i18n.t('share.error.back');

        const headerTitle = document.getElementById('share-header-title');
        if (headerTitle) {
            headerTitle.textContent = i18n.t('share.header');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ShareViewer.init();
});