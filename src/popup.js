/**
 * TabBrain — Popup Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const saveBtn = document.getElementById('saveBtn');
    const saveBtnText = saveBtn.querySelector('.save-btn-text');
    const saveBtnIcon = saveBtn.querySelector('.save-btn-icon');
    const saveLoading = document.getElementById('saveLoading');
    const results = document.getElementById('results');
    const categoryList = document.getElementById('categoryList');
    const tabCount = document.getElementById('tabCount');
    const sessionsList = document.getElementById('sessionsList');
    const emptyState = document.getElementById('emptyState');
    const settingsBtn = document.getElementById('settingsBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const aiStatus = document.getElementById('aiStatus');
    const aiDot = document.getElementById('aiDot');
    const aiStatusText = document.getElementById('aiStatusText');

    // Check AI status
    const settingsData = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = settingsData?.data || {};
    if (settings.apiKey) {
        aiDot.classList.add('active');
        aiStatusText.textContent = 'AI tagging active';
    } else {
        aiDot.classList.add('inactive');
        aiStatusText.textContent = 'No API key — using URL categories only';
    }

    // Load recent sessions
    loadSessions();

    // Save button
    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtnText.style.display = 'none';
        saveBtnIcon.style.display = 'none';
        saveLoading.style.display = 'flex';
        saveBtn.classList.add('saving');

        try {
            const response = await chrome.runtime.sendMessage({ type: 'SAVE_TABS' });
            if (response?.success) {
                const data = response.data;
                if (data.allDuplicates) {
                    showInfo(`All tabs already saved! (${data.duplicatesSkipped} duplicates skipped)`);
                } else {
                    if (data.duplicatesSkipped > 0) {
                        showInfo(`${data.duplicatesSkipped} duplicate tab${data.duplicatesSkipped > 1 ? 's' : ''} skipped`);
                    }
                    showResults(data);
                    loadSessions();
                }
            } else {
                showError(response?.error || 'Failed to save tabs');
            }
        } catch (err) {
            showError(err.message);
        } finally {
            saveBtn.disabled = false;
            saveBtnText.style.display = '';
            saveBtnIcon.style.display = '';
            saveLoading.style.display = 'none';
            saveBtn.classList.remove('saving');
        }
    });

    // Settings button
    settingsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/settings.html') });
    });

    // Dashboard button
    dashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard.html') });
    });

    function showResults(session) {
        results.style.display = 'block';
        tabCount.textContent = `${session.tabCount} tabs in ${session.categoryCount} categories`;

        categoryList.innerHTML = '';
        const sortedCategories = Object.values(session.categories)
            .sort((a, b) => b.tabs.length - a.tabs.length);

        for (const cat of sortedCategories) {
            const el = document.createElement('div');
            el.className = 'category-item';
            el.innerHTML = `
        <div class="category-info">
          <span class="category-icon">${cat.icon}</span>
          <span class="category-name">${cat.name}</span>
        </div>
        <span class="category-count" style="background:${cat.color}22;color:${cat.color}">${cat.tabs.length}</span>
      `;
            el.addEventListener('click', () => {
                // Expand to show tabs
                const expanded = el.querySelector('.category-tabs');
                if (expanded) {
                    expanded.remove();
                    return;
                }
                const tabsEl = document.createElement('div');
                tabsEl.className = 'category-tabs';
                for (const tab of cat.tabs) {
                    const tabEl = document.createElement('a');
                    tabEl.className = 'tab-link';
                    tabEl.href = tab.url;
                    tabEl.target = '_blank';
                    tabEl.innerHTML = `
            <img src="${tab.favIconUrl || ''}" class="tab-favicon" data-fallback>
            <div class="tab-details">
              <span class="tab-title">${escapeHtml(tab.title)}</span>
              ${tab.tags.length ? `<div class="tab-tags">${tab.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
            </div>
            ${tab.summary ? `<div class="tab-tooltip">${escapeHtml(tab.summary)}</div>` : ''}
          `;
                    // CSP-safe error handler for favicon
                    const img = tabEl.querySelector('img');
                    if (img) img.addEventListener('error', () => { img.style.display = 'none'; });
                    tabEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        chrome.tabs.create({ url: tab.url });
                    });
                    tabsEl.appendChild(tabEl);
                }
                el.appendChild(tabsEl);
            });
            categoryList.appendChild(el);
        }

        // Animate in
        results.classList.add('show');
    }

    async function loadSessions() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });
        const sessions = response?.data || [];

        if (sessions.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        sessionsList.innerHTML = '';

        // Show last 5 sessions
        for (const session of sessions.slice(0, 5)) {
            const el = document.createElement('div');
            el.className = 'session-item';
            const date = new Date(session.savedAt);
            const timeStr = formatTimeAgo(date);
            const topCategories = Object.values(session.categories)
                .sort((a, b) => b.tabs.length - a.tabs.length)
                .slice(0, 3)
                .map(c => c.icon)
                .join(' ');

            el.innerHTML = `
        <div class="session-info">
          <div class="session-meta">
            <span class="session-time">${timeStr}</span>
            <span class="session-tabs">${session.tabCount} tabs</span>
          </div>
          <div class="session-categories">${topCategories}</div>
        </div>
        <div class="session-actions">
          <button class="session-open" title="Open all tabs">↗</button>
          <button class="session-delete" title="Delete session">✕</button>
        </div>
      `;

            el.querySelector('.session-open').addEventListener('click', (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({ type: 'OPEN_SESSION', sessionId: session.id });
            });

            el.querySelector('.session-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                await chrome.runtime.sendMessage({ type: 'DELETE_SESSION', sessionId: session.id });
                loadSessions();
            });

            el.addEventListener('click', () => {
                chrome.tabs.create({ url: chrome.runtime.getURL(`src/dashboard.html?session=${session.id}`) });
            });

            sessionsList.appendChild(el);
        }
    }

    function showError(msg) {
        const el = document.createElement('div');
        el.className = 'error-msg';
        el.textContent = `Error: ${msg}`;
        document.querySelector('.popup').appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function showInfo(msg) {
        const el = document.createElement('div');
        el.className = 'info-msg';
        el.textContent = msg;
        document.querySelector('.popup').appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function formatTimeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
