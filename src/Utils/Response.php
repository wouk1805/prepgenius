<?php
/**
 * src/Utils/Response.php
 * Standardized JSON API responses
 */

namespace PrepGenius\Utils;

final class Response
{
    public static function success(mixed $data = null, string $message = 'Success'): never
    {
        self::send(200, true, $message, $data);
    }

    public static function error(string $message, int $code = 400, mixed $errors = null): never
    {
        self::send($code, false, $message, errors: $errors);
    }

    public static function validationError(array $errors): never
    {
        self::send(422, false, 'Validation failed', errors: $errors);
    }

    public static function notFound(string $message = 'Resource not found'): never
    {
        self::send(404, false, $message);
    }

    public static function serverError(string $message = 'Internal server error'): never
    {
        self::send(500, false, $message);
    }

    private static function send(
        int $code,
        bool $success,
        string $message,
        mixed $data = null,
        mixed $errors = null,
    ): never {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');

        $response = [
            'success'   => $success,
            'message'   => $message,
            'timestamp' => date('c'),
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }
        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        echo Json::encode($response);
        exit;
    }
}
