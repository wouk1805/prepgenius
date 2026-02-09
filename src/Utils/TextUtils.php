<?php
/**
 * src/Utils/TextUtils.php
 * Name formatting (hyphenated, prefixed, apostrophed)
 */

namespace PrepGenius\Utils;

final class TextUtils
{
    private const LOWERCASE_PREFIXES = [
        'van', 'von', 'de', 'del', 'della', 'di', 'da', 'du', 'la', 'le', 'den', 'der',
    ];

    public static function formatName(string $name): string
    {
        $name = trim($name);
        if ($name === '') {
            return '';
        }

        $parts = preg_split('/\s+/', $name);
        $formatted = [];

        foreach ($parts as $index => $part) {
            $lower = strtolower($part);

            if ($index > 0 && in_array($lower, self::LOWERCASE_PREFIXES, true)) {
                $formatted[] = $lower;
                continue;
            }

            if (str_contains($part, '-')) {
                $hyphenParts = explode('-', $part);
                $formatted[] = implode('-', array_map(self::capitalizeWord(...), $hyphenParts));
                continue;
            }

            if (preg_match("/^([oOdD])'([a-zA-Z]+)$/", $part, $matches)) {
                $formatted[] = strtoupper($matches[1]) . "'" . ucfirst(strtolower($matches[2]));
                continue;
            }

            if (preg_match('/^(mc|mac)([a-zA-Z]+)$/i', $part, $matches)) {
                $formatted[] = ucfirst(strtolower($matches[1])) . ucfirst(strtolower($matches[2]));
                continue;
            }

            $formatted[] = self::capitalizeWord($part);
        }

        return implode(' ', $formatted);
    }

    private static function capitalizeWord(string $word): string
    {
        return ucfirst(strtolower($word));
    }
}
