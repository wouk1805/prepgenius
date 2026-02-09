<?php
/**
 * src/Prompts/ResearchPrompts.php
 * Prompt templates for interviewer research and persona generation
 */

namespace PrepGenius\Prompts;

use PrepGenius\Utils\Json;

final class ResearchPrompts
{
    public static function interviewerResearch(string $inputName, string $companyContext, string $companyLine, string $roleLine): string
    {
        return <<<PROMPT
Search for information about this person for interview preparation.

IMPORTANT INSTRUCTIONS:
1. The user provided the name "{$inputName}" {$companyContext}
2. Search for this person using web search tools
3. If the name appears to have typos or is incomplete, try to find the correct match
4. Return the CORRECT full name as found in your search results

Person to research:
- Input name: {$inputName}
{$companyLine}
{$roleLine}

Return JSON:
{
    "name": "The person's CORRECT full name as found in search results",
    "first_name": "The given/first name used in professional settings (e.g. for 'Sir Demis Hassabis' use 'Demis', for 'Dr. Jane Smith' use 'Jane'). NOT a title or honorific.",
    "found": true/false,
    "gender": "male or female - infer from first name or search results",
    "company": "Current company or most well-known company affiliation",
    "title": "Current professional title/role (e.g. 'CEO', 'VP of Engineering')",
    "background": "2-3 sentence professional background",
    "expertise": ["area1", "area2"],
    "notable": "Any notable achievements or publications"
}

If person not found, set found=false and fill fields with reasonable assumptions based on {$companyLine} and {$roleLine}.
Return ONLY valid JSON.
PROMPT;
    }

    public static function personaGeneration(string $profileJson, string $jdJson, string $voiceSection): string
    {
        return <<<PROMPT
Create an interviewer persona based on this profile and job description.

INTERVIEWER PROFILE: {$profileJson}
JOB DESCRIPTION: {$jdJson}
{$voiceSection}
Return JSON:
{
    "persona": {
        "name": "Interviewer name",
        "gender": "male or female - infer from the interviewer profile's name and background",
        "style": "formal/casual/technical/behavioral",
        "browser_voice": "exact voice name from the available list or null",
        "focus_areas": ["area1", "area2"],
        "opening_statement": {
            "en": "A brief, natural greeting in English (1-2 sentences) setting the tone and style - this will be used as inspiration for the AI-generated opening, which will add the first interview question",
            "fr": "A brief, natural greeting in French (1-2 sentences) setting the tone and style - this will be used as inspiration for the AI-generated opening, which will add the first interview question"
        }
    },
    "questions": ["q1", "q2", "q3", "q4", "q5", "q6"]
}

IMPORTANT:
- Generate 6 diverse interview questions mixing technical, behavioral, and situational types
- The opening_statement is a greeting/tone hint only (no interview question needed) - the actual first question will be generated separately
- The opening_statement must be provided in BOTH English and French
- Return ONLY valid JSON
PROMPT;
    }

    public static function voiceSelectionSection(array $browserVoices): string
    {
        $voiceListJson = Json::encode($browserVoices);

        return <<<VOICE

AVAILABLE BROWSER VOICES: {$voiceListJson}

Pick the single best voice from this list that matches the interviewer's likely gender, language, and tone.
Consider: gender match (most important), language/locale match, voice quality (prefer local voices).
Add to the persona object: "browser_voice": "exact voice name from the list"
If no good match exists, set "browser_voice": null
VOICE;
    }
}