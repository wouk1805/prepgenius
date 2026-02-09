/**
 * js/features/feedback-renderer.js
 * Feedback Renderer Module
 *
 * Pure rendering functions for feedback display - shared between main app and share page
 */

const FeedbackRenderer = {
    callbacks: {},
    currentQuestionIndex: 0,
    questionFeedback: [],

    render(container, data, options = {}) {
        const {
            readOnly = false, showActions = true, showShareButton = true, showCTA = false,
            onQuestionChange = null, onPracticeAgain = null,
            onViewTranscript = null, onExportPDF = null, onShare = null
        } = options;

        this.callbacks = { onQuestionChange, onPracticeAgain, onViewTranscript, onExportPDF, onShare };
        this.currentQuestionIndex = 0;
        this.questionFeedback = data.feedback?.question_feedback || [];

        const fb = data.feedback || {};
        const scores = fb.scores || {};

        container.innerHTML = `
            ${this.renderScoreCard(scores)}
            ${this.renderSummaryCard(fb.summary)}
            ${this.renderStrengthsCard(fb.strengths)}
            ${this.renderImprovementsCard(fb.improvements)}
            ${this.renderQuestionFeedbackCard(fb.question_feedback)}
            ${this.renderVisualAnalysisCard(fb.visual_analysis)}
            ${this.renderSpeechAnalysisCard(data.speechMetrics)}
            ${this.renderNextStepsCard(fb.next_steps)}
            ${readOnly ? this.renderTranscriptCard(data.transcript) : this.renderPrintTranscript(data.transcript)}
            ${showActions && !readOnly ? this.renderActionsCard(showShareButton) : ''}
            ${showCTA ? this.renderCTACard() : ''}
        `;

        this.initScoreAnimations(container);
        this.initQuestionNav(container);
        if (!readOnly) this.initActionButtons(container);
    },

    // =========================================================================
    // CARD RENDERERS
    // =========================================================================

    renderScoreCard(scores) {
        const overall = scores.overall || 0;
        const radius = 52;
        const circumference = 2 * Math.PI * radius;

        return `
            <div class="score-card glass-card">
                <div class="overall-score">
                    <div class="score-circle" data-score="${overall}" data-circumference="${circumference}">
                        <svg viewBox="0 0 120 120">
                            <defs>
                                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stop-color="var(--primary)" />
                                    <stop offset="100%" stop-color="var(--accent, var(--primary-light))" />
                                </linearGradient>
                            </defs>
                            <circle class="score-bg" cx="60" cy="60" r="${radius}" />
                            <circle class="score-fill" cx="60" cy="60" r="${radius}"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${circumference}" />
                        </svg>
                        <div class="score-inner">
                            <span class="score-value-display">0</span>
                        </div>
                    </div>
                    <span class="score-label">${i18n.t('feedback.score')}</span>
                </div>
                <div class="score-bars">
                    ${['content', 'delivery', 'visual'].map(k => `
                        <div class="bar-item">
                            <span>${i18n.t('feedback.' + k)}</span>
                            <div class="bar">
                                <div class="bar-fill" data-key="${k}" data-score="${scores[k] || 0}"></div>
                            </div>
                            <span class="bar-score" data-key="${k}">0</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderSummaryCard(summary) {
        return `
            <div class="feedback-card glass-card">
                <h3>\u{1F4DD} ${i18n.t('feedback.summary')}</h3>
                <p>${Utils.sanitizeHtml(summary || '')}</p>
            </div>
        `;
    },

    renderStrengthsCard(strengths) {
        const items = (strengths || []).map(s => `<li>${Utils.sanitizeHtml(s)}</li>`).join('');
        return `
            <div class="feedback-card glass-card">
                <h3>\u{1F4AA} ${i18n.t('feedback.strengths')}</h3>
                <ul>${items || `<li class="no-data">${i18n.t('feedback.nodata')}</li>`}</ul>
            </div>
        `;
    },

    renderImprovementsCard(improvements) {
        const items = (improvements || []).map(i => `
            <div class="improvement-item" style="border-color:${this.getPriorityColor(i.priority)}">
                <strong>${Utils.sanitizeHtml(i.area)}</strong>
                <span>${Utils.sanitizeHtml(i.suggestion)}</span>
            </div>
        `).join('');
        return `
            <div class="feedback-card glass-card">
                <h3>\u{1F4C8} ${i18n.t('feedback.improvements')}</h3>
                <div>${items || `<p class="no-data">${i18n.t('feedback.nodata')}</p>`}</div>
            </div>
        `;
    },

    renderQuestionFeedbackCard(questions) {
        const qfb = questions || [];
        if (!qfb.length) {
            return `
                <div class="feedback-card glass-card">
                    <h3>\u{1F4A1} ${i18n.t('feedback.questions')}</h3>
                    <p class="no-data">${i18n.t('feedback.nodata')}</p>
                </div>
            `;
        }

        const skippedLabel = i18n.t('interview.skipped');

        const slides = qfb.map((q, i) => {
            const sc = q.score || 0;
            const cls = sc >= 70 ? 'good' : sc >= 50 ? 'fair' : 'poor';
            const isSkipped = q.your_answer === '[SKIPPED]';
            const answerHtml = q.your_answer
                ? `<div class="your-answer"><strong>${i18n.t('feedback.your')}</strong> ${isSkipped ? `<em>\u23ED ${skippedLabel}</em>` : Utils.escapeHtml(q.your_answer)}</div>`
                : '';
            return `
                <div class="question-feedback-slide${i === 0 ? ' active' : ''}" data-index="${i}">
                    <div class="question-feedback-item">
                        <div class="question">Q${i + 1}: ${Utils.escapeHtml(q.question || '')}<span class="score-badge ${cls}">${sc}%</span></div>
                        ${answerHtml}
                        ${q.ideal_answer ? `<div class="ideal-answer"><strong>\u{1F4A1} ${i18n.t('feedback.ideal')}</strong> ${Utils.sanitizeHtml(q.ideal_answer)}</div>` : ''}
                        ${q.feedback ? `<div class="question-feedback-text">${Utils.sanitizeHtml(q.feedback)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const dots = qfb.map((_, i) =>
            `<span class="question-dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`
        ).join('');

        return `
            <div class="feedback-card glass-card">
                <div class="question-feedback-header">
                    <h3>\u{1F4A1} ${i18n.t('feedback.questions')}</h3>
                    <div class="question-nav-buttons">
                        <button class="question-nav-btn" data-dir="prev" disabled>\u2190</button>
                        <span class="question-counter">1 / ${qfb.length}</span>
                        <button class="question-nav-btn" data-dir="next" ${qfb.length <= 1 ? 'disabled' : ''}>\u2192</button>
                    </div>
                </div>
                <div class="question-feedback-carousel">
                    <div class="question-slides">${slides}</div>
                    <div class="question-dots">${dots}</div>
                </div>
            </div>
        `;
    },

    renderVisualAnalysisCard(va) {
        if (!va || !Object.keys(va).length) {
            return `
                <div class="feedback-card glass-card">
                    <h3>\u{1F4F9} ${i18n.t('feedback.presence')}</h3>
                    <p class="no-data">${i18n.t('no.video')}</p>
                </div>
            `;
        }

        let metricsHtml = '<div class="visual-metrics">';

        if (va.eye_contact) {
            const score = va.eye_contact.average_score || 0;
            metricsHtml += `
                <div class="visual-metric">
                    <span class="metric-label">\u{1F441}\uFE0F ${i18n.t('visual.eye_contact')}</span>
                    <span class="metric-value ${score >= 60 ? 'good' : 'needs-improvement'}">${score}%</span>
                </div>
            `;
        }

        if (va.posture_analysis) {
            const isGood = va.posture_analysis.overall === 'good';
            const label = isGood ? i18n.t('visual.good') : i18n.t('visual.needs_improvement');
            metricsHtml += `
                <div class="visual-metric">
                    <span class="metric-label">\u{1F9D8} Posture</span>
                    <span class="metric-value ${isGood ? 'good' : 'needs-improvement'}">${label}</span>
                </div>
            `;
        }

        if (va.confidence_trajectory) {
            const score = va.confidence_trajectory.overall_score || 0;
            metricsHtml += `
                <div class="visual-metric">
                    <span class="metric-label">\u{1F4AA} ${i18n.t('visual.confidence')}</span>
                    <span class="metric-value ${score >= 60 ? 'good' : 'needs-improvement'}">${score}%</span>
                </div>
            `;
        }
        metricsHtml += '</div>';

        const lang = i18n.getLanguage();
        const strengths = Array.isArray(va.strengths) ? va.strengths : (va.strengths?.[lang] || va.strengths?.en || []);
        const improvements = Array.isArray(va.areas_for_improvement) ? va.areas_for_improvement : (va.areas_for_improvement?.[lang] || va.areas_for_improvement?.en || []);

        if (strengths.length || improvements.length) {
            metricsHtml += '<div class="visual-feedback-notes">';
            if (strengths.length) {
                metricsHtml += `<p class="visual-strengths"><strong>${i18n.t('visual.strengths_label')}:</strong> ${strengths.join(', ')}</p>`;
            }
            if (improvements.length) {
                metricsHtml += `<p class="visual-improvements"><strong>${i18n.t('visual.improve_label')}:</strong> ${improvements.join(', ')}</p>`;
            }
            metricsHtml += '</div>';
        }

        return `
            <div class="feedback-card glass-card">
                <h3>\u{1F4F9} ${i18n.t('feedback.presence')}</h3>
                ${metricsHtml}
            </div>
        `;
    },

    renderSpeechAnalysisCard(sm) {
        sm = sm || {};
        const f = sm.filler_words || { total_count: 0, breakdown: {} };

        let summary = '';
        if (sm.pace_wpm > 0) {
            const params = { wpm: sm.pace_wpm, unit: i18n.t('speech.unit') };
            if (sm.pace_wpm < 100) {
                summary += i18n.t('speech.pace_slow', params) + ' ';
            } else if (sm.pace_wpm > 160) {
                summary += i18n.t('speech.pace_fast', params) + ' ';
            } else {
                summary += i18n.t('speech.pace_good', params) + ' ';
            }
        }

        if (f.total_count > 0) {
            const ratio = f.total_count / Math.max(1, sm.word_count) * 100;
            summary += ratio > 5
                ? i18n.t('speech.filler_many', { count: f.total_count }) + ' '
                : i18n.t('speech.filler_few') + ' ';
        }

        const keys = Object.keys(f.breakdown || {});
        let fillerHtml = '';
        if (keys.length) {
            fillerHtml = `<h4>\u{1F5E3}\uFE0F ${i18n.t('speech.filler_title')}</h4>` +
                keys.sort((a, b) => f.breakdown[b] - f.breakdown[a])
                    .map(w => `<div class="filler-word-item"><span class="word">"${Utils.escapeHtml(w)}"</span><span class="count">${f.breakdown[w]}\u00D7</span></div>`)
                    .join('');
        } else {
            fillerHtml = `<p class="no-filler-success">\u2705 ${i18n.t('no.filler')}</p>`;
        }

        return `
            <div class="feedback-card glass-card">
                <h3>\u{1F5E3}\uFE0F ${i18n.t('feedback.speech')}</h3>
                <p>${summary || i18n.t('speech.no_data')}</p>
                <div class="filler-words-section">${fillerHtml}</div>
            </div>
        `;
    },

    renderNextStepsCard(steps) {
        const items = (steps || []).map(s => `<li>${Utils.sanitizeHtml(s)}</li>`).join('');
        return `
            <div class="feedback-card glass-card">
                <h3>\u{1F3AF} ${i18n.t('feedback.nextsteps')}</h3>
                <ul>${items || `<li class="no-data">${i18n.t('feedback.nodata')}</li>`}</ul>
            </div>
        `;
    },

    renderTranscriptMessages(transcript, cssPrefix) {
        const interviewerLabel = i18n.t('interview.interviewer');
        const youLabel = i18n.t('interview.you');
        const skippedLabel = i18n.t('interview.skipped');

        return transcript.map(msg => {
            const isInterviewer = msg.role === 'interviewer';
            const isSkipped = !isInterviewer && msg.content === '[SKIPPED]';
            const content = isSkipped
                ? `<em>\u23ED ${skippedLabel}</em>`
                : Utils.escapeHtml(msg.content);
            return `
                <div class="${cssPrefix}-message ${msg.role}">
                    <div class="${cssPrefix}-sender">${isInterviewer ? '\u{1F3A4}' : '\u{1F464}'} ${isInterviewer ? interviewerLabel : youLabel}</div>
                    <div class="${cssPrefix}-content">${content}</div>
                </div>
            `;
        }).join('');
    },

    renderTranscriptCard(transcript) {
        if (!transcript?.length) return '';

        const messages = this.renderTranscriptMessages(transcript, 'transcript');

        return `
            <div class="feedback-card glass-card">
                <h3>\u{1F4CB} ${i18n.t('feedback.transcript')}</h3>
                <div class="share-transcript">${messages}</div>
            </div>
        `;
    },

    renderPrintTranscript(transcript) {
        if (!transcript?.length) return '';

        const messages = this.renderTranscriptMessages(transcript, 'print-transcript');

        return `
            <div class="print-only-transcript">
                <div class="feedback-card glass-card">
                    <h3>\u{1F4CB} ${i18n.t('feedback.transcript')}</h3>
                    <div class="print-transcript">
                        ${messages}
                    </div>
                </div>
            </div>
        `;
    },

    renderActionsCard(showShareButton) {
        return `
            <div class="feedback-actions">
                <div class="feedback-actions-row">
                    <button class="btn btn-primary btn-lg btn-glow" data-action="practice">
                        \u{1F504} ${i18n.t('btn.practice')}
                    </button>
                    <button class="btn btn-secondary btn-lg" data-action="transcript">
                        \u{1F4CB} ${i18n.t('btn.transcript')}
                    </button>
                </div>
                <div class="feedback-actions-row">
                    ${showShareButton ? `
                        <button class="btn btn-secondary btn-lg" data-action="share">
                            \u{1F517} ${i18n.t('btn.share')}
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-lg" data-action="export">
                        \u{1F5A8}\uFE0F ${i18n.t('btn.export')}
                    </button>
                </div>
            </div>
        `;
    },

    renderCTACard() {
        const name = (typeof Config !== 'undefined' && Config.PROJECT_NAME) || window.APP_NAME || '';
        const heading = i18n.t('cta.heading');
        const desc = i18n.t('cta.description', { name });
        const cta = i18n.t('cta.button', { name });
        const homeHref = window.PREPGENIUS_BASE_PATH ? (window.PREPGENIUS_BASE_PATH + '/') : './';
        return `
            <div class="feedback-card glass-card share-cta-card">
                <div class="share-cta-content">
                    <h3>${heading}</h3>
                    <p>${desc}</p>
                    <a href="${homeHref}" class="btn btn-primary btn-lg btn-glow">
                        \u{1F680} ${cta}
                    </a>
                </div>
            </div>
        `;
    },

    // =========================================================================
    // INITIALIZATION & INTERACTIVITY
    // =========================================================================

    initScoreAnimations(container) {
        const circle = container.querySelector('.score-circle');
        if (circle) {
            const score = parseInt(circle.dataset.score) || 0;
            const circumference = parseFloat(circle.dataset.circumference);
            const valueEl = circle.querySelector('.score-value-display');
            const fillEl = circle.querySelector('.score-fill');

            setTimeout(() => {
                if (fillEl && circumference) {
                    const offset = circumference * (1 - score / 100);
                    fillEl.style.strokeDashoffset = offset;
                }
                this.animateNumber(valueEl, 0, score, 800);
            }, 100);
        }

        container.querySelectorAll('.bar-fill').forEach((bar, i) => {
            const score = parseInt(bar.dataset.score) || 0;
            const scoreEl = container.querySelector(`.bar-score[data-key="${bar.dataset.key}"]`);
            setTimeout(() => {
                bar.style.width = `${score}%`;
                if (scoreEl) this.animateNumber(scoreEl, 0, score, 600);
            }, 200 + i * 100);
        });
    },

    animateNumber(el, from, to, duration) {
        const start = performance.now();
        const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(from + (to - from) * eased);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    },

    initQuestionNav(container) {
        container.querySelectorAll('.question-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir === 'prev' ? -1 : 1;
                this.navigateQuestion(dir, container);
            });
        });

        container.querySelectorAll('.question-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.goToQuestion(parseInt(dot.dataset.index), container);
            });
        });
    },

    navigateQuestion(dir, container) {
        const newIndex = this.currentQuestionIndex + dir;
        if (newIndex >= 0 && newIndex < this.questionFeedback.length) {
            this.goToQuestion(newIndex, container);
        }
    },

    goToQuestion(index, container) {
        if (index < 0 || index >= this.questionFeedback.length) return;
        this.currentQuestionIndex = index;

        container.querySelectorAll('.question-feedback-slide').forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        container.querySelectorAll('.question-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        const counter = container.querySelector('.question-counter');
        if (counter) counter.textContent = `${index + 1} / ${this.questionFeedback.length}`;

        const prevBtn = container.querySelector('[data-dir="prev"]');
        const nextBtn = container.querySelector('[data-dir="next"]');
        if (prevBtn) prevBtn.disabled = index === 0;
        if (nextBtn) nextBtn.disabled = index >= this.questionFeedback.length - 1;

        this.callbacks.onQuestionChange?.(index);
    },

    initActionButtons(container) {
        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'practice') this.callbacks.onPracticeAgain?.();
                else if (action === 'transcript') this.callbacks.onViewTranscript?.();
                else if (action === 'share') this.callbacks.onShare?.();
                else if (action === 'export') this.callbacks.onExportPDF?.();
            });
        });
    },

    // =========================================================================
    // UTILITIES
    // =========================================================================

    getPriorityColor(priority) {
        const colors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
        return colors[priority] || '#3b82f6';
    }
};