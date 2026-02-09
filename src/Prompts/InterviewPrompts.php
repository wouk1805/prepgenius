<?php
/**
 * src/Prompts/InterviewPrompts.php
 * Prompt templates for interview conversation flow
 */

namespace PrepGenius\Prompts;

final class InterviewPrompts
{
    private const QUESTION_STYLES = [
        'concise'  => 'Keep it brief (2 sentences max). Direct and to the point.',
        'balanced' => 'Natural and warm (2-3 sentences). Professional but friendly.',
        'detailed' => 'Detailed and contextual (3-4 sentences). Set the scene and expectations.',
    ];

    private const FOLLOW_UP_STYLES = [
        'concise'  => 'Ask brief, direct questions (1-2 sentences). No lengthy preambles.',
        'balanced' => 'Ask natural, conversational questions (2-3 sentences). Brief context if needed.',
        'detailed' => 'Set context before asking (3-4 sentences). Include scenarios and specifics.',
    ];

    private const INTERVIEW_TYPES = [
        'full'       => 'Mix question types evenly: behavioral, technical, and situational. Vary the type from the previous question.',
        'behavioral' => 'Focus on BEHAVIORAL questions. Use the STAR format (Situation, Task, Action, Result). Ask about past experiences, teamwork, conflict resolution, leadership, and decision-making. Avoid purely technical or coding questions.',
        'technical'  => 'Focus on TECHNICAL questions. Ask about specific technologies, tools, system design, problem-solving approaches, and domain expertise relevant to the job description. Avoid generic behavioral questions.',
        'quick'      => 'Ask focused, high-impact questions that cover the most critical job requirements. Prioritize the top skills and responsibilities from the job description.',
    ];

    public static function questionStyle(string $style): string
    {
        return self::QUESTION_STYLES[$style] ?? self::QUESTION_STYLES['balanced'];
    }

    public static function followUpStyle(string $style): string
    {
        return self::FOLLOW_UP_STYLES[$style] ?? self::FOLLOW_UP_STYLES['balanced'];
    }

    public static function interviewTypeInstruction(string $type): string
    {
        return self::INTERVIEW_TYPES[$type] ?? self::INTERVIEW_TYPES['full'];
    }

    public static function opening(
        string $personaJson,
        string $cvJson,
        string $jdJson,
        string $styleInstruction,
        string $langInstruction,
        string $typeInstruction,
    ): string {
        return <<<PROMPT
You are an interviewer starting a mock interview.
PERSONA: {$personaJson}
CV: {$cvJson}
JOB: {$jdJson}
STYLE: {$styleInstruction}
QUESTION FOCUS: {$typeInstruction}
{$langInstruction}

CRITICAL RULES:
1. The JOB DESCRIPTION defines the interview scope. Your first question MUST be specifically about the requirements, responsibilities, or skills listed in the JOB DESCRIPTION - not a generic question about the candidate's background. Use the CV only to personalize your phrasing, NOT to choose the topic.
2. Your message MUST contain exactly TWO parts: a brief introduction (1-2 sentences) AND a specific interview question. The question is mandatory - never send an introduction without a question.
3. If the persona includes an opening_statement, use it as inspiration for your greeting tone, but you MUST still append a specific interview question.

Generate the opening message now.
Return ONLY the message text, no JSON.
PROMPT;
    }

    public static function nextQuestion(
        string $personaJson,
        string $cvJson,
        string $jdJson,
        string $historyJson,
        string $candidateResponse,
        int $questionNum,
        int $targetQuestions,
        string $styleInstruction,
        string $langInstruction,
        string $typeInstruction,
    ): string {
        return <<<PROMPT
You are conducting a mock interview. This is question {$questionNum} of {$targetQuestions}.
PERSONA: {$personaJson}
CV: {$cvJson}
JOB: {$jdJson}
CONVERSATION SO FAR: {$historyJson}
CANDIDATE'S LAST RESPONSE: {$candidateResponse}
STYLE: {$styleInstruction}
QUESTION FOCUS: {$typeInstruction}
{$langInstruction}

CRITICAL RULES FOR QUESTION SELECTION:
1. Your questions must be DRIVEN BY THE JOB DESCRIPTION - target its specific requirements, responsibilities, technical skills, and soft skills.
2. Use the CV to personalize follow-ups (reference the candidate's specific experience) but do NOT let the CV dominate topic choice.
3. NEVER repeat a topic or skill already covered in the conversation. Check the conversation history carefully.
4. Follow the QUESTION FOCUS instruction above for the type of questions to ask.
5. Each question must target a DIFFERENT requirement or responsibility from the JOB DESCRIPTION.

Generate a natural follow-up or new question.
You MUST ask exactly one new question. Do NOT end or wrap up the interview.
Return JSON:
{
    "message": "Your response and next question"
}
Return ONLY valid JSON.
PROMPT;
    }

    public static function closing(
        string $personaJson,
        string $historyJson,
        string $candidateResponse,
        int $targetQuestions,
        string $langInstruction,
    ): string {
        return <<<PROMPT
You are wrapping up a mock interview. All {$targetQuestions} questions have been asked.
PERSONA: {$personaJson}
CONVERSATION SO FAR: {$historyJson}
CANDIDATE'S LAST RESPONSE: {$candidateResponse}
{$langInstruction}

Generate a SHORT closing statement (1-2 sentences max). Thank the candidate, say goodbye naturally.
Do NOT ask any new questions. Do NOT give feedback or evaluation.
Return JSON:
{
    "message": "Your brief closing statement",
    "is_complete": true
}
Return ONLY valid JSON.
PROMPT;
    }

    public static function languageInstruction(string $language): string
    {
        return match ($language) {
            'fr' => 'IMPORTANT: Conduct the interview entirely in French.',
            default => 'IMPORTANT: Conduct the interview entirely in English.',
        };
    }
}