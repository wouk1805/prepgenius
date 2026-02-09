<?php
/**
 * src/Services/InterviewEngine.php
 * Conversation flow, question generation, and interview logic
 */

namespace PrepGenius\Services;

use PrepGenius\ExternalAPIs\GeminiAPI;
use PrepGenius\Prompts\InterviewPrompts;
use PrepGenius\Utils\Json;

final class InterviewEngine
{
    public function __construct(
        private readonly GeminiAPI $gemini = new GeminiAPI(),
    ) {}

    public function generateOpeningMessage(
        ?array $cvData,
        ?array $jdData,
        ?array $persona,
        string $questionStyle = 'balanced',
        string $language = 'en',
        string $interviewType = 'full',
    ): string {
        $prompt = InterviewPrompts::opening(
            Json::encode($persona ?? []),
            Json::encode($cvData ?? []),
            Json::encode($jdData ?? []),
            InterviewPrompts::questionStyle($questionStyle),
            InterviewPrompts::languageInstruction($language),
            InterviewPrompts::interviewTypeInstruction($interviewType),
        );

        $response = $this->gemini->generateContent($prompt, 'flash');

        return trim(GeminiAPI::extractText($response)) ?: 'Hello! Tell me about yourself.';
    }

    public function generateNextQuestion(
        ?array $cvData,
        ?array $jdData,
        ?array $persona,
        array $conversationHistory,
        string $candidateResponse,
        int $questionsAsked,
        int $targetQuestions,
        string $questionStyle = 'balanced',
        string $language = 'en',
        string $interviewType = 'full',
    ): array {
        $personaJson     = Json::encode($persona ?? []);
        $historyJson     = Json::encode($conversationHistory);
        $langInstruction = InterviewPrompts::languageInstruction($language);
        $typeInstruction = InterviewPrompts::interviewTypeInstruction($interviewType);
        $isLastQuestion  = ($questionsAsked + 1) >= $targetQuestions;

        $prompt = $isLastQuestion
            ? InterviewPrompts::closing($personaJson, $historyJson, $candidateResponse, $targetQuestions, $langInstruction)
            : InterviewPrompts::nextQuestion(
                $personaJson,
                Json::encode($cvData ?? []),
                Json::encode($jdData ?? []),
                $historyJson,
                $candidateResponse,
                $questionsAsked + 1,
                $targetQuestions,
                InterviewPrompts::followUpStyle($questionStyle),
                $langInstruction,
                $typeInstruction,
            );

        $response = $this->gemini->generateContent($prompt, 'flash');
        $result = GeminiAPI::extractJson($response);

        if (empty($result['message'])) {
            $result['message'] = trim(GeminiAPI::extractText($response))
                ?: ($isLastQuestion
                    ? 'Thank you for your time. Best of luck!'
                    : "That's interesting. Can you tell me more about your experience?");
        }

        return $result;
    }
}