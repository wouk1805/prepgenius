/**
 * js/features/pdf-export.js
 * PDF Export Module
 *
 * Uses browser's native print with custom filename
 * Transcript is permanently in DOM (hidden on screen, visible in print via CSS)
 */

const pdfExport = {

    /**
     * Export feedback as PDF using browser print.
     * @param {Object} data     - Interview data (cvData, jdData, conversationHistory)
     * @param {string} language - Current language (en/fr)
     */
    export(data, language = 'en') {
        const isFr = language === 'fr';
        const filename = this.generateFilename(data, isFr);
        const originalTitle = document.title;

        // Browsers use document.title as the default PDF filename
        document.title = filename;

        const cleanup = () => { document.title = originalTitle; };

        const afterPrintHandler = () => {
            cleanup();
            window.removeEventListener('afterprint', afterPrintHandler);
        };
        window.addEventListener('afterprint', afterPrintHandler);

        window.print();

        // Fallback cleanup for browsers that don't fire afterprint
        setTimeout(cleanup, 1000);

        return { success: true, filename };
    },

    /**
     * Generate filename: [AppName]_[Position]_YYYY-MM-DD_HHhMM
     */
    generateFilename(data, isFr) {
        const lang = isFr ? 'fr' : 'en';
        const defaultLabel = isFr ? 'Entretien' : 'Interview';

        const position = Utils.resolveDisplayTitle(
            data.jdData,
            lang,
            ['job_info.title', 'title', 'position'],
            defaultLabel
        );

        const now = new Date();
        const dateStr = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
        const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;

        const sanitizedPosition = position
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);

        const prefix = (typeof Config !== 'undefined' && Config.PROJECT_NAME) || 'Interview';
        return `${prefix}_${sanitizedPosition}_${dateStr}_${timeStr}`;
    }
};