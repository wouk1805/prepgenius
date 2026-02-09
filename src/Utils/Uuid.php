<?php
/**
 * src/Utils/Uuid.php
 * UUID v4 generation using cryptographically secure randomness
 */

namespace PrepGenius\Utils;

final class Uuid
{
    public static function generate(): string
    {
        $bytes = random_bytes(16);

        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
