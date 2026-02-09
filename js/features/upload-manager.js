/**
 * js/features/upload-manager.js
 * Upload Manager
 *
 * Handles CV/JD file uploads, interviewer management, and interview preparation
 */

class UploadManager {
    constructor(app) {
        this.app = app;
        this.jdTextHash = null;
        this.activeJdTab = 'upload';
        this.setupFileUploads();
        this.setupTabs();
        this.setupJDInput();
        this.setupDelegatedEvents();
    }

    // =========================================================================
    // DELEGATED EVENTS FOR DYNAMIC ELEMENTS
    // =========================================================================
    setupDelegatedEvents() {
        document.getElementById('cv-preview')?.addEventListener('click', (e) => {
            if (e.target.closest('.file-preview-remove')) {
                this.removeCVFile();
            }
        });

        document.getElementById('jd-preview')?.addEventListener('click', (e) => {
            if (e.target.closest('.file-preview-remove')) {
                this.removeJDFile();
            }
        });

        document.getElementById('interviewers-list')?.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.interviewer-remove');
            if (removeBtn) {
                this.removeInterviewer(removeBtn);
            }
        });
    }

    // =========================================================================
    // FILE UPLOAD SETUP
    // =========================================================================
    setupDropZone(zoneId, fileInputId, onFile) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(fileInputId);

        if (input) {
            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) onFile(e.target.files[0]);
            });
        }

        if (zone) {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('dragover');
            });
            zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) onFile(e.dataTransfer.files[0]);
            });
        }
    }

    setupFileUploads() {
        this.setupDropZone('cv-zone', 'cv-file', (file) => this.handleCVFile(file));
        this.setupDropZone('jd-zone', 'jd-file', (file) => this.handleJDFile(file));
    }

    setupTabs() {
        document.querySelectorAll('.tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                tab.parentElement.querySelectorAll('.tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.tab === tabId);
                });
                tab.closest('.upload-card').querySelectorAll('.tab-panel').forEach(p => {
                    p.classList.toggle('active', p.dataset.tab === tabId);
                });

                if (tabId === 'upload' || tabId === 'paste') {
                    this.activeJdTab = tabId;
                    this.updateJdNextButton();
                }
            });
        });
    }

    setupJDInput() {
        const jdText = document.getElementById('jd-text');
        if (jdText) {
            jdText.addEventListener('input', () => {
                this.updateJdNextButton();
            });
        }
    }

    updateJdNextButton() {
        const btn = document.getElementById('btn-next-2');
        if (!btn) return;

        if (this.activeJdTab === 'upload') {
            btn.disabled = !this.app.state.jdData;
        } else {
            const jdText = document.getElementById('jd-text');
            btn.disabled = !jdText || jdText.value.trim().length < 50;
        }
    }

    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    hasJdTextChanged() {
        const jdText = document.getElementById('jd-text');
        if (!jdText) return false;
        return this.hashText(jdText.value.trim()) !== this.jdTextHash;
    }

    async processJdTextIfNeeded() {
        const jdText = document.getElementById('jd-text');
        if (!jdText) return false;

        const text = jdText.value.trim();
        if (text.length < 50) return false;

        if (!this.hasJdTextChanged() && this.app.state.jdData) {
            return true;
        }

        this.app.showLoading(this.app.t('loading.jd'), true);
        this.app.state.abortController = new AbortController();

        try {
            const result = await documentService.parseJDText(text, this.app.state.abortController.signal);
            this.app.state.jdData = result.parsed_data;
            this.jdTextHash = this.hashText(text);
            this.renderJDResult(result.parsed_data);
            this.app.hideLoading();
            return true;
        } catch (error) {
            this.app.hideLoading();
            if (error.message !== 'Cancelled') {
                this.app.showNotification('error.jd', 'error');
            }
            return false;
        }
    }

    getActiveJdSource() {
        return this.activeJdTab;
    }

    // =========================================================================
    // PLURALIZED RESULT HELPERS
    // =========================================================================
    formatCount(count, singularKey, pluralKey) {
        const key = count === 1 ? singularKey : pluralKey;
        return this.app.t(key).replace('{count}', count);
    }

    // =========================================================================
    // CV FILE HANDLING
    // =========================================================================
    async handleCVFile(file) {
        if (!file) return;

        this.app.state.cvData = null;

        this.renderFilePreview('cv-preview', file);
        document.getElementById('cv-preview').classList.remove('hidden');
        document.getElementById('cv-result').classList.add('hidden');
        document.getElementById('btn-next-1').disabled = true;

        const cvInput = document.getElementById('cv-file');
        if (cvInput) cvInput.value = '';

        this.app.showLoading(this.app.t('loading.cv'), true);
        this.app.state.abortController = new AbortController();

        try {
            const result = await documentService.parseCV(file, this.app.state.abortController.signal);
            this.app.state.cvData = result.parsed_data;
            this.renderCVResult(result.parsed_data);
            document.getElementById('cv-result').classList.remove('hidden');
            document.getElementById('btn-next-1').disabled = false;
            this.app.hideLoading();
        } catch (e) {
            this.app.hideLoading();
            if (e.message !== 'Cancelled') {
                this.app.showNotification(e.message || 'Failed to parse CV', 'error');
                this.removeCVFile();
            }
        }
    }

    renderCVResult(cv) {
        const lang = this.app.state.language;
        const title = Utils.resolveDisplayTitle(cv, lang, ['personal_info.name'], 'Candidate');
        const years = cv.total_experience_years || 0;
        const positions = cv.experience?.length || 0;

        const yearsText = this.formatCount(years, 'result.year', 'result.years');
        const positionsText = this.formatCount(positions, 'result.position', 'result.positions');

        document.getElementById('cv-result').innerHTML = `
            <strong>\u2705 ${this.app.t('result.cv.analyzed')}</strong><br>
            ${title}<br>
            ${yearsText} \u2022 ${positionsText}
        `;
    }

    removeCVFile() {
        this.app.state.cvData = null;
        document.getElementById('cv-preview').classList.add('hidden');
        document.getElementById('cv-result').classList.add('hidden');
        document.getElementById('btn-next-1').disabled = true;

        const cvInput = document.getElementById('cv-file');
        if (cvInput) cvInput.value = '';
    }

    // =========================================================================
    // JD FILE HANDLING
    // =========================================================================
    async handleJDFile(file) {
        if (!file) return;

        this.app.state.jdData = null;

        this.renderFilePreview('jd-preview', file);
        document.getElementById('jd-preview').classList.remove('hidden');
        document.getElementById('jd-result').classList.add('hidden');
        document.getElementById('btn-next-2').disabled = true;

        const jdInput = document.getElementById('jd-file');
        if (jdInput) jdInput.value = '';

        this.app.showLoading(this.app.t('loading.jd'), true);
        this.app.state.abortController = new AbortController();

        try {
            const result = await documentService.parseJDFile(file, this.app.state.abortController.signal);
            this.app.state.jdData = result.parsed_data;
            this.renderJDResult(result.parsed_data);
            document.getElementById('jd-result').classList.remove('hidden');
            document.getElementById('btn-next-2').disabled = false;
            this.app.hideLoading();
        } catch (e) {
            this.app.hideLoading();
            if (e.message !== 'Cancelled') {
                this.app.showNotification(e.message || 'Failed to parse JD', 'error');
                this.removeJDFile();
            }
        }
    }

    renderJDResult(jd) {
        const lang = this.app.state.language;
        const title = Utils.resolveDisplayTitle(jd, lang, ['job_info.title', 'title'], 'Position');
        const skillsCount = (jd.technical_skills?.length || 0) + (jd.soft_skills?.length || 0);
        const responsibilitiesCount = jd.responsibilities?.length || 0;

        const skillsText = this.formatCount(skillsCount, 'result.skill', 'result.skills');
        const respText = this.formatCount(responsibilitiesCount, 'result.responsibility', 'result.responsibilities');

        document.getElementById('jd-result').innerHTML = `
            <strong>\u2705 ${this.app.t('result.jd.analyzed')}</strong><br>
            ${title}<br>
            ${skillsText} \u2022 ${respText}
        `;
    }

    removeJDFile() {
        this.app.state.jdData = null;
        document.getElementById('jd-preview').classList.add('hidden');
        document.getElementById('jd-result').classList.add('hidden');
        document.getElementById('btn-next-2').disabled = true;

        const jdInput = document.getElementById('jd-file');
        if (jdInput) jdInput.value = '';
    }

    // =========================================================================
    // SHARED FILE PREVIEW
    // =========================================================================
    renderFilePreview(containerId, file) {
        const icon = containerId === 'cv-preview' ? '\u{1F4C4}' : '\u{1F4CB}';
        document.getElementById(containerId).innerHTML = `
            <div class="file-preview-item">
                <div class="file-preview-icon">${icon}</div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${Utils.formatFileSize(file.size)}</div>
                </div>
                <button class="file-preview-remove" type="button">\u00D7</button>
            </div>
        `;
    }

    // =========================================================================
    // RE-RENDER RESULTS ON LANGUAGE CHANGE
    // =========================================================================
    refreshResultLanguage() {
        if (this.app.state.cvData) {
            this.renderCVResult(this.app.state.cvData);
        }
        if (this.app.state.jdData) {
            this.renderJDResult(this.app.state.jdData);
        }
    }

    // =========================================================================
    // INTERVIEWER MANAGEMENT
    // =========================================================================
    addInterviewer() {
        const currentCount = document.querySelectorAll('.interviewer-group').length;
        if (currentCount >= 3) {
            this.app.showNotification('interviewers.max', 'warning');
            return;
        }

        const list = document.getElementById('interviewers-list');
        const group = document.createElement('div');
        group.className = 'interviewer-group';
        group.innerHTML = `
            <div class="interviewer-group-header">
                <div class="interviewer-group-title">
                    <span>\u{1F464}</span>
                    <div>${this.app.t('interviewers.label')} <span class="interviewer-number">${currentCount + 1}</span></div>
                </div>
                <button class="interviewer-remove" type="button">\u00D7</button>
            </div>
            <div class="interviewer-fields">
                <input type="text" class="input int-name" placeholder="${this.app.t('interviewers.name')}">
                <input type="text" class="input int-company" placeholder="${this.app.t('interviewers.company')}">
                <input type="text" class="input int-role" placeholder="${this.app.t('interviewers.role')}">
            </div>
        `;
        list.appendChild(group);
        this.renumberInterviewers();

        const newNameInput = group.querySelector('.int-name');
        if (newNameInput) {
            requestAnimationFrame(() => newNameInput.focus());
        }

        if (document.querySelectorAll('.interviewer-group').length >= 3) {
            const addBtn = document.getElementById('add-interviewer-btn');
            if (addBtn) addBtn.style.display = 'none';
        }
    }

    removeInterviewer(btn) {
        const currentCount = document.querySelectorAll('.interviewer-group').length;
        if (currentCount <= 1) return;

        const group = btn.closest('.interviewer-group');
        if (group) {
            group.remove();
            this.renumberInterviewers();

            if (document.querySelectorAll('.interviewer-group').length < 3) {
                const addBtn = document.getElementById('add-interviewer-btn');
                if (addBtn) addBtn.style.display = '';
            }
        }
    }

    renumberInterviewers() {
        const groups = document.querySelectorAll('.interviewer-group');
        groups.forEach((group, index) => {
            const numberSpan = group.querySelector('.interviewer-number');
            if (numberSpan) numberSpan.textContent = index + 1;

            const removeBtn = group.querySelector('.interviewer-remove');
            if (removeBtn) removeBtn.style.display = groups.length <= 1 ? 'none' : '';
        });
    }

    getInterviewersFromForm() {
        const interviewers = [];
        document.querySelectorAll('.interviewer-group').forEach(group => {
            const name = group.querySelector('.int-name').value.trim();
            const company = group.querySelector('.int-company').value.trim();
            const role = group.querySelector('.int-role').value.trim();

            if (name) {
                interviewers.push({ name, company: company || null, role: role || null });
            }
        });
        return interviewers;
    }

    // =========================================================================
    // INTERVIEW PREPARATION
    // =========================================================================
    async prepareInterview({ skipResearch = false } = {}) {
        const interviewers = skipResearch ? [] : this.getInterviewersFromForm();

        // Collect browser voices for AI-driven voice matching
        browserTts.init();
        const browserVoices = browserTts.getVoiceList();

        const loadingKey = interviewers.length > 0 ? 'loading.research' : 'loading.preparing';
        this.app.showLoading(this.app.t(loadingKey), true);
        this.app.state.abortController = new AbortController();

        try {
            const result = await interviewService.prepare({
                cvData: this.app.state.cvData,
                jdData: this.app.state.jdData,
                interviewers,
                language: this.app.state.language,
                browserVoices
            }, this.app.state.abortController.signal);

            this.app.state.matchAnalysis = result.results.match_analysis;

            const profiles = result.results.interviewer_profiles || [];
            const personas = result.results.interviewer_personas || [];

            this.app.state.interviewerProfiles = profiles;
            this.app.state.interviewerPersonas = personas;

            const notFoundNames = profiles
                .filter(p => !p.found)
                .map(p => p.input_name || p.name);

            if (notFoundNames.length > 0) {
                const names = notFoundNames.join(', ');
                this.app.showNotification('interviewers.notfound', 'warning', { names });
            }

            this.displayMatchSummary(this.app.state.matchAnalysis);
            this.app.hideLoading();
            this.app.goToStep(4);
        } catch (e) {
            this.app.hideLoading();
            if (e.message !== 'Cancelled') this.app.showNotification(e.message || 'Preparation failed', 'error');
        }
    }

    displayMatchSummary(match) {
        const container = document.getElementById('match-summary');
        if (!match) {
            container.innerHTML = `<p class="no-data">${this.app.t('feedback.nodata')}</p>`;
            return;
        }

        const lang = this.app.state.language;
        const localized = match[lang];
        const strengths = localized?.strengths || [];
        const gaps = localized?.gaps || [];

        let html = `
            <div class="match-header">
                <div class="match-score-badge">
                    <div class="match-score-circle">${match.match_score || 0}%</div>
                    <div>
                        <div class="match-score-label">${this.app.t('match.score')}</div>
                        <div class="match-score-sublabel">${this.app.t('match.based')}</div>
                    </div>
                </div>
            </div>
            <div class="match-details">
                <div class="match-section strengths">
                    <div class="match-section-title"><span>\u2705</span> ${this.app.t('match.strengths')} (${strengths.length})</div>
        `;

        strengths.slice(0, 4).forEach(s => {
            html += `
                <div class="match-item">
                    <span class="match-item-icon">\u{1F4AA}</span>
                    <div class="match-item-content">
                        <div class="match-item-area">${s.area || s}</div>
                        ${s.evidence ? `<div class="match-item-detail">${s.evidence}</div>` : ''}
                    </div>
                </div>
            `;
        });

        if (!strengths.length) html += `<div class="match-item">${this.app.t('match.none')}</div>`;

        html += `
                </div>
                <div class="match-section gaps">
                    <div class="match-section-title"><span>\u26A0\uFE0F</span> ${this.app.t('match.gaps')} (${gaps.length})</div>
        `;

        gaps.slice(0, 4).forEach(g => {
            html += `
                <div class="match-item">
                    <span class="match-item-icon">\u{1F4CC}</span>
                    <div class="match-item-content">
                        <div class="match-item-area">${g.area || g}</div>
                        ${g.mitigation_strategy || g.evidence ? `<div class="match-item-detail">\u{1F4A1} ${g.mitigation_strategy || g.evidence}</div>` : ''}
                    </div>
                </div>
            `;
        });

        if (!gaps.length) html += `<div class="match-item">${this.app.t('match.none')}</div>`;

        html += '</div></div>';
        container.innerHTML = html;
    }
}