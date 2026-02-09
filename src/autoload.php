<?php
/**
 * src/autoload.php
 * PSR-4 style autoloader
 *
 * Maps namespace prefixes to source directories:
 *   PrepGenius\Controllers\*  → src/Controllers/*.php
 *   PrepGenius\Services\*     → src/Services/*.php
 *   PrepGenius\ExternalAPIs\* → src/ExternalAPIs/*.php
 *   PrepGenius\Prompts\*      → src/Prompts/*.php
 *   PrepGenius\Utils\*        → src/Utils/*.php
 */

spl_autoload_register(function (string $class): void {
    $prefix = 'PrepGenius\\';

    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});
