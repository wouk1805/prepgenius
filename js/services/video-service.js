/**
 * js/services/video-service.js
 * Video Capture & Analysis Service
 *
 * Manages webcam access, periodic frame capture, and server-side
 * body-language / visual analysis during interviews
 */

const videoService = {
    videoElement: null,
    canvas: null,
    ctx: null,
    stream: null,
    captureInterval: null,
    frameAnalyses: [],

    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },

    async init(videoElement) {
        this.videoElement = videoElement;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 640;
        this.canvas.height = 480;
        this.ctx = this.canvas.getContext('2d');

        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
        });

        this.videoElement.srcObject = this.stream;
        return this.videoElement.play();
    },

    captureFrame() {
        if (!this.ctx || !this.videoElement) return null;
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
        return this.canvas.toDataURL('image/jpeg', 0.7);
    },

    startCapture(intervalMs) {
        this.frameAnalyses = [];
        setTimeout(() => this.captureAndAnalyze(), 2000);
        this.captureInterval = setInterval(() => this.captureAndAnalyze(), intervalMs || 10000);
    },

    captureAndAnalyze() {
        if (this.frameAnalyses.length >= Config.VIDEO_MAX_FRAMES) return;

        const frame = this.captureFrame();
        if (frame) {
            api.post('/video/analyze-frame', { image_data: frame, timestamp: Date.now() })
                .then((result) => {
                    if (result.analysis) this.frameAnalyses.push(result.analysis);
                })
                .catch((e) => console.warn('Frame analysis failed:', e));
        }
    },

    stopCapture() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
    },

    stop() {
        this.stopCapture();

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    },

    isActive() {
        return this.stream !== null && this.stream.active;
    },

    getFrameAnalyses() {
        return this.frameAnalyses;
    }
};
