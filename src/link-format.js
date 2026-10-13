/**
 * TabBrain — Link Formatting
 * Turns a list of tabs into clipboard text. Pure functions, no Chrome APIs.
 */

(function () {
    const FORMATS = {
        url: {
            label: 'URLs',
            format: tab => tabUrl(tab)
        },
        markdown: {
            label: 'Markdown',
            format: tab => `- [${escapeMarkdownText(tabTitle(tab))}](${escapeMarkdownUrl(tabUrl(tab))})`
        },
        titled: {
            label: 'Title + URL',
            format: tab => `${tabTitle(tab)}\n${tabUrl(tab)}`
        }
    };

    const DEFAULT_FORMAT = 'url';

    function tabUrl(tab) {
        // Tabs that are still loading may only have a pendingUrl
        return tab.url || tab.pendingUrl || '';
    }

    function tabTitle(tab) {
        return (tab.title || '').trim() || tabUrl(tab);
    }

    function escapeMarkdownText(text) {
        return text.replace(/([\\[\]])/g, '\\$1');
    }

    function escapeMarkdownUrl(url) {
        return url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/ /g, '%20');
    }

    /**
     * Format tabs as clipboard text. Tabs without a URL are skipped.
     */
    function formatLinks(tabs, formatKey) {
        const format = FORMATS[formatKey] || FORMATS[DEFAULT_FORMAT];
        const separator = formatKey === 'titled' ? '\n\n' : '\n';
        return tabs
            .filter(tab => tabUrl(tab))
            .map(format.format)
            .join(separator);
    }

    globalThis.TabBrainLinkFormat = { FORMATS, DEFAULT_FORMAT, formatLinks, tabUrl, tabTitle };
})();
