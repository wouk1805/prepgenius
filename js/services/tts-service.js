/**
 * js/services/tts-service.js
 * Text-to-Speech Service - Unified dual-engine (Browser / Gemini)
 *
 * Provides a single facade (ttsService) that delegates to either
 * server-side Gemini TTS or client-side Web Speech API.
 * Automatically falls back to browser TTS when Gemini quota is exhausted.
 */

// =============================================================================
// SERVER-SIDE TTS (Gemini API)
// =============================================================================
const geminiTts = {
    audioContext: null,
    currentSource: null,

    /**
     * Create and resume the AudioContext immediately.
     * Must be called from a direct user-gesture handler (click/tap)
     * so the browser allows audio playback.
     */
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },

    async synthesize(text, gender, style, signal) {
        return api.post('/voice/synthesize', {
            text,
            gender: gender || 'female',
            style: style || 'professional'
        }, signal);
    },

    async speak(text, { gender, style } = {}) {
        this.stop();
        const result = await this.synthesize(text, gender, style);
        if (!result?.audio_content) return;
        await this.playAudio(result.audio_content);
    },

    async playAudio(audioContent) {
        if (!audioContent) return;
        this.stop();

        this.initAudioContext();
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const raw = atob(audioContent);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            bytes[i] = raw.charCodeAt(i);
        }

        // Gemini TTS returns 24 kHz 16-bit mono PCM
        const sampleRate = 24000;
        const samples = new Int16Array(bytes.buffer);
        const audioBuffer = this.audioContext.createBuffer(1, samples.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
            channelData[i] = samples[i] / 32768;
        }

        return new Promise((resolve) => {
            this.currentSource = this.audioContext.createBufferSource();
            this.currentSource.buffer = audioBuffer;
            this.currentSource.connect(this.audioContext.destination);
            this.currentSource.onended = () => {
                this.currentSource = null;
                resolve();
            };
            this.currentSource.start();
        });
    },

    stop() {
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch (_) {}
            this.currentSource = null;
        }
    }
};

// =============================================================================
// CLIENT-SIDE TTS (Web Speech API)
// =============================================================================
const browserTts = {
    selectedVoice: null,
    voicesLoaded: false,
    _voicesCache: null,
    _rate: 1.0,
    _pitch: 1.0,

    init() {
        if (this.voicesLoaded) return;
        const synth = window.speechSynthesis;
        if (!synth) return;

        const load = () => {
            this._voicesCache = synth.getVoices();
            this.voicesLoaded = this._voicesCache.length > 0;
        };
        load();
        if (!this.voicesLoaded) {
            synth.addEventListener('voiceschanged', load, { once: true });
        }
    },

    getVoices() {
        if (!this._voicesCache || !this._voicesCache.length) {
            this._voicesCache = window.speechSynthesis?.getVoices() || [];
        }
        return this._voicesCache;
    },

    getVoiceList() {
        return this.getVoices().map(v => ({
            name: v.name,
            lang: v.lang,
            local: v.localService
        }));
    },

    setVoiceByName(name) {
        const voices = this.getVoices();
        const match = voices.find(v => v.name === name)
            || voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
        if (match) {
            this.selectedVoice = match;
            return true;
        }
        return false;
    },

    // Fallback when the AI-assigned browser_voice is missing or invalid
    // (e.g. user skipped the interviewer step). The Web Speech API doesn't
    // expose a gender property, so we infer it from common OS voice names.
    selectFallbackVoice(lang, gender) {
        const voices = this.getVoices();
        if (!voices.length) return null;

        const langPrefix = (lang || 'en').toLowerCase().slice(0, 2);
        const isMale = (gender || '').toLowerCase() === 'male';
        const maleHints = /\b(male|david|james|mark|daniel|thomas)\b/i;
        const femaleHints = /\b(female|zira|susan|hazel|samantha|kate|victoria|karen)\b/i;

        const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
        const pool = langVoices.length ? langVoices : voices;

        let best = pool[0];
        let bestScore = -999;
        for (const v of pool) {
            let score = 0;
            if (v.lang.toLowerCase().startsWith(langPrefix)) score += 10;
            const check = isMale ? maleHints : femaleHints;
            const anti = isMale ? femaleHints : maleHints;
            if (check.test(v.name)) score += 5;
            if (anti.test(v.name)) score -= 5;
            if (v.localService) score += 1;
            if (score > bestScore) { bestScore = score; best = v; }
        }
        this.selectedVoice = best;
        return best;
    },

    async speak(text, { lang, rate, pitch } = {}) {
        this.stop();
        const synth = window.speechSynthesis;
        if (!synth) throw new Error('Speech synthesis not supported');

        if (!this.selectedVoice) {
            this.selectFallbackVoice(lang, 'female');
        }

        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            if (this.selectedVoice) utterance.voice = this.selectedVoice;
            utterance.lang = lang || 'en-US';
            utterance.rate = rate ?? this._rate;
            utterance.pitch = pitch ?? this._pitch;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
                if (e.error === 'canceled' || e.error === 'interrupted') {
                    resolve();
                } else {
                    reject(new Error(`Browser TTS error: ${e.error}`));
                }
            };

            synth.speak(utterance);
        });
    },

    stop() {
        window.speechSynthesis?.cancel();
    }
};

// =============================================================================
// UNIFIED TTS FACADE
// =============================================================================
const ttsService = {
    engine: 'browser',
    _quotaExhausted: false,
    _fallbackNotified: false,

    /**
     * The engine currently in use, accounting for automatic quota fallback.
     */
    get activeEngine() {
        return (this.engine === 'gemini' && this._quotaExhausted) ? 'browser' : this.engine;
    },

    get isUsingFallback() {
        return this.engine === 'gemini' && this._quotaExhausted;
    },

    setEngine(engine) {
        this.stop();
        this.engine = engine;
        this._quotaExhausted = false;
        this._fallbackNotified = false;
        if (engine === 'browser') {
            browserTts.init();
        } else if (engine === 'gemini') {
            geminiTts.initAudioContext();
        }
    },

    /**
     * Activate browser fallback due to Gemini quota exhaustion.
     * Initializes the browser engine and returns true if the caller
     * should show a notification (only fires once per session).
     */
    activateFallback() {
        this._quotaExhausted = true;
        browserTts.init();
        if (!this._fallbackNotified) {
            this._fallbackNotified = true;
            return true;
        }
        return false;
    },

    /**
     * Ping the Gemini TTS API to verify quota availability.
     * @returns {Promise<boolean>} true if quota is available
     */
    async checkQuota() {
        try {
            await api.post('/voice/ping');
            this._quotaExhausted = false;
            return true;
        } catch (e) {
            if (e.quotaExceeded) {
                this.activateFallback();
                return false;
            }
            // Non-quota errors (network, 5xx) - assume unavailable
            this.activateFallback();
            return false;
        }
    },

    setVoiceByName(name) {
        if (this.activeEngine === 'browser') {
            return browserTts.setVoiceByName(name);
        }
        return false;
    },

    setFallbackVoice(lang, gender) {
        browserTts.selectFallbackVoice(lang, gender);
    },

    async synthesize(text, gender, style, signal) {
        if (this.activeEngine === 'gemini') {
            try {
                return await geminiTts.synthesize(text, gender, style, signal);
            } catch (e) {
                if (e.quotaExceeded) {
                    this.activateFallback();
                    e._triggeredFallback = true;
                }
                throw e;
            }
        }
        return null;
    },

    async playAudio(audioContent) {
        if (audioContent) {
            await geminiTts.playAudio(audioContent);
        }
    },

    async speak(text, { gender, style, lang } = {}) {
        this.stop();
        if (this.activeEngine === 'gemini') {
            try {
                await geminiTts.speak(text, { gender, style });
            } catch (e) {
                if (e.quotaExceeded) {
                    this.activateFallback();
                    browserTts.init();
                    await browserTts.speak(text, { lang, gender });
                } else {
                    throw e;
                }
            }
        } else {
            await browserTts.speak(text, { lang, gender });
        }
    },

    stop() {
        geminiTts.stop();
        browserTts.stop();
    }
};