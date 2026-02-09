<?php
/**
 * src/Services/DeliveryAnalyzer.php
 * Speech delivery metrics: pace scoring and filler word analysis
 */

namespace PrepGenius\Services;

final class DeliveryAnalyzer
{
    public function analyze(array $metrics): array
    {
        $wpm     = $metrics['pace_wpm'] ?? 0;
        $fillers = $metrics['filler_words']['total_count'] ?? 0;
        $words   = max($metrics['word_count'] ?? 1, 1);

        $fillerPercent = ($fillers / $words) * 100;

        [$paceScore, $paceAssessment] = self::assessPace($wpm);
        $fillerScore = self::scoreFillerUsage($fillerPercent);

        return [
            'pace'          => ['wpm' => $wpm, 'score' => $paceScore, 'assessment' => $paceAssessment],
            'filler_words'  => ['count' => $fillers, 'percentage' => round($fillerPercent, 2), 'score' => $fillerScore],
            'overall_score' => (int) round(($paceScore + $fillerScore) / 2),
        ];
    }

    /** @return array{0: int, 1: string} */
    private static function assessPace(int $wpm): array
    {
        return match (true) {
            $wpm >= 130 && $wpm <= 150 => [100, 'Excellent'],
            $wpm >= 120 && $wpm <= 160 => [85, 'Good'],
            $wpm >= 100 && $wpm <= 180 => [70, $wpm < 120 ? 'Slightly slow' : 'Slightly fast'],
            $wpm > 0                   => [50, $wpm < 100 ? 'Too slow' : 'Too fast'],
            default                    => [0, 'No data'],
        };
    }

    private static function scoreFillerUsage(float $percent): int
    {
        return match (true) {
            $percent < 1 => 100,
            $percent < 2 => 85,
            $percent < 4 => 70,
            $percent < 6 => 55,
            default      => 40,
        };
    }
}
