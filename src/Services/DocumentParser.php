<?php
/**
 * src/Services/DocumentParser.php
 * CV/JD parsing and CV-to-JD match analysis via Gemini
 */

namespace PrepGenius\Services;

use PrepGenius\ExternalAPIs\GeminiAPI;
use PrepGenius\ExternalAPIs\DocumentExtractor;
use PrepGenius\Prompts\DocumentPrompts;
use PrepGenius\Utils\Json;

final class DocumentParser
{
    public function __construct(
        private readonly GeminiAPI $gemini = new GeminiAPI(),
    ) {}

    public function parseCV(string $fileContent, string $mimeType): array
    {
        $response = $this->processDocument($fileContent, $mimeType, DocumentPrompts::cvParsing());
        $parsed = GeminiAPI::extractJson($response);
        $parsed['_meta'] = ['parsed_at' => date('c'), 'type' => 'cv'];

        return $parsed;
    }

    public function parseJobDescription(string $content, bool $isFile = false, string $mimeType = 'text/plain'): array
    {
        $prompt = DocumentPrompts::jobDescriptionParsing();

        $response = $isFile
            ? $this->processDocument($content, $mimeType, $prompt)
            : $this->gemini->generateContent("{$prompt}\n\nJob Description:\n{$content}", 'flash', null, 'high');

        $parsed = GeminiAPI::extractJson($response);
        $parsed['_meta'] = ['parsed_at' => date('c'), 'type' => 'job_description'];

        return $parsed;
    }

    public function analyzeMatch(array $cvData, array $jdData): array
    {
        $prompt = DocumentPrompts::matchAnalysis(
            Json::encode($cvData),
            Json::encode($jdData),
        );

        $response = $this->gemini->generateContent($prompt, 'flash', null, 'high');
        $analysis = GeminiAPI::extractJson($response);
        $analysis['_meta'] = ['analyzed_at' => date('c')];

        return $analysis;
    }

    private function processDocument(string $fileContent, string $mimeType, string $prompt): array
    {
        $text = $this->extractText($fileContent, $mimeType);

        if ($text !== null) {
            return $this->gemini->generateContent(
                "{$prompt}\n\nDocument Content:\n{$text}",
                'flash',
                null,
                'high',
            );
        }

        return $this->gemini->parseDocument(base64_encode($fileContent), $mimeType, $prompt);
    }

    /**
     * Extract plain text from the document when the format supports it.
     * Returns null for binary formats that Gemini should parse directly.
     */
    private function extractText(string $fileContent, string $mimeType): ?string
    {
        return match ($mimeType) {
            'text/plain' => $fileContent,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                => DocumentExtractor::extractTextFromDocx($fileContent)
                    ?: throw new \RuntimeException('Could not extract text from DOCX file'),
            'application/msword'
                => DocumentExtractor::extractTextFromDoc($fileContent)
                    ?: throw new \RuntimeException('Could not extract text from DOC file'),
            default => null,
        };
    }
}