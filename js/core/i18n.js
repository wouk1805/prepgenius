/**
 * js/core/i18n.js
 * Internationalization (i18n)
 *
 * Translation dictionaries for English and French,
 * with a centralized translation API used by all modules.
 */

const i18n = {

    _language: 'en',

    /**
     * Set the active language.
     * @param {string} lang - Language code ('en' or 'fr')
     */
    setLanguage(lang) {
        this._language = (lang && this[lang]) ? lang : 'en';
    },

    /** @returns {string} The active language code */
    getLanguage() {
        return this._language;
    },

    /**
     * Translate a key, with optional parameter interpolation.
     * Falls back to English, then to the raw key.
     *
     * @param {string} key    - Translation key (e.g. 'btn.next')
     * @param {Object} params - Interpolation values (e.g. { count: 3 })
     * @returns {string}
     */
    t(key, params = {}) {
        const dict = this[this._language] || this.en;
        let text = dict[key] || this.en[key] || key;
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    },

    // =========================================================================
    // ENGLISH
    // =========================================================================
    en: {
        // Navigation
        'nav.home': 'Home',
        'nav.prepare': 'Prepare',
        'nav.interview': 'Interview',
        'nav.feedback': 'Feedback',

        // Hero Section
        'hero.badge': 'Powered by Google Gemini 3',
        'hero.title.part1': 'Master Your Interview with',
        'hero.title.part2': 'AI-Powered',
        'hero.title.part3': 'Preparation',
        'hero.subtitle': 'Upload your CV and job description. We\'ll research your interviewers, generate personalized questions, and conduct realistic mock interviews with voice and video analysis.',
        'hero.cta.start': 'Start Preparing',
        'hero.cta.learn': 'Learn More',
        'hero.card.title': 'Mock Interview',
        'hero.card.subtitle': 'AI-Powered Practice Session',
        'hero.stat.confidence': 'Confidence',
        'hero.stat.questions': 'Questions',
        'hero.stat.duration': 'Duration',

        // Features Section
        'features.title.part1': 'Everything You Need to',
        'features.title.part2': 'Succeed',
        'feature.cv.title': 'Smart CV Analysis',
        'feature.cv.desc': 'AI extracts your achievements, skills, and experiences to create personalized interview scenarios',
        'feature.research.title': 'Interviewer Research',
        'feature.research.desc': 'Web search powered by Google finds their background, interests, and likely questions',
        'feature.gap.title': 'Gap Analysis',
        'feature.gap.desc': 'Identify skill gaps with tailored strategies to address them during your interview',
        'feature.voice.title': 'Voice Interview',
        'feature.voice.desc': 'Practice speaking with real-time transcription and speech analytics',
        'feature.video.title': 'Video Analysis',
        'feature.video.desc': 'AI feedback on body language, eye contact, and confidence presentation',
        'feature.feedback.title': 'Detailed Feedback',
        'feature.feedback.desc': 'Comprehensive scores with actionable improvement tips and ideal answers',

        // Prepare Steps
        'prepare.step.cv': 'CV',
        'prepare.step.job': 'Job',
        'prepare.step.interviewers': 'Interviewers',
        'prepare.step.ready': 'Ready',

        // CV Upload
        'cv.title': 'Upload Your CV',
        'cv.subtitle': 'We\'ll analyze your experience, skills, and achievements',
        'cv.upload.text': 'Click or drag your CV here',
        'cv.upload.hint': 'Supports PDF, DOC, DOCX, TXT',

        // CV/JD Result Box
        'result.cv.analyzed': 'CV Analyzed',
        'result.jd.analyzed': 'JD Analyzed',
        'result.years': '{count} years',
        'result.year': '{count} year',
        'result.positions': '{count} positions',
        'result.position': '{count} position',
        'result.skills': '{count} skills',
        'result.skill': '{count} skill',
        'result.responsibilities': '{count} responsibilities',
        'result.responsibility': '{count} responsibility',

        // Job Description
        'jd.title': 'Job Description',
        'jd.subtitle': 'Upload a file or paste the job description text',
        'jd.tab.paste': 'Paste Text',
        'jd.tab.upload': 'Upload File',
        'jd.placeholder': 'Paste the job description here...',
        'jd.upload.text': 'Click or drag JD here',

        // Interviewers
        'interviewers.title': 'Interviewer Research',
        'interviewers.subtitle': 'Add interviewers to research their background and tailor questions',
        'interviewers.optional': 'Optional',
        'interviewers.label': 'Interviewer',
        'interviewers.name': 'Full Name (e.g., Demis Hassabis)',
        'interviewers.company': 'Company (e.g., Google DeepMind)',
        'interviewers.role': 'Role (optional)',
        'interviewers.add': 'Add Another Interviewer',
        'interviewers.max': 'Maximum 3 interviewers allowed',
        'interviewers.hint': 'Only add interviewers with a strong public profile (executives, speakers, published authors). If the person has little online presence, skip this step to avoid inaccurate personalization.',
        'interviewers.notfound': 'Could not verify {names} online. The interview will use AI-generated assumptions for their persona',

        // Ready
        'ready.title': 'You\'re Ready!',
        'ready.subtitle': 'Your interview preparation is complete',
        'ready.type.title': 'Interview Type',
        'ready.type.full': 'Full',
        'ready.type.behavioral': 'Behavioral',
        'ready.type.technical': 'Technical',
        'ready.type.quick': 'Quick',
        'ready.questions': 'questions',
        'ready.style.title': 'Question Style',
        'ready.style.concise': 'Concise - Short, direct questions',
        'ready.style.balanced': 'Balanced - Natural conversation',
        'ready.style.detailed': 'Detailed - Full context & scenarios',
        'ready.voice': 'Voice Mode',
        'ready.video': 'Video Analysis',
        'ready.tts.label': 'Voice Engine',
        'ready.tts.browser': '\uD83C\uDF10 Browser (fast, no limit)',
        'ready.tts.gemini': '\u2728 Gemini AI (natural, API quota)',

        // Interview
        'interview.stat.question': 'Question',
        'interview.stat.time': 'Time',
        'interview.mode.voice': 'Voice',
        'interview.mode.text': 'Text',
        'interview.record': 'Click to Speak',
        'interview.recording': 'Recording... Click to Stop',
        'interview.processing': 'Processing...',
        'interview.type': 'Type your response...',
        'interview.video.off': 'Camera Off',
        'interview.you': 'You',
        'interview.interviewer': 'Interviewer',
        'interview.skipped': 'Skipped',
        'feedback.loading': 'Analyzing your interview performance...',
        'feedback.loading.hint': 'This may take a moment',
        'feedback.score': 'Overall Score',
        'feedback.content': 'Content',
        'feedback.delivery': 'Delivery',
        'feedback.visual': 'Visual',
        'feedback.summary': 'Summary',
        'feedback.strengths': 'Strengths',
        'feedback.improvements': 'Areas for Improvement',
        'feedback.questions': 'Question-by-Question Feedback',
        'feedback.presence': 'Visual Presence',
        'feedback.speech': 'Speech Analysis',
        'feedback.nextsteps': 'Next Steps',
        'feedback.transcript': 'Full Transcript',

        // Buttons
        'btn.next': 'Next',
        'btn.back': 'Back',
        'btn.start': 'Start Interview',
        'btn.research': 'Research & Prepare',
        'btn.skip.step': 'Skip & Continue',
        'btn.send': 'Send',
        'btn.skip': 'Skip',
        'btn.end': 'End Interview',
        'btn.reset': 'Restart',
        'btn.practice': 'Practice Again',
        'btn.transcript': 'View Transcript',
        'btn.export': 'Export PDF',
        'btn.accept': 'Accept',
        'btn.decline': 'Decline',

        // Modals
        'modal.transcript': 'Interview Transcript',

        // Cookie Banner
        'cookie.text': 'This site uses cookies to enhance your experience.',

        // Errors & Messages
        'error.complete': 'Please complete an interview first to see feedback',
        'error.cv': 'Please upload your CV first',
        'error.jd': 'Please add a job description first',
        'error.end': 'Are you sure you want to end this interview?',
        'error.reset': 'Would you like to restart the interview?',
        'error.noaudio': 'No speech detected. Please try again and speak clearly',
        'error.tts': 'Voice synthesis temporarily unavailable. Showing text only',
        'error.tts.quota': 'Gemini API quota exceeded \u2014 switching to browser voice engine',
        'error.notfound': 'Interview not found',

        // Loading States
        'loading.cv': 'Analyzing your CV...',
        'loading.jd': 'Analyzing job description...',
        'loading.research': 'Researching interviewers...',
        'loading.preparing': 'Preparing interview...',
        'loading.starting': 'Starting interview...',
        'loading.transcribe': 'Transcribing...',
        'loading.processing': 'Processing...',

        // Match Analysis
        'match.score': 'Match Score',
        'match.based': 'Based on CV & JD analysis',
        'match.strengths': 'Strengths',
        'match.gaps': 'Gaps',
        'match.none': 'None identified',

        // Question Feedback
        'feedback.your': 'Your answer:',
        'feedback.ideal': 'Ideal:',
        'feedback.nodata': 'No question feedback available.',

        // Hero Chat Preview
        'hero.chat.q1': 'Tell me about a challenging project you led...',
        'hero.chat.a1': 'At my previous role, I spearheaded a team of 8 engineers...',
        'hero.chat.q2': 'How did you handle conflicts within the team?',

        // Misc
        'no.filler': 'No filler words detected!',
        'no.video': 'No video analysis. Enable video next time.',

        // Visual Analysis
        'visual.eye_contact': 'Eye Contact',
        'visual.confidence': 'Confidence',
        'visual.good': 'Good',
        'visual.needs_improvement': 'Needs Improvement',
        'visual.strengths_label': 'Strengths',
        'visual.improve_label': 'To improve',

        // Speech Analysis
        'speech.unit': 'WPM',
        'speech.pace_slow': 'Pace ({wpm} {unit}) is slow.',
        'speech.pace_fast': 'Pace ({wpm} {unit}) is fast.',
        'speech.pace_good': 'Good pace ({wpm} {unit}).',
        'speech.filler_many': 'Many filler words ({count}).',
        'speech.filler_few': 'Few filler words.',
        'speech.filler_title': 'Filler Words',
        'speech.no_data': 'No speech data.',

        // CTA (Share Page)
        'cta.heading': 'Want to practice yourself?',
        'cta.description': '{name} uses AI to give you real-time feedback on content, delivery, and visual presence.',
        'cta.button': 'Try {name}',

        // Share Feature
        'btn.share': 'Share',
        'share.title': 'Share Your Results',
        'share.description': 'Anyone with this link can view your interview feedback.',
        'share.creating': 'Creating share link...',
        'share.copied': 'Link copied to clipboard!',
        'share.error': 'Failed to create share link',
        'share.via': 'Share via',
        'share.copy': 'Copy',
        'share.linkedin': 'LinkedIn',
        'share.email': 'Email',
        'share.email.subject': 'Interview Feedback - {position}',
        'share.email.subject.default': 'My {name} Interview Feedback',
        'share.email.body': 'Hi,\n\nHere\'s my {name} interview feedback: {url}\n\nTry it: {projectUrl}',
        'share.header': 'Shared Feedback',
        'share.pageTitle': 'Interview Feedback - {position} | {appName}',
        'share.date': 'Shared on {date}',
        'share.error.title': 'Share Not Found',
        'share.error.message': 'This share link does not exist or has been removed.',
        'share.error.back': 'Go to PrepGenius',

        // History Feature
        'history.title': 'Recent Interviews',
        'history.empty': 'No interview history yet.',
        'history.view': 'View',
        'history.delete': 'Delete',
        'history.clear': 'Clear History',
        'history.clear.all': 'Clear All',
        'history.clear.confirm': 'Are you sure you want to clear all interview history?',
        'history.delete.confirm': 'Are you sure you want to delete this interview?',
        'history.deleted': 'Interview removed from history',
        'history.cleared': 'All interview history cleared',
        'history.date.today': 'Today at {time}',
        'history.date.yesterday': 'Yesterday',
        'history.date.daysago': '{days} days ago',
        'history.count': '{count} interview',
        'history.count.plural': '{count} interviews',

        // Footer
        'footer.website': 'Website',
        'footer.powered': 'Feedback powered by',
    },

    // =========================================================================
    // FRENCH
    // =========================================================================
    fr: {
        // Navigation
        'nav.home': 'Accueil',
        'nav.prepare': 'Pr\u00E9parer',
        'nav.interview': 'Entretien',
        'nav.feedback': 'Feedback',

        // Hero Section
        'hero.badge': 'Propuls\u00E9 par Google Gemini 3',
        'hero.title.part1': 'Ma\u00EEtrisez votre entretien avec une',
        'hero.title.part2': 'Pr\u00E9paration',
        'hero.title.part3': 'IA',
        'hero.subtitle': 'T\u00E9l\u00E9chargez votre CV et la description du poste. Nous rechercherons vos intervieweurs, g\u00E9n\u00E9rerons des questions personnalis\u00E9es et m\u00E8nerons des entretiens simul\u00E9s r\u00E9alistes.',
        'hero.cta.start': 'Commencer',
        'hero.cta.learn': 'En savoir plus',
        'hero.card.title': 'Entretien Simul\u00E9',
        'hero.card.subtitle': 'Session de pratique avec IA',
        'hero.stat.confidence': 'Confiance',
        'hero.stat.questions': 'Questions',
        'hero.stat.duration': 'Dur\u00E9e',

        // Features Section
        'features.title.part1': 'Tout ce dont vous avez besoin pour',
        'features.title.part2': 'R\u00E9ussir',
        'feature.cv.title': 'Analyse CV Intelligente',
        'feature.cv.desc': 'L\'IA extrait vos r\u00E9alisations, comp\u00E9tences et exp\u00E9riences pour cr\u00E9er des sc\u00E9narios personnalis\u00E9s',
        'feature.research.title': 'Recherche sur les Intervieweurs',
        'feature.research.desc': 'La recherche Google trouve leur parcours, leurs int\u00E9r\u00EAts et les questions probables',
        'feature.gap.title': 'Analyse des Lacunes',
        'feature.gap.desc': 'Identifiez les lacunes de comp\u00E9tences avec des strat\u00E9gies adapt\u00E9es',
        'feature.voice.title': 'Entretien Vocal',
        'feature.voice.desc': 'Pratiquez en parlant avec transcription en temps r\u00E9el',
        'feature.video.title': 'Analyse Vid\u00E9o',
        'feature.video.desc': 'Feedback IA sur le langage corporel et le contact visuel',
        'feature.feedback.title': 'Feedback D\u00E9taill\u00E9',
        'feature.feedback.desc': 'Scores complets avec conseils d\'am\u00E9lioration',

        // Prepare Steps
        'prepare.step.cv': 'CV',
        'prepare.step.job': 'Poste',
        'prepare.step.interviewers': 'Intervieweurs',
        'prepare.step.ready': 'Pr\u00EAt',

        // CV Upload
        'cv.title': 'T\u00E9l\u00E9chargez votre CV',
        'cv.subtitle': 'Nous analyserons votre exp\u00E9rience et vos comp\u00E9tences',
        'cv.upload.text': 'Cliquez ou d\u00E9posez votre CV ici',
        'cv.upload.hint': 'Formats accept\u00E9s : PDF, DOC, DOCX, TXT',

        // CV/JD Result Box
        'result.cv.analyzed': 'CV Analys\u00E9',
        'result.jd.analyzed': 'JD Analys\u00E9e',
        'result.years': '{count} ans',
        'result.year': '{count} an',
        'result.positions': '{count} postes',
        'result.position': '{count} poste',
        'result.skills': '{count} comp\u00E9tences',
        'result.skill': '{count} comp\u00E9tence',
        'result.responsibilities': '{count} responsabilit\u00E9s',
        'result.responsibility': '{count} responsabilit\u00E9',

        // Job Description
        'jd.title': 'Description du Poste',
        'jd.subtitle': 'T\u00E9l\u00E9chargez un fichier ou collez le texte',
        'jd.tab.paste': 'Coller le texte',
        'jd.tab.upload': 'T\u00E9l\u00E9charger',
        'jd.placeholder': 'Collez la description du poste ici...',
        'jd.upload.text': 'Cliquez ou d\u00E9posez ici',

        // Interviewers
        'interviewers.title': 'Recherche sur les Intervieweurs',
        'interviewers.subtitle': 'Ajoutez des intervieweurs pour personnaliser les questions',
        'interviewers.optional': 'Facultatif',
        'interviewers.label': 'Intervieweur',
        'interviewers.name': 'Nom complet (ex : Demis Hassabis)',
        'interviewers.company': 'Entreprise (ex : Google DeepMind)',
        'interviewers.role': 'R\u00F4le (optionnel)',
        'interviewers.add': 'Ajouter un autre intervieweur',
        'interviewers.max': 'Maximum 3 intervieweurs autoris\u00E9s',
        'interviewers.hint': 'N\'ajoutez que des intervieweurs ayant un profil public visible (dirigeants, conf\u00E9renciers, auteurs publi\u00E9s). Si la personne a peu de pr\u00E9sence en ligne, passez cette \u00E9tape pour \u00E9viter une personnalisation inexacte.',
        'interviewers.notfound': 'Impossible de v\u00E9rifier {names} en ligne. L\'entretien utilisera des hypoth\u00E8ses g\u00E9n\u00E9r\u00E9es par l\'IA pour leur profil',

        // Ready
        'ready.title': 'Vous \u00EAtes pr\u00EAt !',
        'ready.subtitle': 'Votre pr\u00E9paration est termin\u00E9e',
        'ready.type.title': 'Type d\'entretien',
        'ready.type.full': 'Complet',
        'ready.type.behavioral': 'Comportemental',
        'ready.type.technical': 'Technique',
        'ready.type.quick': 'Rapide',
        'ready.questions': 'questions',
        'ready.style.title': 'Style de questions',
        'ready.style.concise': 'Concis - Questions courtes et directes',
        'ready.style.balanced': '\u00C9quilibr\u00E9 - Conversation naturelle',
        'ready.style.detailed': 'D\u00E9taill\u00E9 - Contexte complet et sc\u00E9narios',
        'ready.voice': 'Mode vocal',
        'ready.video': 'Analyse vid\u00E9o',
        'ready.tts.label': 'Moteur vocal',
        'ready.tts.browser': '\uD83C\uDF10 Navigateur (rapide, illimit\u00E9)',
        'ready.tts.gemini': '\u2728 Gemini IA (naturel, quota API)',

        // Interview
        'interview.stat.question': 'Question',
        'interview.stat.time': 'Temps',
        'interview.mode.voice': 'Vocal',
        'interview.mode.text': 'Texte',
        'interview.record': 'Cliquez pour parler',
        'interview.recording': 'Enregistrement... Cliquez pour arr\u00EAter',
        'interview.processing': 'Traitement...',
        'interview.type': 'Tapez votre r\u00E9ponse...',
        'interview.video.off': 'Cam\u00E9ra d\u00E9sactiv\u00E9e',
        'interview.you': 'Vous',
        'interview.interviewer': 'Intervieweur',
        'interview.skipped': 'Pass\u00E9',
        'feedback.loading': 'Analyse de votre performance...',
        'feedback.loading.hint': 'Cela peut prendre un moment',
        'feedback.score': 'Score global',
        'feedback.content': 'Contenu',
        'feedback.delivery': 'Expression',
        'feedback.visual': 'Visuel',
        'feedback.summary': 'R\u00E9sum\u00E9',
        'feedback.strengths': 'Points forts',
        'feedback.improvements': 'Axes d\'am\u00E9lioration',
        'feedback.questions': 'Feedback par question',
        'feedback.presence': 'Pr\u00E9sence visuelle',
        'feedback.speech': 'Analyse vocale',
        'feedback.nextsteps': 'Prochaines \u00E9tapes',
        'feedback.transcript': 'Transcription compl\u00E8te',

        // Buttons
        'btn.next': 'Suivant',
        'btn.back': 'Retour',
        'btn.start': 'D\u00E9marrer l\'entretien',
        'btn.research': 'Rechercher & Pr\u00E9parer',
        'btn.skip.step': 'Passer & Continuer',
        'btn.send': 'Envoyer',
        'btn.skip': 'Passer',
        'btn.end': 'Terminer l\'entretien',
        'btn.reset': 'Recommencer',
        'btn.practice': 'S\'entra\u00EEner \u00E0 nouveau',
        'btn.transcript': 'Voir la transcription',
        'btn.export': 'Exporter PDF',
        'btn.accept': 'Accepter',
        'btn.decline': 'Refuser',

        // Modals
        'modal.transcript': 'Transcription de l\'entretien',

        // Cookie Banner
        'cookie.text': 'Ce site utilise des cookies pour am\u00E9liorer votre exp\u00E9rience.',

        // Errors & Messages
        'error.complete': 'Veuillez d\'abord terminer un entretien',
        'error.cv': 'Veuillez d\'abord t\u00E9l\u00E9charger votre CV',
        'error.jd': 'Veuillez d\'abord ajouter une description de poste',
        'error.end': '\u00CAtes-vous s\u00FBr de vouloir terminer cet entretien ?',
        'error.reset': 'Souhaitez-vous recommencer l\'entretien ?',
        'error.noaudio': 'Aucune parole d\u00E9tect\u00E9e. Veuillez r\u00E9essayer',
        'error.tts': 'Synth\u00E8se vocale temporairement indisponible. Affichage du texte uniquement',
        'error.tts.quota': 'Quota API Gemini \u00E9puis\u00E9 \u2014 passage au moteur vocal du navigateur',
        'error.notfound': 'Entretien introuvable',

        // Loading States
        'loading.cv': 'Analyse de votre CV...',
        'loading.jd': 'Analyse de la description du poste...',
        'loading.research': 'Recherche sur les intervieweurs...',
        'loading.preparing': 'Pr\u00E9paration de l\'entretien...',
        'loading.starting': 'D\u00E9marrage de l\'entretien...',
        'loading.transcribe': 'Transcription...',
        'loading.processing': 'Traitement...',

        // Match Analysis
        'match.score': 'Score de correspondance',
        'match.based': 'Bas\u00E9 sur l\'analyse CV & poste',
        'match.strengths': 'Points forts',
        'match.gaps': 'Lacunes',
        'match.none': 'Aucun identifi\u00E9',

        // Question Feedback
        'feedback.your': 'Votre r\u00E9ponse :',
        'feedback.ideal': 'Id\u00E9al :',
        'feedback.nodata': 'Aucun feedback par question disponible.',

        // Hero Chat Preview
        'hero.chat.q1': 'Parlez-moi d\'un projet difficile que vous avez dirig\u00E9...',
        'hero.chat.a1': 'Dans mon pr\u00E9c\u00E9dent poste, j\'ai dirig\u00E9 une \u00E9quipe de 8 ing\u00E9nieurs...',
        'hero.chat.q2': 'Comment avez-vous g\u00E9r\u00E9 les conflits au sein de l\'\u00E9quipe ?',

        // Misc
        'no.filler': 'Aucun mot de remplissage d\u00E9tect\u00E9 !',
        'no.video': 'Pas d\'analyse vid\u00E9o. Activez la vid\u00E9o la prochaine fois.',

        // Visual Analysis
        'visual.eye_contact': 'Contact visuel',
        'visual.confidence': 'Confiance',
        'visual.good': 'Bon',
        'visual.needs_improvement': '\u00C0 am\u00E9liorer',
        'visual.strengths_label': 'Points forts',
        'visual.improve_label': '\u00C0 am\u00E9liorer',

        // Speech Analysis
        'speech.unit': 'MPM',
        'speech.pace_slow': 'Rythme ({wpm} {unit}) lent.',
        'speech.pace_fast': 'Rythme ({wpm} {unit}) rapide.',
        'speech.pace_good': 'Bon rythme ({wpm} {unit}).',
        'speech.filler_many': 'Beaucoup de mots de remplissage ({count}).',
        'speech.filler_few': 'Peu de mots de remplissage.',
        'speech.filler_title': 'Mots de remplissage',
        'speech.no_data': 'Pas de donn\u00E9es vocales.',

        // CTA (Share Page)
        'cta.heading': 'Envie de vous entra\u00EEner ?',
        'cta.description': '{name} utilise l\'IA pour vous donner un feedback en temps r\u00E9el sur le contenu, l\'expression et la pr\u00E9sence visuelle.',
        'cta.button': 'Essayer {name}',

        // Share Feature
        'btn.share': 'Partager',
        'share.title': 'Partager vos r\u00E9sultats',
        'share.description': 'Toute personne avec ce lien peut voir votre feedback.',
        'share.creating': 'Cr\u00E9ation du lien de partage...',
        'share.copied': 'Lien copi\u00E9 !',
        'share.error': '\u00C9chec de la cr\u00E9ation du lien',
        'share.via': 'Partager via',
        'share.copy': 'Copier',
        'share.linkedin': 'LinkedIn',
        'share.email': 'Email',
        'share.email.subject': 'Feedback d\'entretien - {position}',
        'share.email.subject.default': 'Mon feedback d\'entretien {name}',
        'share.email.body': 'Bonjour,\n\nVoici mon feedback d\'entretien {name} : {url}\n\nEssayez : {projectUrl}',
        'share.header': 'Feedback partag\u00E9',
        'share.pageTitle': 'Feedback d\'entretien - {position} | {appName}',
        'share.date': 'Partag\u00E9 le {date}',
        'share.error.title': 'Partage introuvable',
        'share.error.message': 'Ce lien de partage n\'existe pas ou a \u00E9t\u00E9 supprim\u00E9.',
        'share.error.back': 'Aller \u00E0 PrepGenius',

        // History Feature
        'history.title': 'Entretiens r\u00E9cents',
        'history.empty': 'Aucun historique d\'entretien.',
        'history.view': 'Voir',
        'history.delete': 'Supprimer',
        'history.clear': 'Effacer l\'historique',
        'history.clear.all': 'Effacer tout',
        'history.clear.confirm': '\u00CAtes-vous s\u00FBr de vouloir effacer tout l\'historique ?',
        'history.delete.confirm': '\u00CAtes-vous s\u00FBr de vouloir supprimer cet entretien ?',
        'history.deleted': 'Entretien supprim\u00E9 de l\'historique',
        'history.cleared': 'Tout l\'historique a \u00E9t\u00E9 effac\u00E9',
        'history.date.today': 'Aujourd\'hui \u00E0 {time}',
        'history.date.yesterday': 'Hier',
        'history.date.daysago': 'Il y a {days} jours',
        'history.count': '{count} entretien',
        'history.count.plural': '{count} entretiens',

        // Footer
        'footer.website': 'Site web',
        'footer.powered': 'Feedback propuls\u00E9 par',
    }
};

Object.freeze(i18n.en);
Object.freeze(i18n.fr);