<?php
/**
 * src/Controllers/VideoController.php
 * Analyzes video frames for body language assessment
 */

namespace PrepGenius\Controllers;

use PrepGenius\ExternalAPIs\GeminiAPI;
use PrepGenius\Prompts\VideoPrompts;
use PrepGenius\Utils\Response;
use PrepGenius\Utils\Logger;

final class VideoController
{
    public function __construct(
        private readonly GeminiAPI $gemini = new GeminiAPI(),
    ) {}

    public function analyzeFrame(array $data): void
    {
        try {
            $imageData = $this->resolveImageData($data);

            if ($imageData === null) {
                Response::validationError(['frame' => ['Image data required']]);
            }

            $response = $this->gemini->analyzeImage($imageData, VideoPrompts::frameAnalysis());
            $analysis = GeminiAPI::extractJson($response);
            $analysis['_meta'] = [
                'timestamp'   => $data['timestamp'] ?? 0,
                'analyzed_at' => date('c'),
            ];

            Response::success(['analysis' => $analysis], 'Frame analyzed');

        } catch (\Exception $e) {
            Logger::error('Frame analysis failed', ['error' => $e->getMessage()]);
            Response::serverError('Frame analysis failed: ' . $e->getMessage());
        }
    }

    private function resolveImageData(array $data): ?string
    {
        if (!empty($data['image_data'])) {
            return $data['image_data'];
        }

        if (isset($_FILES['frame']) && $_FILES['frame']['error'] === UPLOAD_ERR_OK) {
            return base64_encode(file_get_contents($_FILES['frame']['tmp_name']));
        }

        return null;
    }
}