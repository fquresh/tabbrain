# 🧠 TabBrain

**Save, categorize, and AI-tag all your browser tabs with one click.** Built for focus.

A Chrome extension that captures your open tabs, organizes them into smart categories, and optionally uses AI to generate rich tags — all stored locally with a full dashboard for browsing, filtering, and exporting.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34d399)

---

## ✨ Features

### One-Click Save
Click **Save All Tabs** to capture every open tab instantly. Duplicates are automatically skipped.

### Smart Categorization
- **24 URL-based categories** — LLM/AI, Trading, Social, Dev Tools, Articles, and more
- **Content-aware subcategories** for X/Twitter and Reddit (e.g., "X - Trading", "X - AI/Tech", "Reddit - Crypto")
- Keyword-based fallback tagging when AI isn't available

### AI-Powered Tags *(Optional)*
- Connect a **Gemini Flash** API key for intelligent multi-tagging
- AI analyzes page content and generates specific tags (e.g., "$TSLA", "react hooks", "nba trade rumors")
- AI-generated summaries for hover tooltips
- Nearly free — Gemini Flash offers 1M tokens/day free

### Dashboard
- **Sessions view** — browse saved sessions as cards, expand to see all tabs
- **All Tabs view** — searchable table with category & tag dropdown filters, individual delete
- **Insights view** — category breakdown, tag cloud, stats
- Export/Import sessions as JSON for cross-device transfer

### ADHD-Friendly Design
- Dark mode UI with rich purple accents
- Clear visual hierarchy with color-coded categories
- Minimal clicks, maximum organization

---

## 📦 Installation

### From Source (Developer Mode)

1. Clone the repo:
   ```bash
   git clone https://github.com/fquresh/tabbrain.git
   ```
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select the cloned folder
5. Pin TabBrain to your toolbar

### AI Setup *(Optional)*

1. Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click the ⚙️ icon in the TabBrain popup
3. Paste your key and save

---

## 🗂 Project Structure

```
├── manifest.json          # Chrome Manifest V3 config
├── icons/                 # Extension icons (16/48/128px)
└── src/
    ├── background.js      # Service worker — orchestrates saving pipeline
    ├── categorizer.js     # 24 URL categories + content subcategorization
    ├── ai-tagger.js       # Gemini Flash API integration
    ├── content.js         # Content script — extracts page text
    ├── popup.html/js/css  # Extension popup UI
    ├── dashboard.html/js/css  # Full-page dashboard
    └── settings.html/js/css   # API key configuration
```

---

## 🔒 Privacy

- **All data stored locally** via `chrome.storage.local`
- No external servers, no tracking, no analytics
- API key is only sent to the Gemini API endpoint (if you choose to enable AI)
- Export files stay on your device

---

## 📄 License

MIT
