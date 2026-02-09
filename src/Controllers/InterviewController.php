<?php
/**
 * src/Controllers/InterviewController.php
 * Prepares, starts, and manages interview conversation flow
 */

namespace PrepGenius\Controllers;

use PrepGenius\Services\DocumentParser;
use PrepGenius\Services\InterviewEngine;
use PrepGenius\Services\InterviewerResearch;
use PrepGenius\Utils\Response;
use PrepGenius\Utils\Uuid;
use PrepGenius\Utils\Logger;
use PrepGenius\Utils\TextUtils;
use PrepGenius\Utils\Json;

final class InterviewController
{
    public function __construct(
        private readonly InterviewEngine $engine = new InterviewEngine(),
        private readonly InterviewerResearch $research = new InterviewerResearch(),
    ) {}

    public function prepare(array $data): void
    {
        try {
            $cvAnalysis = Json::parseField($data['cv_data'] ?? null);
            $jdAnalysis = Json::parseField($data['jd_data'] ?? null);

            $matchAnalysis = null;
            if ($cvAnalysis && $jdAnalysis) {
                $matchAnalysis = (new DocumentParser())->analyzeMatch($cvAnalysis, $jdAnalysis);
            }

            [$profiles, $personas] = $this->researchInterviewers($data, $jdAnalysis);

            Response::success([
                'preparation_id' => Uuid::generate(),
                'results' => [
                    'cv_analysis'          => $cvAnalysis,
                    'jd_analysis'          => $jdAnalysis,
                    'match_analysis'       => $matchAnalysis,
                    'interviewer_profiles' => $profiles,
                    'interviewer_personas' => $personas,
                ],
            ], 'Interview preparation completed');
        } catch (\Exception $e) {
            Logger::error('Prepare failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            Response::serverError('Failed to prepare interview: ' . $e->getMessage());
        }
    }

    public function start(array $data): void
    {
        try {
            $cvData        = Json::parseField($data['cv_data'] ?? null);
            $jdData        = Json::parseField($data['jd_data'] ?? null);
            $persona       = Json::parseField($data['interviewer_persona'] ?? null);
            $language      = $data['language'] ?? 'en';
            $questionStyle = $data['question_style'] ?? 'balanced';
            $interviewType = $data['interview_type'] ?? 'full';

            $opening = $this->engine->generateOpeningMessage($cvData, $jdData, $persona, $questionStyle, $language, $interviewType);

            Response::success([
                'interviewer_message' => $opening,
                'interviewer_name'    => self::resolveInterviewerName($persona),
                'questions_asked'     => 0,
                'is_complete'         => false,
            ], 'Interview started');
        } catch (\Exception $e) {
            Logger::error('Start interview failed', ['error' => $e->getMessage()]);
            Response::serverError('Failed to start interview: ' . $e->getMessage());
        }
    }

    public function respond(array $data): void
    {
        try {
            $cvData              = Json::parseField($data['cv_data'] ?? null);
            $jdData              = Json::parseField($data['jd_data'] ?? null);
            $persona             = Json::parseField($data['interviewer_persona'] ?? null);
            $conversationHistory = Json::parseField($data['conversation_history'] ?? []);
            $candidateResponse   = $data['candidate_response'] ?? '';
            $questionsAsked      = (int) ($data['questions_asked'] ?? 0);
            $targetQuestions     = (int) ($data['target_questions'] ?? 10);
            $questionStyle       = $data['question_style'] ?? 'balanced';
            $language            = $data['language'] ?? 'en';
            $interviewType       = $data['interview_type'] ?? 'full';

            if ($candidateResponse === '') {
                Response::validationError(['candidate_response' => ['Response is required']]);
            }

            $result = $this->engine->generateNextQuestion(
                $cvData, $jdData, $persona, $conversationHistory,
                $candidateResponse, $questionsAsked, $targetQuestions,
                $questionStyle, $language, $interviewType,
            );

            $newQuestionsAsked = $questionsAsked + 1;

            Response::success([
                'interviewer_message' => $result['message'],
                'interviewer_name'    => self::resolveInterviewerName($persona),
                'questions_asked'     => $newQuestionsAsked,
                'is_complete'         => $newQuestionsAsked >= $targetQuestions,
            ], 'Response processed');
        } catch (\Exception $e) {
            Logger::error('Respond failed', ['error' => $e->getMessage()]);
            Response::serverError('Failed to process response: ' . $e->getMessage());
        }
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private static function resolveInterviewerName(?array $persona): string
    {
        if ($persona && isset($persona['persona']['name'])) {
            return TextUtils::formatName($persona['persona']['name']);
        }
        return 'Interviewer';
    }

    /**
     * Research each interviewer and build their persona.
     *
     * @return array{0: list<array>, 1: list<array>}  [profiles, personas]
     */
    private function researchInterviewers(array $data, ?array $jdAnalysis): array
    {
        $interviewers  = Json::parseField($data['interviewers'] ?? null) ?? [];
        $browserVoices = Json::parseField($data['browser_voices'] ?? '[]') ?? [];

        $profiles = [];
        $personas = [];

        foreach ($interviewers as $interviewer) {
            $inputName = trim($interviewer['name'] ?? '');
            $company   = trim($interviewer['company'] ?? '');
            $role      = isset($interviewer['role']) ? trim($interviewer['role']) : null;

            if ($inputName === '') {
                continue;
            }

            Logger::info('Researching interviewer', [
                'input_name' => $inputName,
                'company'    => $company ?: '(not provided)',
            ]);

            $profile = $this->research->researchInterviewer($inputName, $company, $role);
            $profile['input_name'] = $inputName;
            $profiles[] = $profile;

            if ($jdAnalysis) {
                $persona = $this->research->generateInterviewerPersona($profile, $jdAnalysis, $browserVoices);
                $persona['persona'] = array_merge($persona['persona'] ?? [], [
                    'name'       => $profile['name'],
                    'first_name' => $profile['first_name'] ?? null,
                    'input_name' => $inputName,
                    'company'    => $profile['company'] ?? $company ?: '',
                    'role'       => $profile['title'] ?? $role ?: '',
                ]);
                $personas[] = $persona;
            }
        }

        return [$profiles, $personas];
    }
}