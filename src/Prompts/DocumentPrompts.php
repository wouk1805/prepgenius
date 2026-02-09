<?php
/**
 * src/Prompts/DocumentPrompts.php
 * Prompt templates for CV/JD parsing and match analysis
 */

namespace PrepGenius\Prompts;

final class DocumentPrompts
{
    public static function cvParsing(): string
    {
        return <<<'PROMPT'
Analyze this CV/Resume. Return JSON:
{
    "display_title": {"en": "Candidate Name - Current Title", "fr": "Nom du candidat - Titre actuel"},
    "personal_info": {"name": "", "title": "", "email": "", "location": ""},
    "summary": "2-3 sentence summary",
    "experience": [{"company": "", "title": "", "start_date": "", "end_date": "", "achievements": []}],
    "education": [{"institution": "", "degree": "", "field": "", "year": ""}],
    "skills": {"technical": [], "soft": [], "languages": []},
    "key_achievements": [],
    "total_experience_years": 0,
    "industries": [],
    "career_trajectory": ""
}
"display_title" must be a SHORT bilingual label: candidate name + current/latest job title.
Return ONLY valid JSON.
PROMPT;
    }

    public static function jobDescriptionParsing(): string
    {
        return <<<'PROMPT'
Analyze this Job Description. Return JSON:
{
    "display_title": {"en": "Job Title - Company", "fr": "Titre du poste - Entreprise"},
    "job_info": {"title": "", "company": "", "location": "", "type": ""},
    "company_info": {"name": "", "industry": "", "culture_keywords": []},
    "requirements": {"must_have": [], "nice_to_have": [], "experience_years": ""},
    "responsibilities": [],
    "technical_skills": [],
    "soft_skills": [],
    "key_keywords": []
}
"display_title" must be a SHORT bilingual label: job title + company name (e.g. {"en": "Senior Engineer - Google", "fr": "Ingénieur Senior - Google"}).
Return ONLY valid JSON.
PROMPT;
    }

    public static function matchAnalysis(string $cvJson, string $jdJson): string
    {
        return <<<PROMPT
Analyze match between candidate and job.
Generate ALL text content in BOTH English AND French.

CANDIDATE: {$cvJson}
JOB: {$jdJson}

Return JSON with this EXACT structure:
{
    "match_score": 0-100,
    "en": {
        "strengths": [{"area": "Area name", "evidence": "Concrete proof from the CV that supports this strength"}],
        "gaps": [{"area": "Gap name", "mitigation_strategy": "Actionable advice on how the candidate can address or compensate for this gap during the interview"}]
    },
    "fr": {
        "strengths": [{"area": "Nom du domaine", "evidence": "Preuve concrète du CV qui démontre ce point fort"}],
        "gaps": [{"area": "Nom du domaine", "mitigation_strategy": "Conseil actionnable sur la façon dont le candidat peut combler ou compenser cette lacune en entretien"}]
    }
}

IMPORTANT:
- "match_score" is shared (language-independent number)
- "en" and "fr" must contain the SAME analysis but in their respective languages
- "strengths" and "gaps" arrays must have the same length in both languages
- For strengths, "evidence" = factual proof from the CV
- For gaps, "mitigation_strategy" = practical interview advice (NOT evidence). Example: "Emphasize your platform work as analogous large-scale cloud architecture experience"
- Return ONLY valid JSON
PROMPT;
    }
}