/**
 * TabBrain — Background Service Worker
 * Orchestrates tab capture, content extraction, categorization, AI tagging, and storage
 */

// Import modules (relative to this file's location in src/)
importScripts('categorizer.js', 'ai-tagger.js');

// Access via namespaces (importScripts shares global scope, can't re-declare)
const Categorizer = globalThis.TabBrainCategorizer;
const AI = globalThis.TabBrainAI;

/**
 * Extract content from a single tab via content script
 */
async function extractTabContent(tabId) {
    try {
        // First, try injecting the content script (in case it hasn't loaded)
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['src/content.js']
            });
        } catch {
            // Script may already be injected or tab may not be scriptable
        }

        // Send extraction message
        const response = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CONTENT' });
        return response?.content || '';
    } catch {
        // Tab may be a chrome:// page or otherwise unscriptable
        return '';
    }
}

/**
 * Save all open tabs — the main action
 */
async function saveAllTabs() {
    // 1. Get all tabs
    const tabs = await chrome.tabs.query({});

    // Filter out chrome:// and extension pages
    const validTabs = tabs.filter(t =>
        t.url &&
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://') &&
        !t.url.startsWith('about:') &&
        !t.url.startsWith('edge://')
    );

    // 2. Extract content from each tab (parallel, with timeout)
    const contentPromises = validTabs.map(tab =>
        Promise.race([
            extractTabContent(tab.id),
            new Promise(resolve => setTimeout(() => resolve(''), 3000)) // 3s timeout
        ])
    );
    const contents = await Promise.all(contentPromises);

    // 3. Get settings for AI tagging
    const settings = await chrome.storage.local.get(['apiKey', 'provider', 'aiEnabled']);
    const aiEnabled = settings.aiEnabled !== false; // Default: on
    const apiKey = settings.apiKey || '';
    const provider = settings.provider || 'gemini';

    // 4. AI tagging (if enabled and key exists)
    let aiTagResults = new Map();
    if (aiEnabled && apiKey) {
        const tabData = validTabs.map((tab, i) => ({
            title: tab.title,
            url: tab.url,
            pageContent: contents[i]
        }));
        aiTagResults = await AI.aiTagTabs(tabData, apiKey, provider);
    }

    // 5. Categorize each tab
    const categorizedTabs = validTabs.map((tab, i) => {
        const aiResult = aiTagResults.get(i) || { tags: [], summary: '' };
        const aiTags = Array.isArray(aiResult) ? aiResult : (aiResult.tags || []);
        const aiSummary = aiResult.summary || '';
        const categorized = Categorizer.categorizeTab(tab, contents[i], aiTags);
        // Override summary with AI summary if available
        if (aiSummary) categorized.summary = aiSummary;
        return categorized;
    });

    // 7. Deduplicate against previous sessions
    const { sessions: existingSessions = [] } = await chrome.storage.local.get('sessions');
    const existingUrls = new Set();
    for (const s of existingSessions) {
        for (const t of (s.allTabs || [])) {
            existingUrls.add(t.url);
        }
    }

    // Filter out tabs already saved in previous sessions
    const newTabs = categorizedTabs.filter(t => !existingUrls.has(t.url));
    const duplicateCount = categorizedTabs.length - newTabs.length;

    // Rebuild categories from deduped tabs
    const categories = {};
    for (const tab of newTabs) {
        if (!categories[tab.category]) {
            categories[tab.category] = {
                name: tab.category,
                icon: tab.categoryIcon,
                color: tab.categoryColor,
                tabs: []
            };
        }
        categories[tab.category].tabs.push(tab);
    }

    // 8. Build session object
    const session = {
        id: `session_${Date.now()}`,
        savedAt: new Date().toISOString(),
        tabCount: newTabs.length,
        categories,
        categoryCount: Object.keys(categories).length,
        aiTagged: aiEnabled && !!apiKey,
        allTabs: newTabs,
        duplicatesSkipped: duplicateCount
    };

    // Skip saving if all tabs were duplicates
    if (newTabs.length === 0) {
        return { ...session, allDuplicates: true };
    }

    // 9. Save to storage
    existingSessions.unshift(session); // Newest first

    // Keep last 50 sessions to manage storage
    if (existingSessions.length > 50) existingSessions.length = 50;

    await chrome.storage.local.set({ sessions: existingSessions });

    return session;
}

/**
 * Delete a session by ID
 */
async function deleteSession(sessionId) {
    const { sessions = [] } = await chrome.storage.local.get('sessions');
    const filtered = sessions.filter(s => s.id !== sessionId);
    await chrome.storage.local.set({ sessions: filtered });
    return true;
}

/**
 * Get all sessions
 */
async function getSessions() {
    const { sessions = [] } = await chrome.storage.local.get('sessions');
    return sessions;
}

/**
 * Open tabs from a session
 */
async function openSessionTabs(sessionId, category = null) {
    const { sessions = [] } = await chrome.storage.local.get('sessions');
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;

    let tabsToOpen = session.allTabs;
    if (category) {
        tabsToOpen = tabsToOpen.filter(t => t.category === category);
    }

    for (const tab of tabsToOpen) {
        await chrome.tabs.create({ url: tab.url, active: false });
    }
    return true;
}

/**
 * Export all sessions as JSON
 */
async function exportSessions() {
    const { sessions = [] } = await chrome.storage.local.get('sessions');
    return {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        sessionCount: sessions.length,
        sessions
    };
}

/**
 * Import sessions from JSON, merging with existing and deduplicating
 */
async function importSessions(importData) {
    if (!importData || !Array.isArray(importData.sessions)) {
        throw new Error('Invalid import data');
    }

    const { sessions: existing = [] } = await chrome.storage.local.get('sessions');

    // Build set of existing session IDs and all existing URLs
    const existingIds = new Set(existing.map(s => s.id));
    const existingUrls = new Set();
    for (const s of existing) {
        for (const t of (s.allTabs || [])) {
            existingUrls.add(t.url);
        }
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const session of importData.sessions) {
        // Skip duplicate sessions
        if (existingIds.has(session.id)) {
            skippedCount++;
            continue;
        }

        // Deduplicate tabs within this session against existing URLs
        const newTabs = (session.allTabs || []).filter(t => !existingUrls.has(t.url));

        if (newTabs.length === 0) {
            skippedCount++;
            continue;
        }

        // Rebuild categories
        const categories = {};
        for (const tab of newTabs) {
            if (!categories[tab.category]) {
                categories[tab.category] = {
                    name: tab.category,
                    icon: tab.categoryIcon,
                    color: tab.categoryColor,
                    tabs: []
                };
            }
            categories[tab.category].tabs.push(tab);
            existingUrls.add(tab.url);
        }

        session.allTabs = newTabs;
        session.categories = categories;
        session.tabCount = newTabs.length;
        session.categoryCount = Object.keys(categories).length;

        existing.push(session);
        importedCount++;
    }

    // Sort by date, newest first
    existing.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    if (existing.length > 50) existing.length = 50;

    await chrome.storage.local.set({ sessions: existing });

    return { importedCount, skippedCount };
}

/**
 * Delete an individual tab by URL from all sessions
 */
async function deleteTab(tabUrl) {
    const { sessions = [] } = await chrome.storage.local.get('sessions');

    for (const session of sessions) {
        // Remove from allTabs
        session.allTabs = (session.allTabs || []).filter(t => t.url !== tabUrl);

        // Remove from categories
        for (const catKey of Object.keys(session.categories || {})) {
            const cat = session.categories[catKey];
            cat.tabs = (cat.tabs || []).filter(t => t.url !== tabUrl);
            if (cat.tabs.length === 0) {
                delete session.categories[catKey];
            }
        }

        session.tabCount = session.allTabs.length;
        session.categoryCount = Object.keys(session.categories).length;
    }

    // Remove empty sessions
    const cleaned = sessions.filter(s => s.allTabs.length > 0);
    await chrome.storage.local.set({ sessions: cleaned });
    return true;
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handlers = {
        'SAVE_TABS': () => saveAllTabs(),
        'GET_SESSIONS': () => getSessions(),
        'DELETE_SESSION': () => deleteSession(message.sessionId),
        'DELETE_TAB': () => deleteTab(message.tabUrl),
        'OPEN_SESSION': () => openSessionTabs(message.sessionId, message.category),
        'TEST_API_KEY': () => AI.testApiKey(message.apiKey, message.provider),
        'GET_SETTINGS': () => chrome.storage.local.get(['apiKey', 'provider', 'aiEnabled']),
        'SAVE_SETTINGS': () => chrome.storage.local.set(message.settings),
        'EXPORT_SESSIONS': () => exportSessions(),
        'IMPORT_SESSIONS': () => importSessions(message.importData),
        'CLEAR_ALL': async () => {
            await chrome.storage.local.set({ sessions: [] });
            return true;
        }
    };

    const handler = handlers[message.type];
    if (handler) {
        handler().then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async
    }
});

// Show badge with tab count on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeBackgroundColor({ color: '#a78bfa' });
});
