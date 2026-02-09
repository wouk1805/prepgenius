<?php
/**
 * src/Controllers/ShareController.php
 * Creates and retrieves shareable feedback links
 */

namespace PrepGenius\Controllers;

use PrepGenius\Utils\Response;
use PrepGenius\Utils\Logger;
use PrepGenius\Utils\Json;

final class ShareController
{
    private const ID_LENGTH = 12;
    private const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

    public function __construct()
    {
        if (!is_dir(SHARES_PATH)) {
            mkdir(SHARES_PATH, 0755, true);
        }
    }

    public function create(array $data): void
    {
        try {
            $feedback      = Json::parseField($data['feedback'] ?? null);
            $transcript    = Json::parseField($data['transcript'] ?? []);
            $speechMetrics = Json::parseField($data['speech_metrics'] ?? null);
            $position      = self::normalizePosition($data['position'] ?? null);
            $language      = $data['language'] ?? 'en';

            if (!$feedback) {
                Response::validationError(['feedback' => ['Feedback data is required']]);
            }

            $id       = $this->generateContentHash($feedback, $transcript);
            $filePath = SHARES_PATH . '/' . $id . '.json';

            if (file_exists($filePath)) {
                $existing = json_decode(file_get_contents($filePath), true);

                Response::success([
                    'id'         => $id,
                    'url'        => PROJECT_URL . '/share/' . $id,
                    'position'   => $existing['position'] ?? $position,
                    'created_at' => $existing['created_at'] ?? date('c'),
                ], 'Share retrieved');
            }

            $shareData = [
                'id'             => $id,
                'created_at'     => date('c'),
                'language'       => $language,
                'position'       => $position,
                'feedback'       => $feedback,
                'transcript'     => $transcript,
                'speech_metrics' => $speechMetrics,
            ];

            $saved = file_put_contents(
                $filePath,
                Json::encode($shareData, JSON_PRETTY_PRINT),
            );

            if ($saved === false) {
                throw new \RuntimeException('Failed to save share file');
            }

            Logger::info('Share created', ['id' => $id]);

            Response::success([
                'id'         => $id,
                'url'        => PROJECT_URL . '/share/' . $id,
                'position'   => $position,
                'created_at' => $shareData['created_at'],
            ], 'Share created successfully');

        } catch (\Exception $e) {
            Logger::error('Share creation failed', ['error' => $e->getMessage()]);
            Response::serverError('Failed to create share: ' . $e->getMessage());
        }
    }

    public function get(array $data, ?string $id): void
    {
        try {
            if (!$id) {
                Response::validationError(['id' => ['Share ID is required']]);
            }

            if (!preg_match('/^[a-z0-9]{' . self::ID_LENGTH . '}$/', $id)) {
                Response::notFound('Invalid share ID format');
            }

            $filePath = SHARES_PATH . '/' . $id . '.json';

            if (!file_exists($filePath)) {
                Response::notFound('Share not found');
            }

            $shareData = json_decode(file_get_contents($filePath), true);

            if (!$shareData) {
                Response::serverError('Failed to parse share data');
            }

            Response::success($shareData, 'Share retrieved');

        } catch (\Exception $e) {
            Logger::error('Share retrieval failed', ['id' => $id, 'error' => $e->getMessage()]);
            Response::serverError('Failed to retrieve share');
        }
    }

    /**
     * Ensure position is always stored as a bilingual map {en, fr}.
     */
    private static function normalizePosition(mixed $raw): array
    {
        if (\is_array($raw) && ($raw['en'] ?? $raw['fr'] ?? null)) {
            return array_intersect_key($raw, ['en' => 1, 'fr' => 1]);
        }

        if (\is_string($raw) && trim($raw) !== '') {
            return ['en' => trim($raw)];
        }

        return ['en' => 'Interview', 'fr' => 'Entretien'];
    }

    private function generateContentHash(array $feedback, ?array $transcript): string
    {
        $summary = $feedback['en']['summary'] ?? $feedback['summary'] ?? '';

        $payload = Json::encode([
            'scores'          => $feedback['scores'] ?? [],
            'summary'         => $summary,
            'transcript_count' => is_array($transcript) ? count($transcript) : 0,
            'first_message'   => is_array($transcript) && $transcript !== []
                ? ($transcript[0]['content'] ?? '')
                : '',
        ]);

        $hash = hash('sha256', $payload);

        $id = '';
        $charsLength = strlen(self::ID_CHARS);
        for ($i = 0; $i < self::ID_LENGTH; $i++) {
            $byte = hexdec(substr($hash, $i * 2, 2));
            $id .= self::ID_CHARS[$byte % $charsLength];
        }

        return $id;
    }
}