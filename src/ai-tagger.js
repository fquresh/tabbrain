((function () {
    /**
     * TabBrain - AI Tagger Module
     * Uses the Gemini API for intelligent multi-tagging
     */

    // Pinned model ID. Check https://ai.google.dev/gemini-api/docs/deprecations before changing.
    const GEMINI_MODEL = 'gemini-3.5-flash-lite';

    const AI_CONFIG = {
        gemini: {
            name: 'Gemini',
            model: GEMINI_MODEL,
            endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
            // Send the key in a header so it stays out of URLs and request logs
            buildHeaders: (apiKey) => ({ 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }),
            buildUrl: (endpoint) => endpoint,
            buildBody: (prompt) => ({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    // 15 tabs x (tags + summary) needs well over 256 tokens
                    maxOutputTokens: 4096,
                    responseMimeType: 'application/json'
                }
            }),
            parseResponse: (data) => {
                try {
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
                    return JSON.parse(text);
                } catch {
                    return [];
                }
            }
        }
    };

    /**
     * Build the prompt for AI tagging
     */
    function buildTaggingPrompt(tabs) {
        const tabData = tabs.map((t, i) => ({
            index: i,
            title: t.title || 'Untitled',
            url: t.url,
            content: (t.pageContent || '').substring(0, 800)
        }));

        return `You are a browser tab categorization AI. Analyze each tab and generate specific, descriptive tags.

INSTRUCTIONS:
1. For each tab, return 2-6 tags that describe the SPECIFIC content
2. Tags must be lowercase, 1-3 words each
3. Be SPECIFIC - prefer "react hooks" over "coding", "nba trade rumors" over "sports"
4. For social media (X/Twitter, Reddit), identify the TOPIC of the post:
   - Trading/stocks: tag with specific tickers ($TSLA, $AAPL), "trading", market type
   - Crypto: tag with specific coins, "crypto", "defi", etc.
   - AI/Tech: tag with specific tech, "ai", model names, frameworks
   - Sports: tag with sport name, team names, player names
   - Politics: tag with specific topics, people, policies
   - Memes/humor: tag as "memes", "humor"
5. For articles/blogs: identify the subject matter specifically
6. For YouTube: identify the video topic, creator name if visible
7. Include proper nouns (company names, people, products) when relevant
8. Also return a brief one-line summary (max 15 words) of each tab's content

Return a JSON array: [{"index": 0, "tags": ["react", "hooks", "web dev"], "summary": "Tutorial on React hooks for beginners"}]

Tabs:
${JSON.stringify(tabData, null, 2)}

Return ONLY the JSON array.`;
    }

    /**
     * Tag tabs using AI
     * @param {Array} tabs - Array of tab objects with title, url, pageContent
     * @param {string} apiKey - API key 
     * @param {string} provider - 'gemini' (default)
     * @returns {Promise<Map<number, {tags: string[], summary: string}>>}
     */
    async function aiTagTabs(tabs, apiKey, provider = 'gemini') {
        if (!apiKey || !tabs.length) return new Map();

        const config = AI_CONFIG[provider];
        if (!config) return new Map();

        // Batch tabs in groups of 15 to avoid token limits
        const BATCH_SIZE = 15;
        const allResults = new Map();

        for (let i = 0; i < tabs.length; i += BATCH_SIZE) {
            const batch = tabs.slice(i, i + BATCH_SIZE);
            const prompt = buildTaggingPrompt(batch);

            try {
                const url = config.buildUrl(config.endpoint);
                const headers = config.buildHeaders(apiKey);
                const body = config.buildBody(prompt);

                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    console.warn(`TabBrain AI: API error ${response.status}`);
                    continue;
                }

                const data = await response.json();
                const results = config.parseResponse(data);

                if (Array.isArray(results)) {
                    for (const item of results) {
                        if (Number.isInteger(item?.index) && item.index >= 0 && item.index < batch.length && Array.isArray(item.tags)) {
                            // Model output is untrusted (page text can steer it), so coerce and clamp it
                            allResults.set(i + item.index, {
                                tags: item.tags.slice(0, 8).map(t => String(t).toLowerCase().trim().slice(0, 40)).filter(Boolean),
                                summary: String(item.summary ?? '').slice(0, 200)
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn('TabBrain AI: Tagging error', err.message);
            }
        }

        return allResults;
    }

    /**
     * Test the API key by making a minimal request
     */
    async function testApiKey(apiKey, provider = 'gemini') {
        const config = AI_CONFIG[provider];
        if (!config) return { valid: false, error: 'Unknown provider' };

        try {
            const url = config.buildUrl(config.endpoint);
            const headers = config.buildHeaders(apiKey);
            const body = config.buildBody('Reply with just the word "ok"');

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (response.ok) return { valid: true };
            const errData = await response.json().catch(() => ({}));
            return { valid: false, error: errData.error?.message || `HTTP ${response.status}` };
        } catch (err) {
            return { valid: false, error: err.message };
        }
    }

    // Export
    globalThis.TabBrainAI = { aiTagTabs, testApiKey, AI_CONFIG };

})());
