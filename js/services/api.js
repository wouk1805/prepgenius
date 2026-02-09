/**
 * js/services/api.js
 * HTTP Client & Domain Services
 *
 * Base HTTP client with AbortController support and domain-specific
 * service facades for documents, interviews, and sharing
 */

class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || Config.API_BASE_URL;
    }

    async request(method, endpoint, data, isFormData, signal) {
        const url = this.baseUrl + endpoint;
        const options = {
            method,
            headers: {},
            signal
        };

        if (data) {
            if (isFormData) {
                options.body = data;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok || !result.success) {
                let errorMessage = result.message || 'Request failed';
                if (result.errors) {
                    const errorDetails = Object.entries(result.errors)
                        .map(([key, val]) => `${key}: ${val.join(', ')}`)
                        .join('; ');
                    errorMessage = `${errorMessage} (${errorDetails})`;
                }
                const err = new Error(errorMessage);
                err.status = response.status;
                err.quotaExceeded = (response.status === 429);
                throw err;
            }
            return result.data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Cancelled');
            }
            if (error.message && !error.message.includes('fetch')) {
                throw error;
            }
            throw new Error('Network error: ' + (error.message || 'Unable to connect to server'));
        }
    }

    post(endpoint, data, signal) {
        return this.request('POST', endpoint, data, false, signal);
    }

    postForm(endpoint, formData, signal) {
        return this.request('POST', endpoint, formData, true, signal);
    }
}

const api = new ApiService();

// =============================================================================
// DOCUMENT SERVICE
// =============================================================================
const documentService = {
    parseCV(file, signal) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'cv');
        return api.postForm('/documents/upload', formData, signal);
    },

    parseJDFile(file, signal) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'jd');
        return api.postForm('/documents/upload', formData, signal);
    },

    parseJDText(text, signal) {
        return api.post('/documents/upload', { text, type: 'jd' }, signal);
    }
};

// =============================================================================
// INTERVIEW SERVICE
// =============================================================================
const interviewService = {
    prepare(data, signal) {
        return api.post('/interviews/prepare', {
            cv_data: data.cvData,
            jd_data: data.jdData,
            interviewers: data.interviewers || [],
            language: data.language || 'en',
            browser_voices: data.browserVoices || []
        }, signal);
    },

    startInterview(context, signal) {
        return api.post('/interviews/start', {
            cv_data: context.cvData,
            jd_data: context.jdData,
            interviewer_persona: context.interviewerPersona,
            language: context.language,
            question_style: context.questionStyle,
            target_questions: context.targetQuestions,
            interview_type: context.interviewType
        }, signal);
    },

    sendResponse(context, signal) {
        return api.post('/interviews/respond', {
            cv_data: context.cvData,
            jd_data: context.jdData,
            interviewer_persona: context.interviewerPersona,
            conversation_history: context.conversationHistory,
            candidate_response: context.candidateResponse,
            questions_asked: context.questionsAsked,
            target_questions: context.targetQuestions,
            question_style: context.questionStyle,
            language: context.language,
            interview_type: context.interviewType
        }, signal);
    },

    generateFeedback(context, signal) {
        return api.post('/feedback/generate', {
            cv_data: context.cvData,
            jd_data: context.jdData,
            conversation_history: context.conversationHistory,
            speech_metrics: context.speechMetrics,
            video_analysis: context.videoAnalysis,
            language: context.language || 'en'
        }, signal);
    }
};

// =============================================================================
// SHARE SERVICE
// =============================================================================
const shareService = {
    createShare(data, signal) {
        return api.post('/share/create', {
            feedback: data.feedback,
            transcript: data.transcript,
            speech_metrics: data.speechMetrics,
            position: data.position,
            language: data.language || 'en'
        }, signal);
    }
};