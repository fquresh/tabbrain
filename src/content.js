/**
 * TabBrain - Content Script
 * Extracts visible page text and meta information for categorization
 */

(() => {
    // Prevent double injection
    if (window.__tabBrainInjected) return;
    window.__tabBrainInjected = true;

    /**
     * Extract meaningful text from the page
     */
    function extractPageContent() {
        const parts = [];

        // 1. Meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc?.content) parts.push(metaDesc.content);

        // 2. Meta keywords
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords?.content) parts.push(metaKeywords.content);

        // 3. OG tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle?.content) parts.push(ogTitle.content);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc?.content) parts.push(ogDesc.content);

        // 4. Main content areas (prefer article/main over body)
        const mainContent = document.querySelector('article') ||
            document.querySelector('main') ||
            document.querySelector('[role="main"]');

        if (mainContent) {
            parts.push(mainContent.innerText);
        } else if (document.body) {
            parts.push(document.body.innerText);
        }

        // Join, clean up whitespace, truncate
        const text = parts.join('\n')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 1500);

        return text;
    }

    // Listen for extraction requests from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'EXTRACT_CONTENT') {
            try {
                const content = extractPageContent();
                sendResponse({ success: true, content });
            } catch (err) {
                sendResponse({ success: false, content: '', error: err.message });
            }
        }
        // Responses are sent synchronously, so the channel does not need to stay open
    });
})();
