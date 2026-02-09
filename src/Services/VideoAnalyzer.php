<?php
/**
 * src/Services/VideoAnalyzer.php
 * Aggregation and scoring of video frame analysis data
 */

namespace PrepGenius\Services;

final class VideoAnalyzer
{
    /**
     * Aggregate per-frame analysis results into an overall visual assessment.
     */
    public function aggregate(array $frames): array
    {
        if ($frames === []) {
            return ['overall_visual_score' => 0];
        }

        $eyeScores        = [];
        $confidenceScores = [];
        $postures         = [];

        foreach ($frames as $frame) {
            if (isset($frame['eye_contact']['score'])) {
                $eyeScores[] = $frame['eye_contact']['score'];
            }
            if (isset($frame['confidence_score'])) {
                $confidenceScores[] = $frame['confidence_score'];
            }
            if (isset($frame['posture']['assessment'])) {
                $postures[] = $frame['posture']['assessment'];
            }
        }

        $avgEye        = self::average($eyeScores);
        $avgConfidence = self::average($confidenceScores);
        $postureRating = self::assessPosture($postures);

        return [
            'frame_count'           => count($frames),
            'eye_contact'           => ['average_score' => $avgEye],
            'posture_analysis'      => ['overall' => $postureRating],
            'confidence_trajectory' => ['overall_score' => $avgConfidence],
            'overall_visual_score'  => (int) round(($avgEye + $avgConfidence) / 2),
            'strengths'             => self::buildStrengths($avgEye, $avgConfidence, $postureRating),
            'areas_for_improvement' => self::buildImprovements($avgEye, $avgConfidence, $postureRating, $postures),
        ];
    }

    private static function average(array $values): int
    {
        return $values !== [] ? (int) round(array_sum($values) / count($values)) : 0;
    }

    private static function assessPosture(array $postures): string
    {
        if ($postures === []) {
            return 'no_data';
        }
        $goodCount = count(array_filter($postures, static fn(string $p): bool => $p === 'good'));
        return $goodCount >= count($postures) / 2 ? 'good' : 'needs_improvement';
    }

    private static function buildStrengths(int $avgEye, int $avgConfidence, string $posture): array
    {
        $strengths = ['en' => [], 'fr' => []];

        if ($avgEye >= 70) {
            $strengths['en'][] = 'Good eye contact';
            $strengths['fr'][] = 'Bon contact visuel';
        }
        if ($avgConfidence >= 70) {
            $strengths['en'][] = 'Confident presence';
            $strengths['fr'][] = 'Présence confiante';
        }
        if ($posture === 'good') {
            $strengths['en'][] = 'Good posture';
            $strengths['fr'][] = 'Bonne posture';
        }

        return $strengths;
    }

    private static function buildImprovements(int $avgEye, int $avgConfidence, string $posture, array $postures): array
    {
        $improvements = ['en' => [], 'fr' => []];

        if ($avgEye > 0 && $avgEye < 70) {
            $improvements['en'][] = 'Look at the camera more often';
            $improvements['fr'][] = 'Regardez la caméra plus souvent';
        }
        if ($avgConfidence > 0 && $avgConfidence < 70) {
            $improvements['en'][] = 'Work on appearing more confident';
            $improvements['fr'][] = 'Travaillez sur votre confiance';
        }
        if ($postures !== [] && $posture !== 'good') {
            $improvements['en'][] = 'Sit up straighter';
            $improvements['fr'][] = 'Tenez-vous plus droit';
        }

        return $improvements;
    }
}
