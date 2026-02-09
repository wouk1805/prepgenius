/**
 * js/features/interview-manager.js
 * Interview Manager
 *
 * Handles interview session, voice recording, and conversation flow
 */

class InterviewManager {
    constructor(app) {
        this.app = app;
        this.lockedVoiceParams = null;
        this._feedbackGenId = 0;
        this._ttsAbortController = null;
    }

    // =========================================================================
    // INTERVIEWER HELPERS
    // =========================================================================
    getInterviewerVoiceParams() {
        if (this.lockedVoiceParams) return this.lockedVoiceParams;

        const persona = this.app.state.interviewerPersonas[this.app.state.currentInterviewerIndex];
        const profile = this.app.state.interviewerProfiles[this.app.state.currentInterviewerIndex];

        const rawGender = persona?.persona?.gender || persona?.gender || profile?.gender || 'female';
        const gender = (rawGender.toLowerCase() === 'male') ? 'male' : 'female';

        const style = persona?.persona?.style || 'professional';
        const styleMap = { formal: 'professional', technical: 'professional', casual: 'friendly', behavioral: 'friendly' };

        return { gender, style: styleMap[style] || 'professional' };
    }

    lockVoiceParams() {
        this.lockedVoiceParams = null;
        this.lockedVoiceParams = { ...this.getInterviewerVoiceParams() };
    }

    getInterviewerName() {
        const persona = this.app.state.interviewerPersonas[this.app.state.currentInterviewerIndex];
        if (persona?.persona?.name) return persona.persona.name;

        const profile = this.app.state.interviewerProfiles[this.app.state.currentInterviewerIndex];
        if (profile?.name) return profile.name;

        return 'Interviewer';
    }

    getInterviewerRoleDisplay() {
        const persona = this.app.state.interviewerPersonas[this.app.state.currentInterviewerIndex];
        const profile = this.app.state.interviewerProfiles[this.app.state.currentInterviewerIndex];

        const role = persona?.persona?.role || profile?.title || '';
        const company = persona?.persona?.company || profile?.company || '';

        if (role && company) return `${role} \u00B7 ${company}`;
        return role || company;
    }

    /**
     * Configure the browser TTS voice for the given interviewer persona index.
     * Falls back to a gender/language-matched voice when no AI-assigned voice is found.
     */
    configureBrowserVoice(personaIndex) {
        const persona = this.app.state.interviewerPersonas[personaIndex];
        const aiVoice = persona?.persona?.browser_voice;
        if (!aiVoice || !ttsService.setVoiceByName(aiVoice)) {
            const voiceParams = this.getInterviewerVoiceParams();
            ttsService.setFallbackVoice(this.app.state.language, voiceParams.gender);
        }
    }

    switchInterviewer(index) {
        if (index < 0 || index >= this.app.state.interviewerPersonas.length) return;
        if (index === this.app.state.currentInterviewerIndex) return;

        this.app.state.currentInterviewerIndex = index;
        this.lockVoiceParams();

        if (this.app.state.ttsEngine === 'browser' || ttsService.isUsingFallback) {
            this.configureBrowserVoice(index);
        }

        document.getElementById('interviewer-name').textContent = this.getInterviewerName();
        const roleText = this.getInterviewerRoleDisplay();
        const roleEl = document.getElementById('interviewer-role');
        roleEl.textContent = roleText;
        roleEl.title = roleText;

        document.querySelectorAll('.interviewer-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });
    }

    renderInterviewerTabs() {
        const container = document.querySelector('.interviewer-selector');
        if (!container || this.app.state.interviewerPersonas.length <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        container.innerHTML = this.app.state.interviewerPersonas.map((p, i) => {
            const displayName = p.persona?.first_name || p.persona?.name?.split(' ')[0] || `Interviewer ${i + 1}`;
            const activeClass = i === this.app.state.currentInterviewerIndex ? ' active' : '';
            return `<button class="interviewer-tab${activeClass}" data-index="${i}">${displayName}</button>`;
        }).join('');

        container.querySelectorAll('.interviewer-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchInterviewer(parseInt(tab.dataset.index, 10));
            });
        });
    }

    // =========================================================================
    // TTS PLAYBACK HELPER
    // =========================================================================

    /**
     * Run an async TTS callback while showing the speaking indicator.
     * Guarantees indicator cleanup regardless of success or failure.
     */
    async speakWithIndicator(fn) {
        const indicator = document.getElementById('speaking-indicator');
        indicator?.classList.add('active');
        this.app.state.isSpeaking = true;
        try {
            await fn();
        } finally {
            indicator?.classList.remove('active');
            this.app.state.isSpeaking = false;
        }
    }

    // =========================================================================
    // INTERVIEW LIFECYCLE
    // =========================================================================
    async startInterview() {
        let type = 'full';
        document.querySelectorAll('input[name="int-type"]').forEach(radio => {
            if (radio.checked) type = radio.value;
        });
        const totalQuestions = Config.INTERVIEW_TYPES[type]?.questions || 10;

        this.app.state.voiceEnabled = document.getElementById('opt-voice')?.checked ?? true;
        this.app.state.videoEnabled = document.getElementById('opt-video')?.checked ?? true;
        this.app.state.ttsEngine = document.getElementById('opt-tts-engine')?.value || 'browser';
        this.app.state.interviewType = type;
        this.app.state.totalQuestions = totalQuestions;
        this.app.state.questionStyle = document.getElementById('question-style')?.value || Config.DEFAULT_QUESTION_STYLE;
        this.app.state.currentInterviewerIndex = 0;
        this.app.state.conversationHistory = [];
        this.app.state.questionsAsked = 0;
        this.app.state.interviewActive = true;
        this.app.state.interviewComplete = this.app.state.interviewComplete && (this.app.state.lastFeedback || this._feedbackGenId > 0);
        this.app.state.viewingHistoryFeedback = false;
        this.app.state.speechMetrics = Utils.createEmptySpeechMetrics();

        this.updateQCount(0);
        this.lockVoiceParams();

        if (this.app.state.voiceEnabled) {
            ttsService.setEngine(this.app.state.ttsEngine);
            this.configureBrowserVoice(0);
        }

        this.app.showLoading(this.app.t('loading.starting'), true);
        this.app.state.abortController = new AbortController();

        try {
            if (this.app.state.videoEnabled && videoService.isSupported()) {
                try {
                    await videoService.init(document.getElementById('user-video'));
                    document.getElementById('video-panel').classList.add('active');
                    videoService.startCapture();
                } catch (e) {
                    console.warn('Video init failed:', e);
                    this.app.state.videoEnabled = false;
                }
            }

            const result = await interviewService.startInterview({
                cvData: this.app.state.cvData,
                jdData: this.app.state.jdData,
                interviewerPersona: this.app.state.interviewerPersonas[0] || null,
                language: this.app.state.language,
                questionStyle: this.app.state.questionStyle,
                targetQuestions: this.app.state.totalQuestions,
                interviewType: this.app.state.interviewType
            }, this.app.state.abortController.signal);

            // Synthesize TTS while loading modal is still showing (Gemini only)
            let audioResult = null;
            if (this.app.state.voiceEnabled && ttsService.activeEngine === 'gemini') {
                try {
                    this._ttsAbortController = new AbortController();
                    const voiceParams = this.getInterviewerVoiceParams();
                    audioResult = await ttsService.synthesize(
                        result.interviewer_message,
                        voiceParams.gender,
                        voiceParams.style,
                        this._ttsAbortController.signal
                    );
                    this._ttsAbortController = null;
                } catch (e) {
                    this._ttsAbortController = null;
                    if (e.message === 'Cancelled' || e.name === 'AbortError') throw e;
                    if (e.quotaExceeded || e._triggeredFallback) {
                        this.onTtsQuotaFallback();
                    } else {
                        console.warn('TTS synthesis failed on start:', e.message);
                        this.app.showNotification('error.tts', 'warning');
                    }
                }
            }

            // TTS audio is ready (or failed gracefully) - reveal the interview
            this.app.hideLoading();
            this.app.showSection('interview');

            this.app.state.startTime = Date.now();
            this.app.state.lastQuestionTime = Date.now();
            this.startTimer();

            this.setMode('voice');

            const interviewerName = this.getInterviewerName();

            document.getElementById('interviewer-name').textContent = interviewerName;
            const roleText = this.getInterviewerRoleDisplay();
            const roleEl = document.getElementById('interviewer-role');
            roleEl.textContent = roleText;
            roleEl.title = roleText;
            document.getElementById('chat-messages').innerHTML = '';
            this.renderInterviewerTabs();

            this.app.state.conversationHistory.push({ role: 'interviewer', content: result.interviewer_message });

            this.setInputControlsEnabled(true);
            this.app.updateInterviewButtons();
            this.app.updateNavState();

            this.addMessage('interviewer', result.interviewer_message, interviewerName);

            if (this.app.state.voiceEnabled) {
                try {
                    await this.speakWithIndicator(async () => {
                        if (audioResult?.audio_content) {
                            await ttsService.playAudio(audioResult.audio_content);
                        } else {
                            const voiceParams = this.getInterviewerVoiceParams();
                            await ttsService.speak(result.interviewer_message, {
                                gender: voiceParams.gender,
                                lang: Utils.toLocale(this.app.state.language)
                            });
                        }
                    });
                } catch (e) {
                    console.warn('TTS playback failed:', e.message);
                }
            }

            this.app.state.questionsAsked = result.questions_asked;
            this.updateQCount(result.questions_asked);
        } catch (e) {
            this.app.hideLoading();
            if (e.message !== 'Cancelled') {
                this.app.showNotification(e.message || 'Failed to start interview', 'error');
            }
        }
    }

    async resetInterview() {
        if (!confirm(this.app.t('error.reset'))) return;

        this.stopSpeaking();
        this.stopTimer();
        this.app.stopCamera();

        // Preserve feedback accessibility if feedback exists or is being generated
        const hadFeedback = this.app.state.interviewComplete && (this.app.state.lastFeedback || this._feedbackGenId > 0);

        this.app.state.conversationHistory = [];
        this.app.state.questionsAsked = 0;
        this.app.state.interviewActive = false;
        this.app.state.interviewComplete = hadFeedback;
        this.app.state.speechMetrics = Utils.createEmptySpeechMetrics();
        this.app.state.startTime = null;
        this.app.state.lastQuestionTime = null;
        this.lockedVoiceParams = null;

        document.getElementById('chat-messages').innerHTML = '';
        document.getElementById('timer').textContent = '00:00';
        this.updateQCount(0);

        this.app.updateInterviewButtons();
        this.app.updateNavState();

        await this.startInterview();
    }

    async endInterviewEarly() {
        if (!confirm(this.app.t('error.end'))) return;
        this.stopSpeaking();
        this.endInterview();
    }

    endInterview() {
        this.stopSpeaking();
        this.stopTimer();

        this.app.state.interviewActive = false;
        this.app.state.interviewComplete = true;
        this.lockedVoiceParams = null;

        this.setInputControlsEnabled(false);
        this.app.updateInterviewButtons();
        this.app.updateNavState();

        this.generateFeedback();
    }

    stopTimer() {
        if (this.app.timer) {
            clearInterval(this.app.timer);
            this.app.timer = null;
        }
    }

    // =========================================================================
    // INPUT CONTROLS
    // =========================================================================
    setInputControlsEnabled(enabled) {
        const sendBtn = document.getElementById('btn-send');
        const skipBtn = document.getElementById('btn-skip');
        const recordBtn = document.getElementById('record-btn');
        const textarea = document.getElementById('response-text');

        if (sendBtn) sendBtn.disabled = !enabled;
        if (skipBtn) skipBtn.disabled = !enabled;
        if (recordBtn) recordBtn.disabled = !enabled;
        if (textarea) textarea.disabled = !enabled;
    }

    // =========================================================================
    // FEEDBACK GENERATION
    // =========================================================================
    async generateFeedback() {
        this.app.showSection('feedback');
        document.getElementById('feedback-loading').classList.remove('hidden');
        document.getElementById('feedback-content').classList.add('hidden');

        const elapsed = this.app.state.startTime ? (Date.now() - this.app.state.startTime) / 1000 : 0;
        const totalDuration = elapsed > 0 ? elapsed : 60;
        const wordCount = this.app.state.speechMetrics.word_count || 0;
        this.app.state.speechMetrics.pace_wpm = totalDuration > 0 ? Math.round((wordCount / totalDuration) * 60) : 0;

        // Snapshot data before async call so a restart doesn't corrupt it
        const feedbackRequest = {
            cvData: this.app.state.cvData,
            jdData: this.app.state.jdData,
            conversationHistory: [...this.app.state.conversationHistory],
            speechMetrics: { ...this.app.state.speechMetrics },
            videoAnalysis: videoService.getFrameAnalyses(),
            language: this.app.state.language
        };

        this._feedbackGenId++;
        const genId = this._feedbackGenId;

        try {
            const feedback = await interviewService.generateFeedback(feedbackRequest);

            // If user restarted and kicked off another feedback generation, discard stale results
            if (genId !== this._feedbackGenId) return;

            this.app.state.lastFeedback = feedback.feedback;
            this.app.state.lastTranscript = feedbackRequest.conversationHistory;
            this.app.state.lastSpeechMetrics = feedbackRequest.speechMetrics;
            this.app.state.interviewComplete = true;
            this.app.updateNavState();
            this.app.feedbackManager.displayFeedback(feedback.feedback);
            this.app.feedbackManager.saveToHistory(feedback.feedback);

        } catch (e) {
            if (genId !== this._feedbackGenId) return;

            document.getElementById('feedback-loading').classList.add('hidden');
            const errorCard = document.createElement('div');
            errorCard.className = 'feedback-card glass-card';
            const errorTitle = document.createElement('h3');
            errorTitle.textContent = 'Error generating feedback';
            const errorMsg = document.createElement('p');
            errorMsg.textContent = e.message;
            errorCard.append(errorTitle, errorMsg);
            const feedbackContent = document.getElementById('feedback-content');
            feedbackContent.innerHTML = '';
            feedbackContent.appendChild(errorCard);
            document.getElementById('feedback-content').classList.remove('hidden');
        }
    }

    // =========================================================================
    // MODE SWITCHING
    // =========================================================================
    setMode(mode) {
        this.app.state.inputMode = mode;

        document.querySelectorAll('.mode-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === mode);
        });

        document.getElementById('voice-mode').classList.toggle('active', mode === 'voice');
        document.getElementById('text-mode').classList.toggle('active', mode === 'text');

        const sendBtn = document.getElementById('btn-send');
        if (sendBtn) sendBtn.style.display = mode === 'voice' ? 'none' : '';

        if (mode === 'text') {
            setTimeout(() => {
                const textarea = document.getElementById('response-text');
                if (textarea) textarea.focus();
            }, 100);
        }
    }

    // =========================================================================
    // MESSAGE DISPLAY
    // =========================================================================
    addMessage(role, content, senderName) {
        const div = document.createElement('div');
        div.className = `message ${role}`;

        const senderEl = document.createElement('div');
        senderEl.className = 'message-sender';
        senderEl.textContent = senderName;
        if (role === 'candidate') {
            senderEl.setAttribute('data-i18n', 'interview.you');
        }

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.textContent = content;

        div.appendChild(senderEl);
        div.appendChild(contentEl);

        document.getElementById('chat-messages').appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
        return div;
    }

    addThinkingMessage(senderName) {
        const div = document.createElement('div');
        div.className = 'message interviewer';
        div.innerHTML = `
            <div class="message-sender">${Utils.escapeHtml(senderName)}</div>
            <div class="message-content">
                <div class="thinking-dots">
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                </div>
            </div>
        `;
        document.getElementById('chat-messages').appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
        return div;
    }

    /**
     * Present an interviewer message with optional TTS playback.
     * Reuses an existing thinking bubble if provided, otherwise creates one.
     * For Gemini TTS, keeps the loading modal visible during synthesis,
     * then dismisses it just before audio playback begins.
     */
    async presentInterviewerMessage(message, name, existingThinkingEl = null) {
        const thinkingEl = existingThinkingEl || this.addThinkingMessage(name);
        const contentEl = thinkingEl.querySelector('.message-content');

        if (this.app.state.voiceEnabled) {
            try {
                if (ttsService.activeEngine === 'gemini') {
                    this._ttsAbortController = new AbortController();
                    const ttsSignal = this._ttsAbortController.signal;

                    const voiceParams = this.getInterviewerVoiceParams();
                    let audioResult;
                    try {
                        audioResult = await ttsService.synthesize(
                            message, voiceParams.gender, voiceParams.style, ttsSignal
                        );
                    } catch (e) {
                        if (e.message === 'Cancelled' || e.name === 'AbortError') throw e;
                        if (e.quotaExceeded || e._triggeredFallback) {
                            this.onTtsQuotaFallback();
                            // Fall through to browser TTS below
                            audioResult = null;
                        } else {
                            throw e;
                        }
                    }

                    this._ttsAbortController = null;

                    if (ttsSignal.aborted) return;

                    // Synthesis complete - dismiss loading modal before playback
                    this.app.hideLoading();

                    contentEl.textContent = message;
                    thinkingEl.scrollIntoView({ behavior: 'smooth' });

                    if (audioResult?.audio_content) {
                        await this.speakWithIndicator(() =>
                            ttsService.playAudio(audioResult.audio_content)
                        );
                        return;
                    }

                    // Gemini failed (quota fallback) - use browser TTS
                    await this.speakWithIndicator(() =>
                        ttsService.speak(message, {
                            gender: voiceParams.gender,
                            lang: Utils.toLocale(this.app.state.language)
                        })
                    );
                } else {
                    contentEl.textContent = message;
                    thinkingEl.scrollIntoView({ behavior: 'smooth' });

                    const voiceParams = this.getInterviewerVoiceParams();
                    await this.speakWithIndicator(() =>
                        ttsService.speak(message, {
                            gender: voiceParams.gender,
                            lang: Utils.toLocale(this.app.state.language)
                        })
                    );
                }
            } catch (e) {
                if (e.message === 'Cancelled' || e.name === 'AbortError') return;
                console.warn('TTS failed, showing text only:', e.message);
                this.app.hideLoading();
                contentEl.textContent = message;
                thinkingEl.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            contentEl.textContent = message;
            thinkingEl.scrollIntoView({ behavior: 'smooth' });
        }
    }

    stopSpeaking() {
        if (this._ttsAbortController) {
            this._ttsAbortController.abort();
            this._ttsAbortController = null;
        }
        ttsService.stop();
        document.getElementById('speaking-indicator')?.classList.remove('active');
        this.app.state.isSpeaking = false;
    }

    /**
     * Handle automatic fallback from Gemini to browser TTS.
     * Configures the browser voice and shows a one-time notification.
     */
    onTtsQuotaFallback() {
        this.configureBrowserVoice(this.app.state.currentInterviewerIndex);
        this.app.showNotification('error.tts.quota', 'warning');
    }

    /**
     * Verify Gemini TTS quota by pinging the API.
     * If unavailable, switches the engine select to browser and notifies the user.
     * @returns {Promise<boolean>} true if Gemini TTS is available
     */
    async checkTtsQuota() {
        const available = await ttsService.checkQuota();
        if (!available) {
            const select = document.getElementById('opt-tts-engine');
            if (select) select.value = 'browser';
            this.app.showNotification('error.tts.quota', 'warning');
        }
        return available;
    }

    // =========================================================================
    // VOICE RECORDING
    // =========================================================================
    async toggleRecording() {
        this.stopSpeaking();

        if (this.app.state.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        const btn = document.getElementById('record-btn');
        btn.classList.add('recording');
        btn.querySelector('.rec-text').textContent = this.app.t('interview.recording');

        try {
            await voiceService.startRecording();
            this.app.state.isRecording = true;
            this.startAudioVisualizer();
        } catch (e) {
            btn.classList.remove('recording');
            btn.querySelector('.rec-text').textContent = this.app.t('interview.record');
            this.app.showNotification(e.message || 'Failed to start recording', 'error');
        }
    }

    startAudioVisualizer() {
        const analyser = voiceService.analyser;
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bars = document.querySelectorAll('.audio-bar');
        const barCount = bars.length;
        const center = (barCount - 1) / 2;

        // Bell-curve weights: center bar gets full height, edges taper off
        const bellWeights = [];
        for (let i = 0; i < barCount; i++) {
            const dist = Math.abs(i - center) / center;
            bellWeights.push(1.0 - dist * 0.55);
        }

        // Sample from the vocal frequency range (roughly 80-800 Hz)
        const sampleBands = [2, 4, 6, 4, 2];

        const updateVisualizer = () => {
            if (!this.app.state.isRecording) return;

            analyser.getByteFrequencyData(dataArray);

            bars.forEach((bar, i) => {
                const bandStart = sampleBands.slice(0, i).reduce((a, b) => a + b, 0);
                const bandSize = sampleBands[i] || 3;
                let sum = 0;
                for (let j = bandStart; j < bandStart + bandSize && j < dataArray.length; j++) {
                    sum += dataArray[j];
                }
                const avg = sum / bandSize;
                const intensity = avg / 255;
                const height = Math.max(5, intensity * bellWeights[i] * 46);

                bar.style.height = `${height}px`;

                const r = Math.round(59 - intensity * 45);
                const g = Math.round(130 + intensity * 35);
                const b = Math.round(246 - intensity * 13);
                bar.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${0.35 + intensity * 0.65})`;
                bar.style.boxShadow = intensity > 0.4
                    ? `0 0 ${intensity * 8}px rgba(14, 165, 233, ${intensity * 0.5})`
                    : 'none';
            });

            requestAnimationFrame(updateVisualizer);
        };

        updateVisualizer();
    }

    resetAudioVisualizer() {
        document.querySelectorAll('.audio-bar').forEach(bar => {
            bar.style.height = '5px';
            bar.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
            bar.style.boxShadow = 'none';
        });
    }

    async stopRecording() {
        const btn = document.getElementById('record-btn');
        const recText = btn.querySelector('.rec-text');
        btn.classList.remove('recording');
        recText.textContent = this.app.t('interview.processing');
        this.app.state.isRecording = false;

        this.resetAudioVisualizer();

        const resetButton = () => { recText.textContent = this.app.t('interview.record'); };

        try {
            const blob = await voiceService.stopRecording();

            if (!blob || blob.size < Config.MIN_AUDIO_BLOB_SIZE) {
                resetButton();
                this.app.showNotification('error.noaudio', 'warning');
                return;
            }

            this.app.showLoading(this.app.t('loading.transcribe'), true);

            const result = await voiceService.transcribe(blob, this.app.state.language);

            const hasValidSpeech = result.transcript?.trim().length >= 2
                && !result.is_empty
                && result.confidence !== 'low';

            if (!hasValidSpeech) {
                this.app.hideLoading();
                resetButton();
                this.app.showNotification('error.noaudio', 'warning');
                return;
            }

            if (result.metrics) {
                this.app.state.speechMetrics.word_count += result.metrics.word_count || 0;
                const f = result.metrics.filler_words;
                if (f) {
                    this.app.state.speechMetrics.filler_words.total_count += f.total_count || 0;
                    Object.keys(f.breakdown || {}).forEach(w => {
                        this.app.state.speechMetrics.filler_words.breakdown[w] =
                            (this.app.state.speechMetrics.filler_words.breakdown[w] || 0) + f.breakdown[w];
                    });
                }
            }

            if (this.app.state.lastQuestionTime) {
                this.app.state.speechMetrics.response_times.push((Date.now() - this.app.state.lastQuestionTime) / 1000);
            }

            this.app.hideLoading();
            this.submitResponse(result.transcript);
            resetButton();
        } catch (e) {
            this.app.hideLoading();
            resetButton();

            const audioErrors = [
                'No audio recorded',
                'Audio too short',
                'No speech detected',
                'Recording too short',
                'No audio data captured',
                'Empty transcript'
            ];

            if (audioErrors.some(err => e.message.includes(err))) {
                this.app.showNotification('error.noaudio', 'warning');
            } else {
                this.app.showNotification(e.message || 'Voice processing failed', 'error');
            }
        }
    }

    // =========================================================================
    // TEXT INPUT
    // =========================================================================
    submitText() {
        const textarea = document.getElementById('response-text');
        const text = textarea.value.trim();
        if (!text) return;

        this.stopSpeaking();

        this.app.state.speechMetrics.word_count += text.split(/\s+/).filter(w => w.length > 0).length;

        const lowerText = text.toLowerCase();
        ['um', 'uh', 'like', 'you know', 'basically', 'actually'].forEach(filler => {
            const matches = lowerText.match(new RegExp(`\\b${filler}\\b`, 'gi'));
            if (matches) {
                this.app.state.speechMetrics.filler_words.total_count += matches.length;
                this.app.state.speechMetrics.filler_words.breakdown[filler] =
                    (this.app.state.speechMetrics.filler_words.breakdown[filler] || 0) + matches.length;
            }
        });

        textarea.value = '';
        this.submitResponse(text);
    }

    skipQuestion() {
        this.stopSpeaking();

        const div = document.createElement('div');
        div.className = 'message skipped';

        const senderEl = document.createElement('div');
        senderEl.className = 'message-sender';
        senderEl.setAttribute('data-i18n', 'interview.you');
        senderEl.textContent = this.app.t('interview.you');

        const bodyEl = document.createElement('span');
        bodyEl.setAttribute('data-i18n', 'interview.skipped');
        bodyEl.textContent = this.app.t('interview.skipped');

        div.appendChild(senderEl);
        div.append('\u23ED ', bodyEl);

        document.getElementById('chat-messages').appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });

        this.app.state.conversationHistory.push({ role: 'candidate', content: '[SKIPPED]' });
        this.getNextQuestion('[SKIP] Skip this question.');
    }

    submitResponse(text) {
        const youLabel = this.app.t('interview.you');
        this.addMessage('candidate', text, youLabel);
        this.app.state.conversationHistory.push({ role: 'candidate', content: text });
        this.getNextQuestion(text);
    }

    async getNextQuestion(candidateResponse) {
        const interviewerName = this.getInterviewerName();
        const persona = this.app.state.interviewerPersonas[this.app.state.currentInterviewerIndex];

        const thinkingEl = this.addThinkingMessage(interviewerName);
        this.app.showLoading(this.app.t('loading.processing'), true);

        try {
            const result = await interviewService.sendResponse({
                cvData: this.app.state.cvData,
                jdData: this.app.state.jdData,
                interviewerPersona: persona || null,
                conversationHistory: this.app.state.conversationHistory,
                candidateResponse,
                questionsAsked: this.app.state.questionsAsked,
                targetQuestions: this.app.state.totalQuestions,
                questionStyle: this.app.state.questionStyle,
                language: this.app.state.language,
                interviewType: this.app.state.interviewType
            });

            this.app.state.questionsAsked = result.questions_asked;
            this.updateQCount(result.questions_asked);
            this.app.state.lastQuestionTime = Date.now();

            this.app.state.conversationHistory.push({ role: 'interviewer', content: result.interviewer_message });

            // For Gemini TTS, the loading modal stays visible during synthesis
            // and is dismissed inside presentInterviewerMessage once audio is ready.
            const isGeminiTts = this.app.state.voiceEnabled && ttsService.activeEngine === 'gemini';
            if (!isGeminiTts) this.app.hideLoading();

            if (result.is_complete) {
                this.setInputControlsEnabled(false);
                await this.presentInterviewerMessage(
                    result.interviewer_message,
                    interviewerName,
                    thinkingEl
                );
                this.endInterview();
            } else {
                await this.presentInterviewerMessage(
                    result.interviewer_message,
                    interviewerName,
                    thinkingEl
                );
            }
        } catch (e) {
            thinkingEl.remove();
            this.app.hideLoading();
            this.app.showNotification(e.message || 'Failed to get next question', 'error');
        }
    }

    // =========================================================================
    // TIMER & PROGRESS
    // =========================================================================
    updateQCount(n) {
        document.getElementById('q-count').textContent = `${n}/${this.app.state.totalQuestions}`;
    }

    startTimer() {
        this.stopTimer();
        const el = document.getElementById('timer');
        el.textContent = '00:00';
        this.app.timer = setInterval(() => {
            const s = Math.floor((Date.now() - this.app.state.startTime) / 1000);
            el.textContent = `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
        }, 1000);
    }
}