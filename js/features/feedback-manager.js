/**
 * js/features/feedback-manager.js
 * Feedback Manager
 *
 * Handles feedback display, state management, sharing, and coordinates with FeedbackRenderer
 */

class FeedbackManager {
    constructor(app) {
        this.app = app;
        this.cachedShareUrl = null;
    }

    // =========================================================================
    // FEEDBACK DISPLAY
    // =========================================================================
    displayFeedback(fb) {
        document.getElementById('feedback-loading').classList.add('hidden');
        document.getElementById('feedback-content').classList.remove('hidden');

        const container = document.getElementById('feedback-content');
        const resolved = FeedbackUtils.resolveFeedback(fb, this.app.state.language);

        const data = {
            feedback: resolved,
            transcript: this.app.getTranscript(),
            speechMetrics: this.app.getSpeechMetrics(),
            language: this.app.state.language
        };

        this.app.state.questionFeedback = resolved.question_feedback || [];
        this.app.state.currentQuestionIndex = 0;

        FeedbackRenderer.render(container, data, {
            readOnly: false,
            showActions: true,
            showShareButton: true,
            showCTA: false,
            onQuestionChange: (index) => {
                this.app.state.currentQuestionIndex = index;
            },
            onPracticeAgain: () => this.practiceAgain(),
            onViewTranscript: () => this.viewTranscript(),
            onExportPDF: () => this.exportPDF(),
            onShare: () => this.openShareModal()
        });
    }

    refreshFeedbackLanguage() {
        if (this.app.state.lastFeedback && this.app.state.interviewComplete) {
            const savedIndex = this.app.state.currentQuestionIndex;
            this.displayFeedback(this.app.state.lastFeedback);
            if (savedIndex > 0 && savedIndex < this.app.state.questionFeedback.length) {
                this.app.state.currentQuestionIndex = savedIndex;
                FeedbackRenderer.goToQuestion(savedIndex, document.getElementById('feedback-content'));
            }
        }
    }

    displayHistoryFeedback(historyItem) {
        this.app.state.lastFeedback = historyItem.feedback;
        this.app.state.lastTranscript = historyItem.transcript || [];
        this.app.state.lastSpeechMetrics = historyItem.speechMetrics || historyItem.speech_metrics || {};
        this.app.state.conversationHistory = historyItem.transcript || [];
        this.app.state.speechMetrics = historyItem.speechMetrics || historyItem.speech_metrics || {};
        this.app.state.historyPosition = historyItem.position || null;
        this.app.state.interviewComplete = true;
        this.app.state.viewingHistoryFeedback = true;
        this.cachedShareUrl = null;

        this.displayFeedback(historyItem.feedback);
        this.app.showSection('feedback');
        this.app.updateNavState();
    }

    // =========================================================================
    // QUESTION NAVIGATION
    // =========================================================================
    prevQuestion() {
        if (this.app.state.currentQuestionIndex > 0) {
            this.app.state.currentQuestionIndex--;
            FeedbackRenderer.goToQuestion(this.app.state.currentQuestionIndex, document.getElementById('feedback-content'));
        }
    }

    nextQuestion() {
        if (this.app.state.currentQuestionIndex < this.app.state.questionFeedback.length - 1) {
            this.app.state.currentQuestionIndex++;
            FeedbackRenderer.goToQuestion(this.app.state.currentQuestionIndex, document.getElementById('feedback-content'));
        }
    }

    // =========================================================================
    // SHARE FUNCTIONALITY
    // =========================================================================
    async openShareModal() {
        if (!this.app.state.interviewComplete || !this.app.state.lastFeedback) {
            this.app.showNotification('error.complete', 'error');
            return;
        }

        if (this.cachedShareUrl) {
            document.getElementById('share-link-input').value = this.cachedShareUrl;
            this.updateSocialLinks(this.cachedShareUrl, this.getPosition());
            this.app.openModal('share-modal');
            return;
        }

        this.app.showLoading(this.app.t('share.creating'));

        try {
            const shareData = await shareService.createShare({
                feedback: this.app.state.lastFeedback,
                transcript: this.app.getTranscript(),
                speechMetrics: this.app.getSpeechMetrics(),
                position: this.getPositionMap(),
                language: this.app.state.language
            });

            this.app.hideLoading();
            this.cachedShareUrl = shareData.url;

            document.getElementById('share-link-input').value = shareData.url;
            const resolvedPosition = Utils.resolvePosition(shareData.position, this.app.state.language);
            this.updateSocialLinks(shareData.url, resolvedPosition);
            this.app.openModal('share-modal');

        } catch (e) {
            this.app.hideLoading();
            this.app.showNotification(this.app.t('share.error') + ': ' + e.message, 'error');
        }
    }

    /**
     * Return the bilingual position map ({en, fr}) for storage.
     * Falls back to historyPosition when no JD data is loaded.
     */
    getPositionMap() {
        const map = Utils.extractPositionMap(
            this.app.state.jdData,
            this.app.state.language,
            ['job_info.title', 'title', 'position']
        );
        return map || this.app.state.historyPosition || null;
    }

    /** Resolve the position to a display string for the current language. */
    getPosition() {
        return Utils.resolvePosition(this.getPositionMap(), this.app.state.language, '');
    }

    updateSocialLinks(url, position) {
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        document.getElementById('share-linkedin')?.setAttribute('href', linkedInUrl);

        const emailSubject = position
            ? this.app.t('share.email.subject', { position })
            : this.app.t('share.email.subject.default', { name: Config.PROJECT_NAME });
        const emailBody = this.app.t('share.email.body', {
            name: Config.PROJECT_NAME,
            url,
            projectUrl: Config.PROJECT_URL
        });

        document.getElementById('share-email')?.setAttribute('href',
            `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`);
    }

    copyShareLink() {
        const input = document.getElementById('share-link-input');
        if (!input) return;

        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
            this.app.showNotification('share.copied', 'success');
        }).catch(() => {
            document.execCommand('copy');
            this.app.showNotification('share.copied', 'success');
        });
    }

    // =========================================================================
    // HISTORY MANAGEMENT
    // =========================================================================
    saveToHistory(feedback) {
        if (!feedback) return;

        historyManager.saveInterview({
            id: 'interview_' + Date.now(),
            timestamp: new Date().toISOString(),
            position: this.getPositionMap(),
            language: this.app.state.language,
            scores: feedback.scores || {},
            feedback: feedback,
            transcript: this.app.getTranscript(),
            speechMetrics: this.app.getSpeechMetrics()
        });
    }

    // =========================================================================
    // TRANSCRIPT
    // =========================================================================
    viewTranscript() {
        const interviewerLabel = this.app.t('interview.interviewer');
        const youLabel = this.app.t('interview.you');
        const skippedLabel = this.app.t('interview.skipped');

        document.getElementById('transcript-content').innerHTML = this.app.getTranscript().map(t => {
            const isInterviewer = t.role === 'interviewer';
            const isSkipped = !isInterviewer && t.content === '[SKIPPED]';
            const content = isSkipped
                ? `<em>\u23ED ${skippedLabel}</em>`
                : Utils.escapeHtml(t.content);
            return `
                <div class="transcript-message ${t.role}">
                    <div class="message-sender">${isInterviewer ? '\u{1F3A4} ' + interviewerLabel : '\u{1F464} ' + youLabel}</div>
                    <div class="message-content">${content}</div>
                </div>
            `;
        }).join('');

        this.app.openModal('transcript-modal');
    }

    // =========================================================================
    // EXPORT PDF
    // =========================================================================
    exportPDF() {
        if (!this.app.state.interviewComplete) {
            this.app.showNotification('error.complete', 'warning');
            return;
        }

        pdfExport.export({
            cvData: this.app.state.cvData,
            jdData: this.app.state.jdData,
            conversationHistory: this.app.getTranscript()
        }, this.app.state.language);
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================
    practiceAgain() {
        this.app.state.conversationHistory = [];
        this.app.state.questionsAsked = 0;
        this.app.state.interviewActive = false;
        this.app.state.interviewComplete = false;
        this.app.state.viewingHistoryFeedback = false;
        this.app.state.historyPosition = null;
        this.app.state.speechMetrics = Utils.createEmptySpeechMetrics();
        this.app.state.questionFeedback = [];
        this.app.state.currentQuestionIndex = 0;
        this.app.state.lastFeedback = null;
        this.app.state.lastTranscript = null;
        this.app.state.lastSpeechMetrics = null;
        this.cachedShareUrl = null;

        document.getElementById('chat-messages').innerHTML = '';
        this.app.updateNavState();
        this.app.updateInterviewButtons();
        this.app.showSection('prepare');
        this.app.goToStep(4);
    }
}