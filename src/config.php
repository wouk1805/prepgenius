<?php
/**
 * src/config.php
 * Backend Configuration
 */

// Domain & URLs
define('DOMAIN', 'wouk1805.com');
define('PROTOCOL', 'https');
define('BASE_URL', PROTOCOL . '://' . DOMAIN);

// Project Identity
define('PROJECT_NAME', 'PrepGenius');
define('PROJECT_TAGLINE', 'AI-Powered Interview Preparation');
define('PROJECT_VERSION', '1.0.0');

define('PROJECT_SLUG', strtolower(preg_replace('/[^a-zA-Z0-9]/', '', PROJECT_NAME)));
define('PROJECT_URL', BASE_URL . '/projects/' . PROJECT_SLUG);

// Environment
define('ENVIRONMENT', 'production');
define('DEBUG_MODE', ENVIRONMENT === 'development');

// Paths
define('ROOT_PATH', dirname(__DIR__));
define('SRC_PATH', ROOT_PATH . '/src');
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('LOGS_PATH', STORAGE_PATH . '/logs');
define('SHARES_PATH', STORAGE_PATH . '/shares');

// Gemini Configuration
define('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta');

define('GEMINI_MODELS', [
    'flash' => 'gemini-3-flash-preview',
    'pro' => 'gemini-3-pro-preview',
    'tts' => 'gemini-2.5-flash-preview-tts',
]);

define('GEMINI_DEFAULT_CONFIG', [
    'temperature' => 1.0,
    'topK' => 40,
    'topP' => 0.95,
    'maxOutputTokens' => 8192,
]);

define('INTERVIEWER_VOICES', [
    'professional_female' => 'Kore',
    'professional_male' => 'Fenrir',
    'friendly_female' => 'Leda',
    'friendly_male' => 'Puck',
]);

// CORS
define('CORS_ALLOWED_ORIGINS', [
    BASE_URL,
    'http://localhost',
    'http://localhost:3000',
]);

// Load Secrets (API Keys)
$secretsFile = __DIR__ . '/secrets.php';
if (file_exists($secretsFile)) {
    require_once $secretsFile;
} else {
    define('GEMINI_API_KEY', '');
    if (DEBUG_MODE) {
        trigger_error('secrets.php not found. Create from secrets.example.php', E_USER_WARNING);
    }
}

// Error Handling
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}

date_default_timezone_set('Europe/Paris');