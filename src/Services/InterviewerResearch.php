<?php
/**
 * src/Services/InterviewerResearch.php
 * Web research on interviewers and persona generation
 */

namespace PrepGenius\Services;

use PrepGenius\ExternalAPIs\GeminiAPI;
use PrepGenius\Prompts\ResearchPrompts;
use PrepGenius\Utils\Json;
use PrepGenius\Utils\Logger;

final class InterviewerResearch
{
    private const CONTENT_FIELDS = ['name', 'gender', 'company', 'title', 'background'];
    private const MAX_RESEARCH_ATTEMPTS = 2;

    public function __construct(
        private readonly GeminiAPI $gemini = new GeminiAPI(),
    ) {}

    public function researchInterviewer(string $name, ?string $company = null, ?string $role = null): array
    {
        $inputName    = trim($name);
        $cleanCompany = $company ? trim($company) : '';
        $cleanRole    = $role ? trim($role) : '';

        $companyContext = $cleanCompany ? "at {$cleanCompany}" : '';
        if ($cleanRole) {
            $companyContext .= $companyContext ? " ({$cleanRole})" : "({$cleanRole})";
        }

        $companyLine = $cleanCompany ? "- Company: {$cleanCompany}" : '- Company: (not specified)';
        $roleLine    = $cleanRole ? "- Role: {$cleanRole}" : '- Role: (not specified)';

        $prompt  = ResearchPrompts::interviewerResearch($inputName, $companyContext, $companyLine, $roleLine);
        $profile = $this->researchWithRetry($prompt);

        $profile = $this->validateProfile($profile, $inputName, $cleanCompany, $cleanRole);
        $profile['_meta'] = ['researched_at' => date('c')];

        return $profile;
    }

    public function generateInterviewerPersona(array $profile, array $jdData, array $browserVoices = []): array
    {
        $voiceSection = $browserVoices !== []
            ? ResearchPrompts::voiceSelectionSection($browserVoices)
            : '';

        $prompt = ResearchPrompts::personaGeneration(
            Json::encode($profile),
            Json::encode($jdData),
            $voiceSection,
        );

        $response = $this->gemini->generateContent($prompt, 'flash', null, 'high');

        return GeminiAPI::extractJson($response);
    }

    /**
     * Attempt grounded search up to MAX_RESEARCH_ATTEMPTS times.
     * Retries when the API returns a response that yields no usable JSON
     * (e.g. thinking-only response, grounding timeout, malformed output).
     */
    private function researchWithRetry(string $prompt): array
    {
        for ($attempt = 1; $attempt <= self::MAX_RESEARCH_ATTEMPTS; $attempt++) {
            $response = $this->gemini->searchWithGrounding($prompt);
            $profile  = GeminiAPI::extractJson($response);

            $populatedCount = 0;
            foreach (self::CONTENT_FIELDS as $field) {
                if (!empty($profile[$field])) {
                    $populatedCount++;
                }
            }

            if ($populatedCount >= 3) {
                return $profile;
            }

            Logger::warning('Interviewer research attempt returned sparse data, retrying', [
                'attempt'         => $attempt,
                'populated_count' => $populatedCount,
            ]);
        }

        return $profile;
    }

    /**
     * Ensure the profile has the expected structure.
     * Infer "found" from actual data quality rather than relying solely on the AI flag.
     */
    private function validateProfile(array $profile, string $inputName, string $company, string $role): array
    {
        if (empty($profile['name'])) {
            $profile['name'] = $inputName;
        }

        $populatedCount = 0;
        foreach (self::CONTENT_FIELDS as $field) {
            if (!empty($profile[$field])) {
                $populatedCount++;
            }
        }

        if (isset($profile['found']) && $profile['found'] === false) {
            // AI explicitly said not found - trust it only if data is truly sparse
            if ($populatedCount >= 4) {
                $profile['found'] = true;
            }
        } elseif (!isset($profile['found'])) {
            // AI omitted the field - infer from data quality
            $profile['found'] = $populatedCount >= 3;
        }

        // Fill fallback values from user input so personas always have context
        if (empty($profile['company']) && $company !== '') {
            $profile['company'] = $company;
        }
        if (empty($profile['title']) && $role !== '') {
            $profile['title'] = $role;
        }

        return $profile;
    }
}