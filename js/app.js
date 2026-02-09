/**
 * js/app.js
 * Main Application Controller
 *
 * Handles initialization, navigation, state management, and coordination
 */

class App {
    constructor() {
        this.state = {
            section: 'home',
            step: 1,
            language: Config.DEFAULT_LANGUAGE,
            questionStyle: Config.DEFAULT_QUESTION_STYLE,

            // Document data
            cvData: null,
            jdData: null,
            matchAnalysis: null,

            // Interviewer data
            interviewerProfiles: [],
            interviewerPersonas: [],
            currentInterviewerIndex: 0,

            // Interview state
            interviewActive: false,
            interviewComplete: false,
            conversationHistory: [],
            questionsAsked: 0,
            totalQuestions: 10,
            interviewType: 'full',

            // Input state
            isRecording: false,
            inputMode: 'voice',

            // Timing
            startTime: null,
            lastQuestionTime: null,

            // Metrics
            speechMetrics: Utils.createEmptySpeechMetrics(),

            // Media state
            videoEnabled: false,
            voiceEnabled: true,
            ttsEngine: 'browser',
            isSpeaking: false,

            // Processing state
            abortController: null,
            isProcessing: false,

            // Feedback state
            questionFeedback: [],
            currentQuestionIndex: 0,
            lastFeedback: null,
            lastTranscript: null,
            lastSpeechMetrics: null,

            // History state
            historyCollapsed: false,
            viewingHistoryFeedback: false,
            historyPosition: null
        };

        this.timer = null;
        this.uploadManager = null;
        this.interviewManager = null;
        this.feedbackManager = null;
        this._previousFocus = null;

        this.init();
    }

    // =========================================================================
    // CONVENIENCE GETTERS
    // =========================================================================
    getTranscript() {
        return this.state.lastTranscript || this.state.conversationHistory;
    }

    getSpeechMetrics() {
        return this.state.lastSpeechMetrics || this.state.speechMetrics;
    }

    init() {
        this.restoreLanguage();

        document.getElementById('app-name').textContent = Config.PROJECT_NAME;
        document.title = `${Config.PROJECT_NAME} - ${Config.PROJECT_TAGLINE}`;

        const footerLink = document.getElementById('footer-website-link');
        if (footerLink) footerLink.href = Config.BASE_URL;

        this.uploadManager = new UploadManager(this);
        this.interviewManager = new InterviewManager(this);
        this.feedbackManager = new FeedbackManager(this);

        this.setupNavigation();
        this.setupKeyboardShortcuts();
        this.setupEventListeners();
        this.updateNavState();
        this.updateInterviewButtons();
        this.checkCookieConsent();
        this.applyTranslations();
        this.populateTypeQuestions();
        this.uploadManager.renumberInterviewers();

        this.loadHistoryCollapseState();
        this.refreshHistorySection();

        window.addEventListener('historyUpdated', () => this.refreshHistorySection());
    }

    setupEventListeners() {
        // Logo click
        document.getElementById('logo-home')?.addEventListener('click', () => {
            this.showSection('home');
        });

        // Language selector
        document.getElementById('language-select')?.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        // Hero section buttons
        document.getElementById('btn-start-preparing')?.addEventListener('click', () => {
            this.startPreparing();
        });

        document.getElementById('btn-learn-more')?.addEventListener('click', () => {
            document.querySelector('.features')?.scrollIntoView({ behavior: 'smooth' });
        });

        // Step navigation buttons
        document.getElementById('btn-next-1')?.addEventListener('click', () => this.nextStep());
        document.getElementById('btn-next-2')?.addEventListener('click', () => this.nextStep());
        document.getElementById('btn-back-2')?.addEventListener('click', () => this.prevStep());
        document.getElementById('btn-back-3')?.addEventListener('click', () => this.prevStep());
        document.getElementById('btn-back-4')?.addEventListener('click', () => this.prevStep());

        // Step progress clicks
        document.querySelectorAll('.steps-progress .step').forEach(step => {
            step.addEventListener('click', () => {
                const stepNum = parseInt(step.dataset.step);
                this.goToStep(stepNum);
            });
        });

        // Interviewer management
        document.getElementById('add-interviewer-btn')?.addEventListener('click', () => {
            this.uploadManager.addInterviewer();
        });

        // Interviewer remove buttons are handled via event delegation in UploadManager

        // Step 3 buttons
        document.getElementById('btn-skip-step')?.addEventListener('click', () => {
            this.uploadManager.prepareInterview({ skipResearch: true });
        });

        document.getElementById('btn-research')?.addEventListener('click', () => {
            this.uploadManager.prepareInterview();
        });

        // Step 4 - Interview type selection
        document.querySelectorAll('input[name="int-type"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.state.interviewType = radio.value;
                    this.state.totalQuestions = Config.INTERVIEW_TYPES[radio.value]?.questions || 10;
                }
            });
        });

        // Step 4 - Start interview
        document.getElementById('btn-start-interview')?.addEventListener('click', () => {
            this.interviewManager.startInterview();
        });

        // Toggle TTS engine row visibility when Voice Mode changes
        document.getElementById('opt-voice')?.addEventListener('change', (e) => {
            const ttsRow = document.getElementById('tts-engine-row');
            if (ttsRow) ttsRow.style.display = e.target.checked ? '' : 'none';
        });

        // Verify Gemini API quota when user selects the Gemini TTS engine
        document.getElementById('opt-tts-engine')?.addEventListener('change', (e) => {
            if (e.target.value === 'gemini') {
                this.interviewManager.checkTtsQuota();
            }
        });

        // Interview controls
        document.getElementById('btn-reset-interview')?.addEventListener('click', () => {
            this.interviewManager.resetInterview();
        });

        document.getElementById('btn-end-interview')?.addEventListener('click', () => {
            this.interviewManager.endInterviewEarly();
        });

        // Mode tabs
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.interviewManager.setMode(btn.dataset.mode);
            });
        });

        // Recording and response buttons
        document.getElementById('record-btn')?.addEventListener('click', () => {
            this.interviewManager.toggleRecording();
        });

        document.getElementById('btn-send')?.addEventListener('click', () => {
            this.interviewManager.submitText();
        });

        document.getElementById('btn-skip')?.addEventListener('click', () => {
            this.interviewManager.skipQuestion();
        });

        // Cookie banner
        document.getElementById('btn-accept-cookies')?.addEventListener('click', () => {
            this.acceptCookies();
        });

        document.getElementById('btn-decline-cookies')?.addEventListener('click', () => {
            this.declineCookies();
        });

        // Modal overlay
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            this.closeModalOnOverlay(e);
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Share modal - copy link
        document.getElementById('btn-copy-share-link')?.addEventListener('click', () => {
            this.feedbackManager.copyShareLink();
        });
    }

    // =========================================================================
    // TRANSLATION SYSTEM
    // =========================================================================
    t(key, params = {}) {
        return i18n.t(key, params);
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = this.t(el.getAttribute('data-i18n'));
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = this.t(el.getAttribute('data-i18n-title'));
        });

        document.title = `${Config.PROJECT_NAME} - ${this.state.language === 'fr' ? 'Pr\u00E9paration d\'entretien avec IA' : Config.PROJECT_TAGLINE}`;
        this.updateDynamicTranslations();
        this.retranslateToast();

        this.uploadManager.refreshResultLanguage();

        if (this.state.matchAnalysis) {
            this.uploadManager.displayMatchSummary(this.state.matchAnalysis);
        }

        this.refreshHistorySection();
        this.feedbackManager.refreshFeedbackLanguage();
    }

    populateTypeQuestions() {
        document.querySelectorAll('.type-questions[data-type]').forEach(el => {
            const type = Config.INTERVIEW_TYPES[el.dataset.type];
            if (type) el.textContent = type.questions;
        });
    }

    updateDynamicTranslations() {
        const recText = document.querySelector('.rec-text');
        if (recText && !this.state.isRecording) {
            recText.textContent = this.t('interview.record');
        }

        const styleSelect = document.getElementById('question-style');
        if (styleSelect) {
            const options = styleSelect.querySelectorAll('option');
            if (options.length >= 3) {
                options[0].textContent = '\u26A1 ' + this.t('ready.style.concise');
                options[1].textContent = '\u{1F4AC} ' + this.t('ready.style.balanced');
                options[2].textContent = '\u{1F50D} ' + this.t('ready.style.detailed');
            }
        }
    }

    retranslateToast() {
        const toast = document.querySelector('.notification-toast[data-i18n-key]');
        if (!toast) return;
        const key = toast.dataset.i18nKey;
        const params = toast.dataset.i18nParams ? JSON.parse(toast.dataset.i18nParams) : {};
        toast.textContent = this.t(key, params);
    }

    setLanguage(lang) {
        this.state.language = lang;
        i18n.setLanguage(lang);
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        this.syncLanguageSelector();
        this.applyTranslations();
    }

    restoreLanguage() {
        const saved = localStorage.getItem('language');
        if (saved && i18n[saved]) {
            this.state.language = saved;
        }
        i18n.setLanguage(this.state.language);
        document.documentElement.lang = this.state.language;
        this.syncLanguageSelector();
    }

    syncLanguageSelector() {
        const select = document.getElementById('language-select');
        if (select) select.value = this.state.language;
    }

    // =========================================================================
    // COOKIE CONSENT
    // =========================================================================
    checkCookieConsent() {
        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {
            setTimeout(() => {
                document.getElementById('cookie-banner').classList.add('active');
            }, 1000);
        }
    }

    acceptCookies() {
        localStorage.setItem('cookieConsent', 'accepted');
        document.getElementById('cookie-banner').classList.remove('active');
    }

    declineCookies() {
        localStorage.setItem('cookieConsent', 'declined');
        document.getElementById('cookie-banner').classList.remove('active');
    }

    // =========================================================================
    // NAVIGATION
    // =========================================================================
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.dataset.section;

                if (btn.classList.contains('active') || btn.disabled) {
                    e.preventDefault();
                    return;
                }

                if (this.state.section === 'interview' && section !== 'interview') {
                    this.interviewManager.stopSpeaking();
                }

                this.showSection(section);
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (this.state.section === 'prepare') {
                    if (this.state.step === 1 && !document.getElementById('btn-next-1').disabled) this.nextStep();
                    else if (this.state.step === 2 && !document.getElementById('btn-next-2').disabled) this.nextStep();
                    else if (this.state.step === 3) this.uploadManager.prepareInterview();
                    else if (this.state.step === 4) this.interviewManager.startInterview();
                } else if (this.state.section === 'interview' && this.state.inputMode === 'text') {
                    this.interviewManager.submitText();
                }
            }

            if (e.key === 'Escape' && !this.state.isProcessing) {
                this.closeModal();
            }

            if (this.state.section === 'feedback' && this.state.questionFeedback.length > 0) {
                if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                    return;
                }
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.feedbackManager.prevQuestion();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.feedbackManager.nextQuestion();
                }
            }
        });
    }

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateNavState() {
        const interviewBtn = document.querySelector('.nav-btn[data-section="interview"]');
        if (interviewBtn) {
            const canInterview = (this.state.interviewActive || this.state.interviewComplete)
                && !this.state.viewingHistoryFeedback;
            interviewBtn.disabled = !canInterview;
            interviewBtn.classList.toggle('disabled', !canInterview);
        }

        const feedbackBtn = document.querySelector('.nav-btn[data-section="feedback"]');
        if (feedbackBtn) {
            feedbackBtn.disabled = !this.state.interviewComplete;
            feedbackBtn.classList.toggle('disabled', !this.state.interviewComplete);
        }
    }

    updateInterviewButtons() {
        const resetBtn = document.getElementById('btn-reset-interview');
        const endBtn = document.getElementById('btn-end-interview');

        const isActive = this.state.interviewActive;
        const isComplete = this.state.interviewComplete;

        if (resetBtn) {
            resetBtn.disabled = !isActive && !isComplete;
            resetBtn.classList.toggle('hidden', !isActive && !isComplete);
        }
        if (endBtn) {
            endBtn.disabled = !isActive;
            endBtn.classList.toggle('hidden', !isActive);
        }
    }

    startCameraIfEnabled() {
        if (!this.state.videoEnabled || videoService.isActive()) return;

        const videoEl = document.getElementById('user-video');
        if (!videoEl) return;

        videoService.init(videoEl).then(() => {
            document.getElementById('video-panel')?.classList.add('active');
            if (this.state.interviewActive) {
                videoService.startCapture();
            }
        }).catch(() => {
            this.state.videoEnabled = false;
        });
    }

    showSection(id) {
        if (this.state.section === 'interview' && id !== 'interview') {
            this.stopCamera();
        }

        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${id}`)?.classList.add('active');

        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.section === id);
        });

        this.state.section = id;
        this.scrollToTop();

        if (id === 'interview') {
            this.startCameraIfEnabled();
            this.updateInterviewButtons();
        }
    }

    stopCamera() {
        if (videoService.isActive()) {
            videoService.stop();
        }
        const videoPanel = document.getElementById('video-panel');
        if (videoPanel) videoPanel.classList.remove('active');
    }

    startPreparing() {
        this.goToStep(1);
        this.showSection('prepare');
    }

    // =========================================================================
    // STEP NAVIGATION
    // =========================================================================
    async nextStep() {
        if (this.state.step === 2) {
            const activeSource = this.uploadManager.getActiveJdSource();

            if (activeSource === 'paste') {
                try {
                    const processed = await this.uploadManager.processJdTextIfNeeded();
                    if (!processed && !this.state.jdData) {
                        this.showNotification('error.jd', 'warning');
                        return;
                    }
                } catch (e) {
                    return;
                }
            } else if (!this.state.jdData) {
                this.showNotification('error.jd', 'warning');
                return;
            }
        }
        this.goToStep(this.state.step + 1);
    }

    prevStep() {
        this.goToStep(this.state.step - 1);
    }

    goToStep(step) {
        if (step < 1 || step > 4) return;

        if (step > this.state.step) {
            if (step >= 2 && !this.state.cvData) {
                this.showNotification('error.cv', 'warning');
                return;
            }
            if (step >= 3 && !this.state.jdData) {
                this.showNotification('error.jd', 'warning');
                return;
            }
        }

        this.state.step = step;

        document.querySelectorAll('.steps-progress .step').forEach(s => {
            const n = parseInt(s.dataset.step);
            s.classList.toggle('active', n === step);
            s.classList.toggle('done', n < step);
        });

        document.querySelectorAll('.prep-step').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.step) === step);
        });

        this.updateNavState();
        this.scrollToTop();
    }

    // =========================================================================
    // MODAL MANAGEMENT
    // =========================================================================
    showLoading(msg, preventClose) {
        this.state.isProcessing = preventClose === true;
        document.body.classList.add('modal-open');
        document.getElementById('loading-msg').textContent = msg || this.t('loading.processing');
        document.getElementById('modal-overlay').classList.add('active');

        if (this.state.isProcessing) {
            document.getElementById('modal-overlay').classList.add('loading-active');
        }

        const modal = document.getElementById('loading-modal');
        modal.classList.add('active');
        this._trapFocus(modal);
    }

    hideLoading() {
        this.state.isProcessing = false;
        this.state.abortController = null;
        document.body.classList.remove('modal-open');
        document.getElementById('modal-overlay').classList.remove('active', 'loading-active');
        document.getElementById('loading-modal').classList.remove('active');
        this._releaseFocus();
    }

    openModal(id) {
        document.body.classList.add('modal-open');
        document.getElementById('modal-overlay').classList.add('active');
        const modal = document.getElementById(id);
        modal.classList.add('active');
        this._trapFocus(modal);
    }

    closeModal() {
        if (this.state.isProcessing) return;
        document.body.classList.remove('modal-open');
        document.getElementById('modal-overlay').classList.remove('active', 'loading-active');
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        this._releaseFocus();
    }

    closeModalOnOverlay(event) {
        if (event.target.id === 'modal-overlay') {
            if (this.state.isProcessing) return;

            const loadingModal = document.getElementById('loading-modal');
            if (loadingModal?.classList.contains('active')) {
                if (this.state.abortController && !this.state.isProcessing) {
                    this.state.abortController.abort();
                    this.state.abortController = null;
                }
                this.hideLoading();
                return;
            }

            this.closeModal();
        }
    }


    /**
     * Trap keyboard focus inside the active modal.
     * Sets `inert` on all non-modal content so Tab, arrow keys,
     * and assistive technology cannot reach background elements.
     */
    _trapFocus(modalEl) {
        this._previousFocus = document.activeElement;

        const app = document.getElementById('app');
        for (const child of app.children) {
            if (!child.classList.contains('modal') && child.id !== 'modal-overlay') {
                child.inert = true;
            }
        }

        const focusTarget = modalEl.querySelector(
            '.modal-close, button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusTarget) {
            focusTarget.focus();
        }
    }

    /** Remove focus trap and restore focus to the element that opened the modal. */
    _releaseFocus() {
        const app = document.getElementById('app');
        for (const child of app.children) {
            child.inert = false;
        }

        if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
            this._previousFocus.focus();
        }
        this._previousFocus = null;
    }

    // =========================================================================
    // NOTIFICATION
    // =========================================================================
    showNotification(messageOrKey, type = 'info', params = {}) {
        const existing = document.querySelector('.notification-toast');
        if (existing) existing.remove();

        const isKey = !!(i18n.en[messageOrKey]);
        const message = isKey ? this.t(messageOrKey, params) : messageOrKey;

        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${type}`;
        toast.textContent = message;

        if (isKey) {
            toast.dataset.i18nKey = messageOrKey;
            if (Object.keys(params).length > 0) {
                toast.dataset.i18nParams = JSON.stringify(params);
            }
        }

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // =========================================================================
    // HISTORY MANAGEMENT
    // =========================================================================
    refreshHistorySection() {
        const container = document.getElementById('history-container');
        if (!container) return;

        const html = historyManager.renderHistorySection();
        container.innerHTML = html;

        if (html) {
            historyManager.attachHistorySectionListeners({
                onToggle: () => this.toggleHistorySection(),
                onClear: () => this.clearHistory(),
                onView: (id) => this.viewHistoryItem(id),
                onDelete: (id) => this.deleteHistoryItem(id)
            });

            if (this.state.historyCollapsed) {
                const content = document.getElementById('history-content');
                const icon = container.querySelector('.toggle-icon');
                if (content) content.classList.add('collapsed');
                if (icon) icon.textContent = '\u25B6';
            }
        }
    }

    toggleHistorySection() {
        const content = document.getElementById('history-content');
        const icon = document.querySelector('.toggle-icon');

        if (content) {
            this.state.historyCollapsed = !this.state.historyCollapsed;
            content.classList.toggle('collapsed', this.state.historyCollapsed);
            if (icon) {
                icon.textContent = this.state.historyCollapsed ? '\u25B6' : '\u25BC';
            }
            localStorage.setItem('historyCollapsed', this.state.historyCollapsed);
        }
    }

    loadHistoryCollapseState() {
        this.state.historyCollapsed = localStorage.getItem('historyCollapsed') === 'true';
    }

    viewHistoryItem(id) {
        const interview = historyManager.getInterview(id);
        if (!interview) {
            this.showNotification('error.notfound', 'error');
            return;
        }
        this.feedbackManager.displayHistoryFeedback(interview);
    }

    deleteHistoryItem(id) {
        if (confirm(this.t('history.delete.confirm'))) {
            historyManager.deleteInterview(id);
            this.showNotification('history.deleted', 'success');
        }
    }

    clearHistory() {
        if (confirm(this.t('history.clear.confirm'))) {
            historyManager.clearHistory();
            this.showNotification('history.cleared', 'success');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});