/**
 * js/features/history-manager.js
 * History Manager
 *
 * Manages interview history in localStorage
 */

const historyManager = {
    STORAGE_KEY: 'prepgenius_history',
    MAX_ITEMS: 10,

    getHistory() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load history:', e);
            return [];
        }
    },

    saveInterview(interview) {
        try {
            const history = this.getHistory();
            history.unshift(interview);

            if (history.length > this.MAX_ITEMS) {
                history.splice(this.MAX_ITEMS);
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
            window.dispatchEvent(new CustomEvent('historyUpdated', { detail: { history } }));
            return true;
        } catch (e) {
            console.error('Failed to save to history:', e);
            return false;
        }
    },

    getInterview(id) {
        return this.getHistory().find(item => item.id === id) || null;
    },

    deleteInterview(id) {
        try {
            const history = this.getHistory();
            const filtered = history.filter(item => item.id !== id);

            if (filtered.length === history.length) return false;

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
            window.dispatchEvent(new CustomEvent('historyUpdated', { detail: { history: filtered } }));
            return true;
        } catch (e) {
            console.error('Failed to delete from history:', e);
            return false;
        }
    },

    clearHistory() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            window.dispatchEvent(new CustomEvent('historyUpdated', { detail: { history: [] } }));
            return true;
        } catch (e) {
            console.error('Failed to clear history:', e);
            return false;
        }
    },

    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();

        // Compare calendar days in local timezone
        const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const time = date.getHours().toString().padStart(2, '0')
                + ':' + date.getMinutes().toString().padStart(2, '0');
            return i18n.t('history.date.today', { time });
        }

        if (diffDays === 1) {
            return i18n.t('history.date.yesterday');
        }

        if (diffDays < 7) {
            return i18n.t('history.date.daysago', { days: diffDays });
        }

        const options = { month: 'short', day: 'numeric' };
        if (date.getFullYear() !== now.getFullYear()) {
            options.year = 'numeric';
        }

        return date.toLocaleDateString(Utils.toLocale(i18n.getLanguage()), options);
    },

    renderHistorySection() {
        const history = this.getHistory();

        if (!history.length) return '';

        const lang = i18n.getLanguage();

        const itemsHtml = history.map(item => {
            const score = item.scores?.overall || 0;
            const cls = score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';
            const dateStr = this.formatDate(item.timestamp);
            const position = Utils.resolvePosition(item.position, lang, '');

            return `
                <div class="history-item glass-card" data-id="${item.id}">
                    <div class="history-item-main">
                        <div class="history-item-icon">\u{1F3AF}</div>
                        <div class="history-item-info">
                            <div class="history-item-position">${Utils.escapeHtml(position)}</div>
                            <div class="history-item-date">${dateStr}</div>
                        </div>
                        <div class="history-item-score ${cls}">${score}/100</div>
                    </div>
                    <div class="history-item-actions">
                        <button class="btn btn-sm btn-secondary history-view-btn" data-id="${item.id}">${i18n.t('history.view')}</button>
                        <button class="btn btn-sm btn-ghost history-delete-btn" data-id="${item.id}">\u{1F5D1}\uFE0F</button>
                    </div>
                </div>
            `;
        }).join('');

        const countKey = history.length > 1 ? 'history.count.plural' : 'history.count';

        return `
            <div class="history-section" id="history-section">
                <div class="history-header" id="history-header">
                    <h3 class="history-title">\u{1F4DA} ${i18n.t('history.title')}</h3>
                    <span class="toggle-icon">\u25BC</span>
                </div>
                <div class="history-content" id="history-content">
                    <div class="history-items">${itemsHtml}</div>
                    <div class="history-footer">
                        <span class="history-count">${i18n.t(countKey, { count: history.length })}</span>
                        <button class="btn btn-sm btn-ghost" id="history-clear-btn">${i18n.t('history.clear.all')}</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Attach event listeners to history section elements.
     * @param {Object} callbacks - { onToggle, onClear, onView, onDelete }
     */
    attachHistorySectionListeners(callbacks = {}) {
        const header = document.getElementById('history-header');
        if (header && callbacks.onToggle) {
            header.addEventListener('click', callbacks.onToggle);
        }

        const clearBtn = document.getElementById('history-clear-btn');
        if (clearBtn && callbacks.onClear) {
            clearBtn.addEventListener('click', callbacks.onClear);
        }

        document.querySelectorAll('.history-view-btn').forEach(btn => {
            btn.addEventListener('click', () => callbacks.onView?.(btn.dataset.id));
        });

        document.querySelectorAll('.history-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => callbacks.onDelete?.(btn.dataset.id));
        });
    }
};