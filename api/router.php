<?php
/**
 * api/router.php
 * API Router - dispatches /api/{resource}/{action}/{id} to controllers.
 */

require_once __DIR__ . '/../src/config.php';
require_once __DIR__ . '/../src/autoload.php';

use PrepGenius\Utils\Response;
use PrepGenius\Utils\Logger;

// ---------------------------------------------------------------------------
// Runtime limits
// ---------------------------------------------------------------------------

set_time_limit(300);
ini_set('memory_limit', '256M');

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = in_array($origin, CORS_ALLOWED_ORIGINS, true) ? $origin : BASE_URL;

header("Access-Control-Allow-Origin: {$allowedOrigin}");
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

set_exception_handler(static function (\Throwable $e): void {
    Logger::error('Unhandled exception', [
        'message' => $e->getMessage(),
        'trace'   => $e->getTraceAsString(),
    ]);
    Response::serverError(DEBUG_MODE ? $e->getMessage() : 'An error occurred');
});

// ---------------------------------------------------------------------------
// Parse request
// ---------------------------------------------------------------------------

$basePath = '/projects/' . PROJECT_SLUG . '/api';
$path     = trim(str_replace($basePath, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)), '/');
$segments = $path !== '' ? explode('/', $path) : [];

$resource = $segments[0] ?? '';
$action   = $segments[1] ?? '';
$id       = $segments[2] ?? null;
$method   = $_SERVER['REQUEST_METHOD'];

$data = match (true) {
    $method === 'GET' => $_GET,
    str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')
        => json_decode(file_get_contents('php://input'), true) ?? [],
    default => $_POST,
};

// Detect silently truncated POST body (post_max_size exceeded)
if ($method === 'POST' && empty($data)) {
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 0) {
        Logger::warning('POST body likely truncated', ['content_length' => $contentLength]);
        Response::error('Request payload too large', 413);
    }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

if ($resource === 'health' || $resource === '') {
    Response::success([
        'status'    => 'healthy',
        'project'   => PROJECT_NAME,
        'version'   => PROJECT_VERSION,
        'timestamp' => date('c'),
    ], PROJECT_NAME . ' API is running');
}

// ---------------------------------------------------------------------------
// Dispatch to controller
// ---------------------------------------------------------------------------

$controllers = [
    'documents'  => PrepGenius\Controllers\DocumentController::class,
    'interviews' => PrepGenius\Controllers\InterviewController::class,
    'voice'      => PrepGenius\Controllers\VoiceController::class,
    'video'      => PrepGenius\Controllers\VideoController::class,
    'feedback'   => PrepGenius\Controllers\FeedbackController::class,
    'share'      => PrepGenius\Controllers\ShareController::class,
];

if (!isset($controllers[$resource])) {
    Response::notFound("Resource '{$resource}' not found");
}

if ($resource === 'share') {
    if ($method === 'GET' && $action && !$id) {
        $id     = $action;
        $action = 'get';
    } elseif ($method === 'POST' && !$action) {
        $action = 'create';
    }
}

if (!$action) {
    Response::notFound("No action specified for '{$resource}'");
}

$controllerClass  = $controllers[$resource];
$controllerMethod = str_replace('-', '', lcfirst(ucwords($action, '-')));
$controller       = new $controllerClass();

if (!method_exists($controller, $controllerMethod)) {
    Response::notFound("Action '{$controllerMethod}' not found on " . $controllerClass);
}

Logger::info('API Request', [
    'method'   => $method,
    'resource' => $resource,
    'action'   => $controllerMethod,
]);

$id !== null
    ? $controller->$controllerMethod($data, $id)
    : $controller->$controllerMethod($data);