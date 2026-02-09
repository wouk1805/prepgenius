<?php
/**
 * src/ExternalAPIs/GeminiAPI.php
 * Unified interface to Google's Gemini API:
 *   - Text generation
 *   - Multimodal document parsing
 *   - Web search with grounding
 *   - Vision / image analysis
 *   - Audio transcription
 *   - Text-to-speech
 */

namespace PrepGenius\ExternalAPIs;

use PrepGenius\Prompts\VoicePrompts;
use PrepGenius\Utils\Logger;

final class GeminiAPI
{
    private readonly string $apiKey;
    private readonly string $baseUrl;
    private readonly array $defaultConfig;

    public function __construct()
    {
        $this->apiKey        = GEMINI_API_KEY;
        $this->baseUrl       = GEMINI_API_BASE_URL;
        $this->defaultConfig = GEMINI_DEFAULT_CONFIG;
    }

    // =========================================================================
    // Core API methods
    // =========================================================================

    public function generateContent(
        string $prompt,
        string $modelType = 'flash',
        ?string $systemInstruction = null,
        string $thinkingLevel = 'LOW',
        ?int $maxOutputTokens = null,
        int $timeout = 120,
    ): array {
        $payload = $this->buildTextPayload(
            [['parts' => [['text' => $prompt]]]],
            $systemInstruction,
            $thinkingLevel,
            $maxOutputTokens,
        );

        return $this->request($this->endpoint($modelType), $payload, $timeout);
    }

    public function parseDocument(string $base64Content, string $mimeType, string $prompt): array
    {
        return $this->requestWithInlineData('flash', $mimeType, $base64Content, $prompt);
    }

    public function analyzeImage(string $imageData, string $prompt, string $mimeType = 'image/jpeg'): array
    {
        if (str_contains($imageData, ',')) {
            $imageData = explode(',', $imageData, 2)[1];
        }

        return $this->requestWithInlineData('flash', $mimeType, $imageData, $prompt);
    }

    /**
     * Send audio to Gemini for transcription and return the raw transcript text.
     * Post-processing (empty detection, quote stripping) is handled by SpeechUtils.
     */
    public function transcribeAudio(string $base64Audio, string $mimeType = 'audio/webm'): string
    {
        $response = $this->requestWithInlineData('flash', $mimeType, $base64Audio, VoicePrompts::transcription());
        return trim(self::extractText($response));
    }

    public function textToSpeech(string $text, string $voice = 'Kore', ?string $stylePrompt = null): array
    {
        $textContent = $stylePrompt ? "[{$stylePrompt}] {$text}" : $text;

        $payload = [
            'contents' => [[
                'parts' => [['text' => $textContent]],
            ]],
            'generationConfig' => [
                'responseModalities' => ['AUDIO'],
                'speechConfig' => [
                    'voiceConfig' => [
                        'prebuiltVoiceConfig' => ['voiceName' => $voice],
                    ],
                ],
            ],
        ];

        return $this->request($this->endpoint('tts'), $payload);
    }

    public function searchWithGrounding(string $query): array
    {
        $payload = [
            'contents' => [[
                'parts' => [['text' => $query]],
            ]],
            'tools' => [[
                'googleSearch' => new \stdClass(),
            ]],
            'generationConfig' => $this->generationConfig('LOW'),
        ];

        return $this->request($this->endpoint('flash'), $payload);
    }

    // =========================================================================
    // Response extraction
    // =========================================================================

    public static function extractText(array $response): string
    {
        $parts = $response['candidates'][0]['content']['parts'] ?? [];

        // With thinking enabled, parts may contain thought entries before the
        // actual response. Walk backwards so the last non-thought text wins.
        for ($i = count($parts) - 1; $i >= 0; $i--) {
            if (!empty($parts[$i]['thought'])) {
                continue;
            }
            if (isset($parts[$i]['text'])) {
                return $parts[$i]['text'];
            }
        }

        // Fallback: return whatever the first part has
        return $parts[0]['text'] ?? '';
    }

    public static function extractJson(array $response): array
    {
        $text = self::extractText($response);

        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $m)) {
            $text = $m[1];
        }

        if (preg_match('/\{[\s\S]*\}/', $text, $m)) {
            $text = $m[0];
        }

        $decoded = json_decode($text, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Logger::warning('Failed to parse JSON from Gemini response', [
                'text' => substr($text, 0, 500),
            ]);
            return [];
        }

        return $decoded;
    }

    public static function extractAudio(array $response): ?string
    {
        foreach ($response['candidates'][0]['content']['parts'] ?? [] as $part) {
            if (isset($part['inlineData']['data'])) {
                return $part['inlineData']['data'];
            }
        }
        return null;
    }

    // =========================================================================
    // Internals
    // =========================================================================

    private function model(string $type = 'flash'): string
    {
        return GEMINI_MODELS[$type] ?? GEMINI_MODELS['flash'];
    }

    private function endpoint(string $modelType): string
    {
        return "{$this->baseUrl}/models/{$this->model($modelType)}:generateContent?key={$this->apiKey}";
    }

    private function generationConfig(?string $thinkingLevel = null, ?int $maxOutputTokens = null): array
    {
        $config = $this->defaultConfig;

        if ($maxOutputTokens !== null) {
            $config['maxOutputTokens'] = $maxOutputTokens;
        }

        if ($thinkingLevel !== null) {
            $config['thinkingConfig'] = ['thinkingLevel' => strtoupper($thinkingLevel)];
        }

        return $config;
    }

    private function buildTextPayload(
        array $contents,
        ?string $systemInstruction,
        string $thinkingLevel,
        ?int $maxOutputTokens = null,
    ): array {
        $payload = [
            'contents'         => $contents,
            'generationConfig' => $this->generationConfig($thinkingLevel, $maxOutputTokens),
        ];

        if ($systemInstruction !== null) {
            $payload['systemInstruction'] = [
                'parts' => [['text' => $systemInstruction]],
            ];
        }

        return $payload;
    }

    private function requestWithInlineData(
        string $modelType,
        string $mimeType,
        string $base64Data,
        string $prompt,
    ): array {
        $payload = [
            'contents' => [[
                'parts' => [
                    ['inlineData' => ['mimeType' => $mimeType, 'data' => $base64Data]],
                    ['text' => $prompt],
                ],
            ]],
            'generationConfig' => $this->generationConfig('LOW'),
        ];

        return $this->request($this->endpoint($modelType), $payload);
    }

    private function request(string $endpoint, array $payload, int $timeout = 120): array
    {
        $ch = curl_init($endpoint);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_TIMEOUT        => $timeout,
        ]);

        Logger::debug('Gemini API Request', ['endpoint' => $endpoint]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            Logger::error('Gemini API curl error', ['error' => $error]);
            throw new \RuntimeException("Gemini API error: {$error}");
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            $errorMsg = $data['error']['message'] ?? 'Unknown error';
            Logger::error('Gemini API error', ['code' => $httpCode, 'message' => $errorMsg]);
            throw new \RuntimeException("Gemini API error ({$httpCode}): {$errorMsg}", $httpCode);
        }

        Logger::debug('Gemini API Response', ['code' => $httpCode]);

        return $data;
    }
}