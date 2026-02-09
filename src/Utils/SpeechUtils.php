<?php
/**
 * src/Utils/SpeechUtils.php
 * Filler word detection, transcript cleaning, and voice persona mapping
 */

namespace PrepGenius\Utils;

final class SpeechUtils
{
    private const FILLER_PATTERNS = [
        'en' => ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well', 'i mean'],
        'fr' => ['euh', 'ben', 'genre', 'en fait', 'voilà', 'du coup', 'quoi', 'bah'],
    ];

    public static function getVoiceForPersona(string $personaType): string
    {
        return INTERVIEWER_VOICES[$personaType] ?? INTERVIEWER_VOICES['professional_female'];
    }

    public static function detectFillerWords(string $transcript, string $language = 'en'): array
    {
        $patterns  = self::FILLER_PATTERNS[$language] ?? self::FILLER_PATTERNS['en'];
        $text      = strtolower($transcript);
        $breakdown = [];
        $total     = 0;

        foreach ($patterns as $filler) {
            $escaped = preg_quote($filler, '/');
            $count = preg_match_all('/\b' . $escaped . '\b/ui', $text);
            if ($count > 0) {
                $breakdown[$filler] = $count;
                $total += $count;
            }
        }

        return [
            'total_count' => $total,
            'breakdown'   => $breakdown,
        ];
    }

    /**
     * Clean raw transcript output from Gemini: strip empty markers and wrapping quotes.
     */
    public static function cleanTranscript(string $rawTranscript): string
    {
        if (stripos($rawTranscript, '[EMPTY]') !== false) {
            return '';
        }

        $transcript = preg_replace('/\[(SILENCE|NO SPEECH|INAUDIBLE)\]/i', '', $rawTranscript);

        if (preg_match('/^"(.*)"$/s', $transcript, $m) && substr_count($m[1], '"') === 0) {
            $transcript = $m[1];
        }

        return trim($transcript);
    }
}