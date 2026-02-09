<?php
/**
 * src/Prompts/FeedbackPrompts.php
 * Prompt templates for interview feedback analysis
 */

namespace PrepGenius\Prompts;

final class FeedbackPrompts
{
    public static function feedbackAnalysis(
        string $qaPairsJson,
        string $cvJson,
        string $jdJson,
    ): string {
        return <<<PROMPT
Analyze this interview and provide detailed feedback with ideal responses.
Generate ALL text content in BOTH English AND French.

QUESTION-ANSWER PAIRS: {$qaPairsJson}
CANDIDATE CV: {$cvJson}
JOB REQUIREMENTS: {$jdJson}

CRITICAL FORMATTING RULES:
- Use simple HTML tags for text formatting: <strong>text</strong> for bold, <em>text</em> for italics, <br> for line breaks
- NEVER use Markdown formatting (no **, no *, no #, no - lists)
- Use numbered lists as plain text: "1. First item 2. Second item"
- Keep formatting simple and readable

CRITICAL LANGUAGE RULES:
- The interview transcript may be in English OR French. Regardless of the transcript language, you MUST produce COMPLETE output in BOTH languages.
- The "en" object must contain ALL text written ENTIRELY in English. Every single field: summary, strengths, improvements, next_steps, and ALL question_feedback fields (question, your_answer, feedback, ideal_answer) must be in English.
- The "fr" object must contain ALL text written ENTIRELY in French. Every single field: summary, strengths, improvements, next_steps, and ALL question_feedback fields (question, your_answer, feedback, ideal_answer) must be in French.
- NEVER mix languages within a single field. If the interview was in French, translate questions and answers to English for the "en" section. If the interview was in English, translate to French for the "fr" section.
- For question_feedback: the "question" field must be a translation/adaptation of the original interviewer question into the target language. The "your_answer" must summarize what the candidate said in the target language. The "ideal_answer" must be written fully in the target language.

Return JSON with this EXACT structure:
{
    "scores": {
        "overall": 0-100,
        "content": 0-100,
        "delivery": 0-100
    },
    "en": {
        "summary": "2-3 sentence overall assessment in English",
        "strengths": ["strength 1 in English", "strength 2 in English"],
        "improvements": [
            {"area": "Area name in English", "priority": "high/medium/low", "suggestion": "Specific suggestion in English"}
        ],
        "next_steps": ["Action 1 in English", "Action 2 in English"],
        "question_feedback": [
            {
                "question": "The interviewer's question in English",
                "your_answer": "Summary of candidate's answer in English",
                "score": 0-100,
                "feedback": "What was good and what could be improved in English (use <strong> for emphasis)",
                "ideal_answer": "A model answer using STAR format in English (use <strong> for emphasis)"
            }
        ]
    },
    "fr": {
        "summary": "Évaluation globale de 2-3 phrases en français",
        "strengths": ["point fort 1 en français", "point fort 2 en français"],
        "improvements": [
            {"area": "Nom du domaine en français", "priority": "high/medium/low", "suggestion": "Suggestion spécifique en français"}
        ],
        "next_steps": ["Action 1 en français", "Action 2 en français"],
        "question_feedback": [
            {
                "question": "La question de l'intervieweur en français",
                "your_answer": "Résumé de la réponse du candidat en français",
                "score": 0-100,
                "feedback": "Ce qui était bien et ce qui pourrait être amélioré en français (utiliser <strong> pour emphase)",
                "ideal_answer": "Réponse modèle au format STAR en français (utiliser <strong> pour emphase)"
            }
        ]
    }
}

IMPORTANT:
- The "scores" object is shared (language-independent numbers)
- "en" and "fr" must contain the SAME analysis but in their respective languages
- "question_feedback" arrays must have the same length and same "score" values in both languages
- Each "question_feedback" item corresponds to the same interview question
- EVERY field inside "en" must be 100% English. EVERY field inside "fr" must be 100% French. No exceptions, no mixing.
- Include ALL questions, even skipped ones. For skipped questions (where answer is "[SKIPPED]" or skipped=true): set "your_answer" to "[SKIPPED]", set "score" to 0, provide feedback explaining this question was skipped and why it matters, and still provide a complete ideal_answer
- Return ONLY valid JSON
PROMPT;
    }
}