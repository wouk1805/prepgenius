<?php
/**
 * src/Controllers/VoiceController.php
 * Audio transcription and text-to-speech synthesis
 */

namespace PrepGenius\Controllers;

use PrepGenius\ExternalAPIs\GeminiAPI;
use PrepGenius\Utils\Response;
use PrepGenius\Utils\Logger;
use PrepGenius\Utils\SpeechUtils;

final class VoiceController
{
    private const QUOTA_HTTP_CODES = [429, 503];

    public function __construct(
        private readonly GeminiAPI $gemini = new GeminiAPI(),
    ) {}

    public function transcribe(array $data): void
    {
        try {
            [$audioData, $mimeType] = $this->resolveAudioInput($data);

            if ($audioData === null) {
                Response::validationError(['audio' => ['Audio data required']]);
            }

            $language       = $data['language'] ?? 'en';
            $rawTranscript  = $this->gemini->transcribeAudio($audioData, $mimeType);
            $transcript     = SpeechUtils::cleanTranscript($rawTranscript);
            $isEmpty        = $transcript === '';

            if ($isEmpty) {
                Response::success([
                    'transcript'  => '',
                    'language'    => $language,
                    'is_empty'    => true,
                    'confidence'  => 'low',
                    'metrics'     => ['word_count' => 0, 'filler_words' => ['total_count' => 0, 'breakdown' => []]],
                ], 'No speech detected');
            }

            Response::success([
                'transcript'  => $transcript,
                'language'    => $language,
                'is_empty'    => false,
                'confidence'  => 'high',
                'metrics'     => [
                    'word_count'   => str_word_count($transcript),
                    'filler_words' => SpeechUtils::detectFillerWords($transcript, $language),
                ],
            ], 'Audio transcribed');

        } catch (\Exception $e) {
            Logger::error('Transcription failed', ['error' => $e->getMessage()]);
            Response::serverError('Transcription failed: ' . $e->getMessage());
        }
    }

    public function synthesize(array $data): void
    {
        if (empty($data['text'])) {
            Response::validationError(['text' => ['Required']]);
        }

        try {
            $gender = $data['gender'] ?? 'female';
            $style  = $data['style'] ?? 'professional';
            $voice  = SpeechUtils::getVoiceForPersona("{$style}_{$gender}");

            $response = $this->gemini->textToSpeech($data['text'], $voice, $data['style_prompt'] ?? null);

            Response::success([
                'audio_content' => GeminiAPI::extractAudio($response),
                'audio_format'  => 'pcm',
                'voice'         => $voice,
            ], 'Speech synthesized');

        } catch (\RuntimeException $e) {
            if ($this->isQuotaError($e)) {
                Logger::warning('TTS quota exceeded', ['code' => $e->getCode()]);
                Response::error('API quota exceeded', 429);
            }

            Logger::error('Speech synthesis failed', ['error' => $e->getMessage()]);
            Response::serverError('Speech synthesis failed: ' . $e->getMessage());

        } catch (\Exception $e) {
            Logger::error('Speech synthesis failed', ['error' => $e->getMessage()]);
            Response::serverError('Speech synthesis failed: ' . $e->getMessage());
        }
    }

    /**
     * Lightweight TTS probe to verify API quota availability.
     * Synthesizes a single word; the audio payload is discarded.
     */
    public function ping(array $data): void
    {
        try {
            $this->gemini->textToSpeech('This is a voice test.');
            Response::success(['available' => true], 'TTS available');

        } catch (\RuntimeException $e) {
            if ($this->isQuotaError($e)) {
                Logger::info('TTS quota check: exhausted');
                Response::error('API quota exceeded', 429);
            }

            Logger::warning('TTS ping failed', ['error' => $e->getMessage()]);
            Response::error('TTS unavailable: ' . $e->getMessage(), 503);

        } catch (\Exception $e) {
            Logger::warning('TTS ping failed', ['error' => $e->getMessage()]);
            Response::error('TTS unavailable: ' . $e->getMessage(), 503);
        }
    }

    private function isQuotaError(\RuntimeException $e): bool
    {
        if (in_array($e->getCode(), self::QUOTA_HTTP_CODES, true)) {
            return true;
        }

        $msg = strtolower($e->getMessage());
        return str_contains($msg, 'resource_exhausted')
            || str_contains($msg, 'quota')
            || str_contains($msg, 'rate limit');
    }

    /**
     * @return array{0: ?string, 1: string} [base64AudioData, mimeType]
     */
    private function resolveAudioInput(array $data): array
    {
        if (isset($_FILES['audio']) && $_FILES['audio']['error'] === UPLOAD_ERR_OK) {
            return [
                base64_encode(file_get_contents($_FILES['audio']['tmp_name'])),
                $_FILES['audio']['type'] ?? 'audio/webm',
            ];
        }

        if (!empty($data['audio_data'])) {
            $audioData = $data['audio_data'];
            if (str_contains($audioData, ',')) {
                $audioData = explode(',', $audioData)[1];
            }
            return [$audioData, $data['mime_type'] ?? 'audio/webm'];
        }

        return [null, 'audio/webm'];
    }
}