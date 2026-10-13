((function () {
  /**
   * TabBrain - Categorization Engine v2
   * Expanded URL patterns, content-aware subcategories, reduced "Other" bucket
   */

  const URL_CATEGORIES = [
    {
      category: '🤖 LLM / AI',
      icon: '🤖',
      color: '#a78bfa',
      patterns: [
        /chatgpt\.com/i, /chat\.openai\.com/i, /claude\.ai/i, /anthropic\.com/i,
        /gemini\.google\.com/i, /bard\.google\.com/i, /perplexity\.ai/i,
        /huggingface\.co/i, /replicate\.com/i, /midjourney\.com/i,
        /poe\.com/i, /character\.ai/i, /ollama/i, /lmstudio/i,
        /copilot\.microsoft\.com/i, /deepseek/i, /groq\.com/i,
        /openrouter\.ai/i, /together\.ai/i, /anyscale\.com/i,
        /stability\.ai/i, /runway(ml)?\.com/i, /leonardo\.ai/i,
        /elevenlabs\.io/i, /play\.ht/i, /suno\.ai/i,
        /cursor\.sh/i, /v0\.dev/i, /bolt\.new/i, /replit\.com.*ai/i
      ]
    },
    {
      category: '𝕏 X / Twitter',
      icon: '𝕏',
      color: '#1d9bf0',
      patterns: [/x\.com/i, /twitter\.com/i, /tweetdeck/i, /nitter/i],
      subcategorize: true // Flag: uses content-based subcategorization
    },
    {
      category: '🎬 YouTube',
      icon: '🎬',
      color: '#ff0000',
      patterns: [/youtube\.com/i, /youtu\.be/i]
    },
    {
      category: '💻 Dev / Code',
      icon: '💻',
      color: '#58a6ff',
      patterns: [
        /github\.com/i, /gitlab\.com/i, /bitbucket\.org/i,
        /stackoverflow\.com/i, /stackexchange\.com/i, /dev\.to/i,
        /codepen\.io/i, /codesandbox\.io/i, /jsfiddle\.net/i,
        /npmjs\.com/i, /pypi\.org/i, /crates\.io/i,
        /developer\./i, /docs\.rs/i, /mdn\.mozilla/i,
        /replit\.com/i, /glitch\.com/i, /vercel\.com/i,
        /netlify\.com/i, /heroku\.com/i, /railway\.app/i,
        /digitalocean\.com/i, /aws\.amazon\.com/i, /cloud\.google\.com/i,
        /azure\.microsoft\.com/i, /supabase\.com/i, /firebase\.google/i,
        /hashnode\.dev/i, /hackernoon\.com/i
      ]
    },
    {
      category: '📱 Reddit',
      icon: '📱',
      color: '#ff4500',
      patterns: [/reddit\.com/i, /old\.reddit\.com/i, /redd\.it/i],
      subcategorize: true
    },
    {
      category: '📄 Docs / Productivity',
      icon: '📄',
      color: '#34d399',
      patterns: [
        /docs\.google\.com/i, /sheets\.google\.com/i, /slides\.google\.com/i,
        /notion\.so/i, /notion\.site/i, /confluence/i, /trello\.com/i,
        /asana\.com/i, /clickup\.com/i, /linear\.app/i, /jira/i,
        /figma\.com/i, /canva\.com/i, /miro\.com/i,
        /airtable\.com/i, /coda\.io/i, /basecamp\.com/i,
        /monday\.com/i, /todoist\.com/i, /evernote\.com/i,
        /dropbox\.com/i, /box\.com/i, /drive\.google\.com/i,
        /calendar\.google\.com/i, /obsidian\.md/i
      ]
    },
    {
      category: '🛒 Shopping',
      icon: '🛒',
      color: '#f59e0b',
      patterns: [
        /amazon\./i, /ebay\.com/i, /walmart\.com/i, /target\.com/i,
        /etsy\.com/i, /shopify/i, /bestbuy\.com/i, /newegg\.com/i,
        /aliexpress\.com/i, /wish\.com/i, /costco\.com/i,
        /homedepot\.com/i, /lowes\.com/i, /wayfair\.com/i,
        /zappos\.com/i, /nordstrom\.com/i, /macys\.com/i
      ]
    },
    {
      category: '📧 Email / Messaging',
      icon: '📧',
      color: '#60a5fa',
      patterns: [
        /mail\.google\.com/i, /outlook\.(live|office)/i,
        /mail\.yahoo\.com/i, /proton\.me/i, /protonmail/i,
        /slack\.com/i, /teams\.microsoft/i, /telegram\.org/i,
        /web\.whatsapp\.com/i, /messages\.google\.com/i
      ]
    },
    {
      category: '📰 News',
      icon: '📰',
      color: '#94a3b8',
      patterns: [
        /news\.google\.com/i, /cnn\.com/i, /bbc\./i, /reuters\.com/i,
        /apnews\.com/i, /nytimes\.com/i, /washingtonpost\.com/i,
        /theguardian\.com/i, /foxnews\.com/i, /nbcnews\.com/i,
        /abcnews\.go\.com/i, /cbsnews\.com/i, /usatoday\.com/i,
        /politico\.com/i, /axios\.com/i, /thehill\.com/i,
        /dailymail\.co/i, /huffpost\.com/i, /newsweek\.com/i,
        /vice\.com/i, /vox\.com/i, /slate\.com/i, /salon\.com/i
      ]
    },
    {
      category: '📈 Finance / Trading',
      icon: '📈',
      color: '#22c55e',
      patterns: [
        /tradingview\.com/i, /finance\.yahoo\.com/i, /bloomberg\.com/i,
        /cnbc\.com/i, /marketwatch\.com/i, /robinhood\.com/i,
        /coinbase\.com/i, /binance\.com/i, /coingecko\.com/i,
        /coinmarketcap\.com/i, /seekingalpha\.com/i, /investopedia\.com/i,
        /polymarket\.com/i, /kalshi\.com/i, /webull\.com/i,
        /fidelity\.com/i, /schwab\.com/i, /etrade\.com/i,
        /td\.com.*invest/i, /morningstar\.com/i, /zacks\.com/i,
        /stocktwits\.com/i, /finviz\.com/i, /benzinga\.com/i,
        /dexscreener\.com/i, /dextools\.io/i, /uniswap\.org/i,
        /opensea\.io/i, /raydium\.io/i, /jupiter\.exchange/i,
        /phantom\.app/i, /solscan\.io/i, /etherscan\.io/i,
        /wallstreetbets/i
      ]
    },
    {
      category: '📝 Articles / Blogs',
      icon: '📝',
      color: '#fb923c',
      patterns: [
        /substack\.com/i, /medium\.com/i, /mirror\.xyz/i,
        /wordpress\.com/i, /blogger\.com/i, /ghost\.org/i,
        /beehiiv\.com/i, /buttondown\.email/i, /convertkit\.com/i,
        /telegra\.ph/i, /longform\.org/i, /pocket\.com/i,
        /instapaper\.com/i, /readwise\.io/i, /omnivore\.app/i,
        /blog\./i, /\/blog\//i, /\/article\//i, /\/post\//i
      ]
    },
    {
      category: '🏢 Tech News / Blogs',
      icon: '🏢',
      color: '#818cf8',
      patterns: [
        /techcrunch\.com/i, /theverge\.com/i, /arstechnica\.com/i,
        /wired\.com/i, /engadget\.com/i, /mashable\.com/i,
        /9to5mac\.com/i, /9to5google\.com/i, /macrumors\.com/i,
        /tomshardware\.com/i, /anandtech\.com/i, /gizmodo\.com/i,
        /zdnet\.com/i, /cnet\.com/i, /techmeme\.com/i,
        /producthunt\.com/i, /ycombinator\.com/i, /news\.ycombinator/i,
        /slashdot\.org/i, /lobste\.rs/i, /infoq\.com/i
      ]
    },
    {
      category: '🎮 Gaming',
      icon: '🎮',
      color: '#8b5cf6',
      patterns: [
        /twitch\.tv/i, /store\.steampowered/i, /discord\.com/i,
        /epicgames\.com/i, /ign\.com/i, /gamespot\.com/i,
        /kotaku\.com/i, /polygon\.com/i, /pcgamer\.com/i,
        /gog\.com/i, /humblebundle\.com/i, /xbox\.com/i,
        /playstation\.com/i, /nintendo\.com/i
      ]
    },
    {
      category: '🎵 Music / Audio',
      icon: '🎵',
      color: '#1db954',
      patterns: [
        /spotify\.com/i, /music\.apple\.com/i, /soundcloud\.com/i,
        /pandora\.com/i, /tidal\.com/i, /bandcamp\.com/i,
        /audible\.com/i, /podcasts\./i, /overcast\.fm/i,
        /pocketcasts\.com/i, /music\.youtube/i
      ]
    },
    {
      category: '📸 Social Media',
      icon: '📸',
      color: '#e1306c',
      patterns: [
        /instagram\.com/i, /facebook\.com/i, /tiktok\.com/i,
        /snapchat\.com/i, /linkedin\.com/i, /threads\.net/i,
        /pinterest\.com/i, /tumblr\.com/i, /mastodon/i,
        /bsky\.app/i, /bluesky/i
      ]
    },
    {
      category: '🏋️ Health / Fitness',
      icon: '🏋️',
      color: '#ef4444',
      patterns: [
        /myfitnesspal\.com/i, /strava\.com/i, /fitbit\.com/i,
        /webmd\.com/i, /mayoclinic\.org/i, /healthline\.com/i,
        /nih\.gov/i, /medlineplus\.gov/i, /drugs\.com/i
      ]
    },
    {
      category: '🎓 Education / Learning',
      icon: '🎓',
      color: '#06b6d4',
      patterns: [
        /coursera\.org/i, /udemy\.com/i, /edx\.org/i,
        /khanacademy\.org/i, /skillshare\.com/i, /pluralsight\.com/i,
        /leetcode\.com/i, /hackerrank\.com/i, /codewars\.com/i,
        /duolingo\.com/i, /brilliant\.org/i, /masterclass\.com/i,
        /\.edu\//i, /scholar\.google/i, /arxiv\.org/i,
        /researchgate\.net/i, /academia\.edu/i, /jstor\.org/i,
        /wikipedia\.org/i, /wikimedia\.org/i
      ]
    },
    {
      category: '🍿 Streaming / Entertainment',
      icon: '🍿',
      color: '#e11d48',
      patterns: [
        /netflix\.com/i, /hulu\.com/i, /disneyplus\.com/i,
        /max\.com/i, /hbomax\.com/i, /peacock/i,
        /primevideo\.com/i, /crunchyroll\.com/i, /funimation/i,
        /imdb\.com/i, /rottentomatoes\.com/i, /letterboxd\.com/i
      ]
    },
    {
      category: '🏠 Real Estate',
      icon: '🏠',
      color: '#65a30d',
      patterns: [
        /zillow\.com/i, /realtor\.com/i, /redfin\.com/i,
        /trulia\.com/i, /apartments\.com/i, /hotpads\.com/i
      ]
    },
    {
      category: '✈️ Travel',
      icon: '✈️',
      color: '#0ea5e9',
      patterns: [
        /airbnb\.com/i, /booking\.com/i, /expedia\.com/i,
        /kayak\.com/i, /skyscanner\.com/i, /tripadvisor\.com/i,
        /google\.com\/maps/i, /maps\.google/i, /google\.com\/travel/i,
        /hotels\.com/i, /vrbo\.com/i, /united\.com/i,
        /delta\.com/i, /aa\.com/i, /southwest\.com/i
      ]
    },
    {
      category: '🍔 Food / Delivery',
      icon: '🍔',
      color: '#ea580c',
      patterns: [
        /doordash\.com/i, /ubereats\.com/i, /grubhub\.com/i,
        /postmates\.com/i, /instacart\.com/i, /yelp\.com/i,
        /opentable\.com/i, /allrecipes\.com/i, /epicurious\.com/i
      ]
    },
    {
      category: '⚽ Sports',
      icon: '⚽',
      color: '#16a34a',
      patterns: [
        /espn\.com/i, /sports\.yahoo\.com/i, /bleacherreport\.com/i,
        /cbssports\.com/i, /nba\.com/i, /nfl\.com/i, /mlb\.com/i,
        /nhl\.com/i, /fifa\.com/i, /premierleague\.com/i,
        /theathletic\.com/i, /sportsreference\.com/i,
        /fantasypros\.com/i, /draftkings\.com/i, /fanduel\.com/i
      ]
    },
    {
      category: '🔧 Tools / Utilities',
      icon: '🔧',
      color: '#78716c',
      patterns: [
        /speedtest\.net/i, /fast\.com/i, /wolframalpha\.com/i,
        /regex101\.com/i, /jsonformatter/i, /codepen\.io/i,
        /excalidraw\.com/i, /draw\.io/i, /diagrams\.net/i,
        /1password\.com/i, /bitwarden\.com/i, /lastpass\.com/i,
        /grammarly\.com/i, /deepl\.com/i, /translate\.google/i
      ]
    },
    {
      category: '🏦 Banking',
      icon: '🏦',
      color: '#0369a1',
      patterns: [
        /chase\.com/i, /bankofamerica\.com/i, /wellsfargo\.com/i,
        /capitalone\.com/i, /citi\.com/i, /usbank\.com/i,
        /ally\.com/i, /sofi\.com/i, /venmo\.com/i, /paypal\.com/i,
        /cash\.app/i, /zelle/i, /mint\.com/i, /ynab\.com/i,
        /creditkarma\.com/i, /nerdwallet\.com/i
      ]
    }
  ];

  // Subcategory definitions for content-aware platforms (X/Twitter, Reddit)
  const SUBCATEGORY_RULES = {
    '𝕏 X / Twitter': [
      { subcategory: 'X - Trading', keywords: ['$', 'stock', 'puts', 'calls', 'options', 'bull', 'bear', 'earnings', 'market', 'portfolio', 'trading', 'ticker', 'rally', 'short', 'long', 'position', 'dividend', 'IPO', 'NASDAQ', 'S&P', 'NYSE', 'forex', 'profit', 'loss', 'pump', 'dump'], minMatches: 2 },
      { subcategory: 'X - Crypto', keywords: ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'blockchain', 'token', 'defi', 'nft', 'web3', 'airdrop', 'memecoin', 'altcoin', 'degen', 'hodl', 'moon', 'rug', 'mint'], minMatches: 2 },
      { subcategory: 'X - AI / Tech', keywords: ['AI', 'GPT', 'LLM', 'model', 'neural', 'machine learning', 'deep learning', 'artificial intelligence', 'openai', 'anthropic', 'gemini', 'claude', 'transformer', 'diffusion', 'AGI', 'compute', 'inference', 'fine-tune', 'embeddings', 'RAG', 'agent'], minMatches: 2 },
      { subcategory: 'X - Sports', keywords: ['game', 'score', 'player', 'team', 'NFL', 'NBA', 'MLB', 'NHL', 'FIFA', 'match', 'league', 'championship', 'playoff', 'touchdown', 'goal', 'roster', 'draft', 'coach', 'season', 'victory', 'defeat', 'finals'], minMatches: 2 },
      { subcategory: 'X - Politics', keywords: ['election', 'vote', 'democrat', 'republican', 'congress', 'senate', 'president', 'governor', 'policy', 'legislation', 'political', 'campaign', 'ballot', 'administration', 'bipartisan'], minMatches: 2 },
      { subcategory: 'X - News', keywords: ['breaking', 'report', 'update', 'according to', 'sources say', 'announced', 'official', 'developing', 'exclusive', 'investigation', 'scandal', 'crisis'], minMatches: 2 },
      { subcategory: 'X - Entertainment', keywords: ['movie', 'film', 'album', 'music', 'concert', 'show', 'series', 'celebrity', 'award', 'grammy', 'oscar', 'box office', 'streaming', 'trailer', 'premiere'], minMatches: 2 },
      { subcategory: 'X - Memes / Humor', keywords: ['lmao', 'lol', 'bruh', 'ratio', 'meme', 'slay', 'vibe', 'mood', 'ong', 'ngl', 'istg', 'crying', 'dead', 'iconic', 'unhinged', 'based', 'cope', 'seethe'], minMatches: 3 }
    ],
    '📱 Reddit': [
      { subcategory: 'Reddit - Trading', keywords: ['$', 'stock', 'calls', 'puts', 'trading', 'gains', 'loss', 'portfolio', 'wsb', 'yolo', 'diamond hands', 'tendies'], minMatches: 2 },
      { subcategory: 'Reddit - Crypto', keywords: ['bitcoin', 'crypto', 'ethereum', 'solana', 'token', 'defi', 'blockchain', 'mining', 'staking', 'hodl'], minMatches: 2 },
      { subcategory: 'Reddit - Tech', keywords: ['programming', 'code', 'developer', 'software', 'react', 'python', 'javascript', 'linux', 'API', 'database', 'framework'], minMatches: 2 },
      { subcategory: 'Reddit - Gaming', keywords: ['game', 'gaming', 'steam', 'xbox', 'playstation', 'nintendo', 'PC', 'fps', 'RPG', 'esports', 'speedrun'], minMatches: 2 },
      { subcategory: 'Reddit - Sports', keywords: ['game', 'score', 'team', 'player', 'season', 'playoff', 'NFL', 'NBA', 'MLB', 'NHL', 'soccer', 'draft'], minMatches: 2 }
    ]
  };

  // Keyword dictionaries for content-based fallback tagging
  const KEYWORD_TAGS = {
    'trading': ['stock', 'stocks', 'trading', 'portfolio', 'market cap', 'bull', 'bear', 'puts', 'calls', 'options', 'ticker', 'dividend', 'earnings', 'IPO', 'S&P', 'NASDAQ', 'NYSE', 'forex', 'hedge fund'],
    'crypto': ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'NFT', 'token', 'web3', 'solana', 'wallet', 'mining', 'staking'],
    'sports': ['game', 'score', 'player', 'team', 'NFL', 'NBA', 'MLB', 'NHL', 'FIFA', 'match', 'league', 'championship', 'playoff', 'touchdown', 'goal', 'roster', 'draft'],
    'tech': ['programming', 'software', 'developer', 'framework', 'API', 'database', 'deploy', 'backend', 'frontend', 'algorithm', 'machine learning', 'neural network'],
    'ai': ['GPT', 'LLM', 'AI', 'artificial intelligence', 'deep learning', 'neural network', 'transformer', 'diffusion', 'fine-tune', 'prompt', 'embeddings'],
    'entertainment': ['movie', 'film', 'music', 'album', 'concert', 'trailer', 'streaming', 'show', 'series', 'episode', 'season', 'review', 'rating'],
    'politics': ['election', 'policy', 'government', 'congress', 'senate', 'president', 'legislation', 'vote', 'democrat', 'republican', 'political'],
    'health': ['health', 'medical', 'doctor', 'treatment', 'symptom', 'diagnosis', 'medicine', 'hospital', 'wellness', 'fitness', 'nutrition', 'diet'],
    'education': ['course', 'tutorial', 'lecture', 'university', 'college', 'syllabus', 'textbook', 'assignment', 'curriculum', 'certification'],
    'research': ['study', 'paper', 'journal', 'abstract', 'methodology', 'hypothesis', 'experiment', 'peer-reviewed', 'citation', 'arxiv'],
    'shopping': ['buy', 'price', 'discount', 'sale', 'coupon', 'shipping', 'cart', 'checkout', 'order', 'deal', 'review']
  };

  /**
   * Categorize a tab by its URL pattern
   */
  function categorizeByUrl(url) {
    if (!url) return null;
    for (const entry of URL_CATEGORIES) {
      for (const pattern of entry.patterns) {
        if (pattern.test(url)) {
          return {
            category: entry.category,
            icon: entry.icon,
            color: entry.color,
            subcategorize: entry.subcategorize || false
          };
        }
      }
    }
    return null;
  }

  /**
   * Determine subcategory based on page content for platforms like X/Twitter
   */
  function getSubcategory(category, title, content) {
    const rules = SUBCATEGORY_RULES[category];
    if (!rules) return null;

    const text = `${title} ${content}`.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const rule of rules) {
      let score = 0;
      for (const keyword of rule.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score++;
        }
      }
      if (score >= rule.minMatches && score > bestScore) {
        bestScore = score;
        bestMatch = rule.subcategory;
      }
    }

    return bestMatch;
  }

  /**
   * Generate keyword-based tags from page content
   */
  function tagByKeywords(text) {
    if (!text || text.length < 20) return [];
    const lowerText = text.toLowerCase();
    const tags = [];

    for (const [tag, keywords] of Object.entries(KEYWORD_TAGS)) {
      let matchCount = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }
      if (matchCount >= 2) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * Full categorization of a tab
   */
  function categorizeTab(tab, pageContent = '', aiTags = []) {
    const urlResult = categorizeByUrl(tab.url);
    const keywordTags = tagByKeywords(pageContent);
    const allTags = [...new Set([...keywordTags, ...aiTags])];

    let category = urlResult ? urlResult.category : '📌 Other';
    let categoryIcon = urlResult ? urlResult.icon : '📌';
    let categoryColor = urlResult ? urlResult.color : '#64748b';

    // Apply subcategorization for content-aware platforms
    if (urlResult && urlResult.subcategorize) {
      const sub = getSubcategory(category, tab.title || '', pageContent);
      if (sub) {
        category = sub;
        // Keep same icon/color but update for subcategory display
      }
    }

    // Summary left empty - only populated by AI tagger when API key is set

    return {
      id: tab.id,
      url: tab.url,
      title: tab.title || 'Untitled',
      favIconUrl: tab.favIconUrl || '',
      category,
      categoryIcon,
      categoryColor,
      tags: allTags,
      summary: '',
      pageContent: pageContent.substring(0, 500),
      savedAt: new Date().toISOString()
    };
  }

  // Export for use in service worker
  globalThis.TabBrainCategorizer = {
    categorizeByUrl, tagByKeywords, categorizeTab, getSubcategory,
    URL_CATEGORIES, KEYWORD_TAGS, SUBCATEGORY_RULES
  };

})());
