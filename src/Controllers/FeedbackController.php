<?php
/**
 * src/Controllers/FeedbackController.php
 * Generates comprehensive interview performance reports
 */

namespace PrepGenius\Controllers;

use PrepGenius\Services\FeedbackAnalyzer;
use PrepGenius\Utils\Response;
use PrepGenius\Utils\Logger;
use PrepGenius\Utils\Json;

final class FeedbackController
{
    public function __construct(
        private readonly FeedbackAnalyzer $analyzer = new FeedbackAnalyzer(),
    ) {}

    public function generate(array $data): void
    {
        try {
            $cvData              = Json::parseField($data['cv_data'] ?? null);
            $jdData              = Json::parseField($data['jd_data'] ?? null);
            $conversationHistory = Json::parseField($data['conversation_history'] ?? []);
            $speechMetrics       = Json::parseField($data['speech_metrics'] ?? null);
            $videoAnalysis       = Json::parseField($data['video_analysis'] ?? []);

            if (empty($conversationHistory)) {
                Response::validationError(['conversation_history' => ['Conversation history is required']]);
            }

            $feedback = $this->analyzer->generateFeedbackFromData(
                $cvData, $jdData, $conversationHistory,
                $speechMetrics, $videoAnalysis,
            );

            Response::success(['feedback' => $feedback], 'Feedback generated');

        } catch (\Exception $e) {
            Logger::error('Feedback generation failed', ['error' => $e->getMessage()]);
            Response::serverError('Failed to generate feedback: ' . $e->getMessage());
        }
    }
}
