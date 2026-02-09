/**
 * js/features/feedback-utils.js
 * Feedback Utils
 * 
 * Shared feedback utilities used by both FeedbackManager (main app) and ShareViewer (share page)
 */

const FeedbackUtils = {
    /**
     * Resolve bilingual feedback to a flat structure for the given language.
     * The backend returns feedback with shared 'scores' and localized text
     * under 'en' and 'fr' keys.
     */
    resolveFeedback(feedback, language) {
        const localized = feedback[language] || feedback.en;
        if (!localized) return feedback;

        const resolved = {
            scores: feedback.scores,
            summary: localized.summary,
            strengths: localized.strengths,
            improvements: localized.improvements,
            next_steps: localized.next_steps,
            question_feedback: localized.question_feedback,
            delivery_analysis: feedback.delivery_analysis,
            _meta: feedback._meta
        };

        if (feedback.visual_analysis) {
            const va = feedback.visual_analysis;
            resolved.visual_analysis = {
                ...va,
                strengths: va.strengths?.[language] || va.strengths?.en || [],
                areas_for_improvement: va.areas_for_improvement?.[language] || va.areas_for_improvement?.en || []
            };
        }

        return resolved;
    }
};