<?php
/**
 * src/Utils/Json.php
 * Safe JSON parsing and encoding helpers
 */

namespace PrepGenius\Utils;

final class Json
{
    public static function parseField(mixed $value): ?array
    {
        if ($value === null) {
            return null;
        }
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }
        return null;
    }

    /**
     * Encode a value to JSON with Unicode preserved by default.
     */
    public static function encode(mixed $value, int $flags = 0): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | $flags);
    }
}
