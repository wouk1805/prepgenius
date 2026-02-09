<?php
/**
 * src/Services/FeedbackAnalyzer.php
 * Orchestrates feedback generation: Gemini call, scoring, and enrichment
 */

namespace PrepGenius\Services;

use PrepGenius\ExternalAPIs\GeminiAPI;
use PrepGenius\Prompts\FeedbackPrompts;
use PrepGenius\Utils\Json;

final class FeedbackAnalyzer
{
    private const SCORE_WEIGHTS = [
        'with_video'    => ['content' => 0.5, 'delivery' => 0.3, 'visual' => 0.2],
        'without_video' => ['content' => 0.6, 'delivery' => 0.4],
    ];

    public function __construct(
        private readonly GeminiAPI $gemini = new GeminiAPI(),
        private readonly VideoAnalyzer $videoAnalyzer = new VideoAnalyzer(),
        private readonly DeliveryAnalyzer $deliveryAnalyzer = new DeliveryAnalyzer(),
    ) {}

    /**
     * Generate bilingual feedback (EN + FR) in a single Gemini call.
     * Returns structured feedback with language-independent scores
     * and localised text content under 'en' and 'fr' keys.
     */
    public function generateFeedbackFromData(
        ?array $cvData,
        ?array $jdData,
        array $conversationHistory,
        ?array $speechMetrics,
        ?array $videoAnalysis,
    ): array {
        $visualAnalysis = $this->videoAnalyzer->aggregate($videoAnalysis ?? []);

        $qaPairs = $this->extractQAPairs($conversationHistory);

        $prompt = FeedbackPrompts::feedbackAnalysis(
            Json::encode($qaPairs),
            Json::encode($cvData ?? []),
            Json::encode($jdData ?? []),
        );

        $response = $this->gemini->generateContent($prompt, 'pro', null, 'high', 32768, 300);
        $feedback = GeminiAPI::extractJson($response);

        if (empty($feedback) || !isset($feedback['scores'])) {
            Logger::warning('Feedback JSON parsing failed or incomplete', [
                'keys' => array_keys($feedback),
                'response_text' => substr(GeminiAPI::extractText($response), 0, 500),
            ]);
            throw new \RuntimeException('Feedback generation returned incomplete data. Please try again.');
        }

        $feedback = $this->enrichWithVisualAnalysis($feedback, $visualAnalysis);
        $feedback = $this->enrichWithSpeechAnalysis($feedback, $speechMetrics);
        $feedback['scores']['overall'] = $this->calculateOverallScore($feedback['scores']);
        $feedback['_meta'] = ['generated_at' => date('c')];

        return $feedback;
    }

    // =========================================================================
    // Post-processing
    // =========================================================================

    private function enrichWithVisualAnalysis(array $feedback, array $visualAnalysis): array
    {
        if (!empty($visualAnalysis['frame_count'])) {
            $feedback['visual_analysis']  = $visualAnalysis;
            $feedback['scores']['visual'] = $visualAnalysis['overall_visual_score'] ?? 0;
        }
        return $feedback;
    }

    private function enrichWithSpeechAnalysis(array $feedback, ?array $speechMetrics): array
    {
        if (empty($speechMetrics)) {
            return $feedback;
        }

        $deliveryAnalysis = $this->deliveryAnalyzer->analyze($speechMetrics);
        $feedback['delivery_analysis'] = $deliveryAnalysis;

        if (!empty($deliveryAnalysis['overall_score'])) {
            $currentDelivery = $feedback['scores']['delivery'] ?? 70;
            $feedback['scores']['delivery'] = (int) round(($currentDelivery + $deliveryAnalysis['overall_score']) / 2);
        }

        return $feedback;
    }

    // =========================================================================
    // Scoring
    // =========================================================================

    private function calculateOverallScore(array $scores): int
    {
        $content  = $scores['content'] ?? 70;
        $delivery = $scores['delivery'] ?? 70;
        $visual   = $scores['visual'] ?? 0;

        $weights = $visual > 0
            ? self::SCORE_WEIGHTS['with_video']
            : self::SCORE_WEIGHTS['without_video'];

        $overall = ($content * $weights['content']) + ($delivery * $weights['delivery']);

        if ($visual > 0) {
            $overall += $visual * $weights['visual'];
        }

        return (int) round($overall);
    }

    // =========================================================================
    // Conversation extraction
    // =========================================================================

    private function extractQAPairs(array $conversationHistory): array
    {
        $pairs = [];
        $currentQuestion = null;

        foreach ($conversationHistory as $message) {
            if ($message['role'] === 'interviewer') {
                $currentQuestion = $message['content'];
            } elseif ($message['role'] === 'candidate' && $currentQuestion !== null) {
                $pairs[] = [
                    'question' => $currentQuestion,
                    'answer'   => $message['content'],
                    'skipped'  => $message['content'] === '[SKIPPED]',
                ];
                $currentQuestion = null;
            }
        }

        return $pairs;
    }
}