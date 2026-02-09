<?php
/**
 * src/Prompts/VideoPrompts.php
 * Prompt templates for video frame and body language analysis
 */

namespace PrepGenius\Prompts;

final class VideoPrompts
{
    public static function frameAnalysis(): string
    {
        return <<<'PROMPT'
Analyze this video frame of a job interview candidate. Return JSON:
{
    "eye_contact": {"score": 0-100, "looking_at_camera": true/false},
    "facial_expression": {"primary": "neutral/smiling/confident/nervous", "appropriate": true/false},
    "posture": {"assessment": "good/needs_improvement", "notes": ""},
    "confidence_score": 0-100,
    "suggestions": []
}
Return ONLY valid JSON.
PROMPT;
    }
}