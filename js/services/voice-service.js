/**
 * Voice Recording & Transcription Service
 *
 * Manages microphone capture and server-side transcription via the Gemini API
 * Exposes the Web Audio analyser for external consumers (e.g. audio visualizer)
 */

const voiceService = {
    mediaRecorder: null,
    audioChunks: [],
    stream: null,
    recordingStartTime: null,

    audioContext: null,
    analyser: null,

    async startRecording() {
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.4;
        source.connect(this.analyser);

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
        this.audioChunks = [];
        this.recordingStartTime = Date.now();

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        this.mediaRecorder.start(100);
    },

    stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                this.cleanup();
                reject(new Error('No active recording'));
                return;
            }

            const recordingDuration = Date.now() - this.recordingStartTime;

            this.closeAudioContext();

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });

                this.releaseStream();

                if (recordingDuration < 500) {
                    reject(new Error('Recording too short'));
                    return;
                }

                if (blob.size < Config.MIN_AUDIO_BLOB_SIZE) {
                    reject(new Error('No audio data captured'));
                    return;
                }

                resolve(blob);
            };

            this.mediaRecorder.onerror = (e) => {
                this.cleanup();
                reject(new Error('Recording error: ' + e.error));
            };

            this.mediaRecorder.stop();
        });
    },

    closeAudioContext() {
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
        this.analyser = null;
    },

    releaseStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
    },

    cleanup() {
        this.closeAudioContext();
        this.releaseStream();
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingStartTime = null;
    },

    async transcribe(audioBlob, language, signal) {
        if (!audioBlob || audioBlob.size < Config.MIN_AUDIO_BLOB_SIZE) {
            throw new Error('No audio recorded');
        }

        const base64 = await this.blobToBase64(audioBlob);
        return api.post('/voice/transcribe', {
            audio_data: base64,
            mime_type: audioBlob.type,
            language: language || 'en'
        }, signal);
    },

    blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });
    }
};