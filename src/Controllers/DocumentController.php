<?php
/**
 * src/Controllers/DocumentController.php
 * Handles CV and job description upload & parsing
 */

namespace PrepGenius\Controllers;

use PrepGenius\Services\DocumentParser;
use PrepGenius\Utils\Response;
use PrepGenius\Utils\Uuid;
use PrepGenius\Utils\Logger;

final class DocumentController
{
    public function __construct(
        private readonly DocumentParser $parser = new DocumentParser(),
    ) {}

    public function upload(array $data): void
    {
        $type = $data['type'] ?? '';

        if ($type === 'jd') {
            $type = 'job_description';
        }

        if (!in_array($type, ['cv', 'job_description'], true)) {
            Response::validationError(['type' => ['Type must be cv, jd, or job_description']]);
        }

        try {
            $filename = 'unknown';
            $parsed = null;

            if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                $content  = file_get_contents($_FILES['file']['tmp_name']);
                $mimeType = $_FILES['file']['type'];
                $filename = $_FILES['file']['name'];

                $parsed = $type === 'cv'
                    ? $this->parser->parseCV($content, $mimeType)
                    : $this->parser->parseJobDescription($content, true, $mimeType);
            } elseif (!empty($data['text'])) {
                if ($type === 'cv') {
                    Response::validationError(['file' => ['CV must be uploaded as a file']]);
                }
                $parsed = $this->parser->parseJobDescription($data['text']);
                $filename = 'text_input';
            } else {
                Response::validationError(['file' => ['File or text required']]);
            }

            $displayType = $type === 'job_description' ? 'Job description' : 'CV';

            Response::success([
                'document_id' => Uuid::generate(),
                'type'        => $type,
                'filename'    => $filename,
                'parsed_data' => $parsed,
            ], "{$displayType} parsed successfully");

        } catch (\Exception $e) {
            Logger::error('Document upload failed', ['error' => $e->getMessage()]);
            Response::serverError('Failed to parse document: ' . $e->getMessage());
        }
    }
}
