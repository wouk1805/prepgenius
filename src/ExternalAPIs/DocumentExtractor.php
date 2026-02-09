<?php
/**
 * src/ExternalAPIs/DocumentExtractor.php
 * Text extraction from binary document formats (DOCX, DOC)
 */

namespace PrepGenius\ExternalAPIs;

use PrepGenius\Utils\Logger;

final class DocumentExtractor
{
    public static function extractTextFromDocx(string $content): string
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'docx_');
        file_put_contents($tempFile, $content);

        try {
            $text = self::parseDocxXml($tempFile);

            if ($text === '') {
                $text = self::parseDocxFallback($tempFile);
            }

            return trim($text);
        } finally {
            @unlink($tempFile);
        }
    }

    public static function extractTextFromDoc(string $content): string
    {
        $text = '';

        if (preg_match_all('/[\x20-\x7E]{20,}/', $content, $matches)) {
            $text = implode("\n", $matches[0]);
        }

        $text = preg_replace('/[^\x20-\x7E\n]/', '', $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        return trim($text);
    }

    private static function parseDocxXml(string $filePath): string
    {
        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            return '';
        }

        try {
            $xmlContent = $zip->getFromName('word/document.xml');
            if ($xmlContent === false) {
                return '';
            }

            $xml = simplexml_load_string($xmlContent, 'SimpleXMLElement', LIBXML_NOERROR);
            if ($xml === false) {
                return '';
            }

            $ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
            $xml->registerXPathNamespace('w', $ns);
            $paragraphs = $xml->xpath('//w:p');

            $textParts = [];
            foreach ($paragraphs as $paragraph) {
                $paragraph->registerXPathNamespace('w', $ns);
                $texts = $paragraph->xpath('.//w:t');

                $paragraphText = '';
                foreach ($texts as $t) {
                    $paragraphText .= (string) $t;
                }

                if (trim($paragraphText) !== '') {
                    $textParts[] = trim($paragraphText);
                }
            }

            return implode("\n\n", $textParts);
        } catch (\Exception $e) {
            Logger::warning('DOCX extraction failed', ['error' => $e->getMessage()]);
            return '';
        } finally {
            $zip->close();
        }
    }

    private static function parseDocxFallback(string $filePath): string
    {
        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            return '';
        }

        try {
            $xmlContent = $zip->getFromName('word/document.xml');
            if ($xmlContent === false) {
                return '';
            }

            $text = strip_tags(str_replace('<', ' <', $xmlContent));
            return preg_replace('/\s+/', ' ', $text);
        } finally {
            $zip->close();
        }
    }
}
