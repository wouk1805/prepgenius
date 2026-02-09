<?php
/**
 * src/Utils/Logger.php
 * File-based logging with sensitive data redaction
 */

namespace PrepGenius\Utils;

final class Logger
{
    private const SENSITIVE_TERMS = ['password', 'api_key', 'apikey', 'token', 'secret'];

    public static function debug(string $message, array $context = []): void
    {
        self::log('DEBUG', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::log('INFO', $message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::log('WARNING', $message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::log('ERROR', $message, $context);
    }

    private static function log(string $level, string $message, array $context): void
    {
        if (!is_dir(LOGS_PATH)) {
            mkdir(LOGS_PATH, 0755, true);
        }

        $logFile = LOGS_PATH . '/app_' . date('Y-m-d') . '.log';
        $context = self::sanitize($context);

        $entry = '[' . date('Y-m-d H:i:s') . "] [{$level}] {$message}";
        if ($context !== []) {
            $entry .= ' ' . Json::encode($context);
        }

        file_put_contents($logFile, $entry . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    private static function sanitize(array $data): array
    {
        array_walk_recursive($data, static function (mixed &$value, int|string $key): void {
            if (!is_string($key)) {
                return;
            }
            foreach (self::SENSITIVE_TERMS as $term) {
                if (stripos($key, $term) !== false) {
                    $value = '[REDACTED]';
                    return;
                }
            }
        });

        return $data;
    }
}
