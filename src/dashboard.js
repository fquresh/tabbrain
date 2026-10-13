/**
 * TabBrain - Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    let allSessions = [];
    let currentView = 'sessions';

    const searchInput = document.getElementById('searchInput');
    const saveNowBtn = document.getElementById('saveNowBtn');
    const sessionsGrid = document.getElementById('sessionsGrid');
    const emptyDash = document.getElementById('emptyDash');
    const tabsTableBody = document.getElementById('tabsTableBody');
    const categoryFilters = document.getElementById('categoryFilters');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const tagDropdown = document.getElementById('tagDropdown');
    const activeFilters = document.getElementById('activeFilters');
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            views.forEach(v => v.classList.remove('active'));

            currentView = view;
            if (view === 'sessions') {
                document.getElementById('sessionsView').classList.add('active');
                renderSessions();
            } else if (view === 'all-tabs') {
                document.getElementById('allTabsView').classList.add('active');
                renderAllTabs();
            } else if (view === 'insights') {
                document.getElementById('insightsView').classList.add('active');
                renderInsights();
            }
        });
    });

    // Settings nav
    document.getElementById('sidebarSettingsBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/settings.html') });
    });

    // Export sessions
    document.getElementById('exportBtn').addEventListener('click', async () => {
        const response = await chrome.runtime.sendMessage({ type: 'EXPORT_SESSIONS' });
        if (response?.success) {
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tabbrain-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    });

    // Import sessions
    const importFileInput = document.getElementById('importFileInput');
    document.getElementById('importBtn').addEventListener('click', () => {
        importFileInput.click();
    });
    importFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            const response = await chrome.runtime.sendMessage({ type: 'IMPORT_SESSIONS', importData });

            if (response?.success) {
                const { importedCount, skippedCount } = response.data;
                alert(`Imported ${importedCount} session(s). ${skippedCount} duplicate(s) skipped.`);
                await loadSessions();
                renderAllTabs();
            } else {
                alert('Import failed: ' + (response?.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Invalid file: ' + err.message);
        }
        importFileInput.value = ''; // Reset
    });

    // Save current tabs
    saveNowBtn.addEventListener('click', async () => {
        saveNowBtn.disabled = true;
        saveNowBtn.innerHTML = '<div class="mini-spinner"></div> Saving...';

        const response = await chrome.runtime.sendMessage({ type: 'SAVE_TABS' });
        if (response?.success) {
            await loadSessions();
        }

        saveNowBtn.disabled = false;
        saveNowBtn.innerHTML = 'Save Current Tabs';
    });

    // Search
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        if (currentView === 'sessions') renderSessions(query);
        else if (currentView === 'all-tabs') renderAllTabs(query);
    });

    // Dropdown filters
    if (categoryDropdown) {
        categoryDropdown.addEventListener('change', () => {
            renderAllTabs(searchInput.value.toLowerCase().trim());
        });
    }
    if (tagDropdown) {
        tagDropdown.addEventListener('change', () => {
            renderAllTabs(searchInput.value.toLowerCase().trim());
        });
    }

    // Load sessions
    async function loadSessions() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });
        allSessions = response?.data || [];
        renderSessions();
        buildCategoryFilters();
        buildTagFilters();

        // Check URL param for specific session
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session');
        if (sessionId) {
            const session = allSessions.find(s => s.id === sessionId);
            if (session) expandSession(session);
        }
    }

    function renderSessions(query = '') {
        let sessions = allSessions;

        if (query) {
            sessions = sessions.filter(s => {
                return s.allTabs.some(t =>
                    t.title.toLowerCase().includes(query) ||
                    t.url.toLowerCase().includes(query) ||
                    t.tags.some(tag => tag.toLowerCase().includes(query)) ||
                    t.category.toLowerCase().includes(query)
                );
            });
        }

        if (sessions.length === 0) {
            sessionsGrid.innerHTML = '';
            emptyDash.style.display = 'flex';
            sessionsGrid.appendChild(emptyDash);
            return;
        }

        emptyDash.style.display = 'none';
        sessionsGrid.innerHTML = '';

        for (const session of sessions) {
            const card = document.createElement('div');
            card.className = 'session-card';

            const date = new Date(session.savedAt);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            const sortedCats = Object.values(session.categories)
                .sort((a, b) => b.tabs.length - a.tabs.length);

            const categoryBadges = sortedCats.slice(0, 4).map(c =>
                `<span class="cat-badge" style="background:${safeColor(c.color)}18;color:${safeColor(c.color)};border:1px solid ${safeColor(c.color)}30">${escapeHtml(c.icon)} ${c.tabs.length}</span>`
            ).join('');

            // Get all tags from this session
            const sessionTags = [...new Set(session.allTabs.flatMap(t => t.tags))].slice(0, 6);
            const tagBadges = sessionTags.map(t => `<span class="dash-tag">${escapeHtml(t)}</span>`).join('');

            card.innerHTML = `
        <div class="card-header">
          <div class="card-datetime">
            <span class="card-date">${dateStr}</span>
            <span class="card-time">${timeStr}</span>
          </div>
          <div class="card-actions">
            <button class="card-btn open-all" title="Open all tabs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>
            <button class="card-btn delete-session" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="card-stats">
          <span class="stat-number">${session.tabCount}</span>
          <span class="stat-label">tabs in ${session.categoryCount} ${session.categoryCount === 1 ? 'category' : 'categories'}</span>
          ${session.aiTagged ? '<span class="ai-pill">AI ✓</span>' : ''}
        </div>
        <div class="card-categories">${categoryBadges}</div>
        ${tagBadges ? `<div class="card-tags">${tagBadges}</div>` : ''}
        <div class="card-expand">
          <button class="expand-btn">View tabs →</button>
        </div>
      `;

            // Event listeners
            card.querySelector('.open-all').addEventListener('click', (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({ type: 'OPEN_SESSION', sessionId: session.id });
            });

            card.querySelector('.delete-session').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this session?')) {
                    await chrome.runtime.sendMessage({ type: 'DELETE_SESSION', sessionId: session.id });
                    await loadSessions();
                }
            });

            card.querySelector('.expand-btn').addEventListener('click', () => expandSession(session));

            sessionsGrid.appendChild(card);
        }
    }

    function expandSession(session) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'session-modal-overlay';

        const sortedCats = Object.values(session.categories)
            .sort((a, b) => b.tabs.length - a.tabs.length);

        let categoriesHTML = '';
        for (const cat of sortedCats) {
            const tabsHTML = cat.tabs.map(tab => `
        <a class="modal-tab" href="${escapeHtml(tab.url)}" target="_blank">
          <img src="${safeSrc(tab.favIconUrl)}" class="modal-tab-icon" data-fallback>
          <div class="modal-tab-info">
            <span class="modal-tab-title">${escapeHtml(tab.title)}</span>
            <span class="modal-tab-url">${escapeHtml(new URL(tab.url).hostname)}</span>
            ${tab.summary ? `<span class="modal-tab-summary">${escapeHtml(tab.summary)}</span>` : ''}
          </div>
          ${tab.tags.length ? `<div class="modal-tab-tags">${tab.tags.map(t => `<span class="dash-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </a>
      `).join('');

            categoriesHTML += `
        <div class="modal-category">
          <div class="modal-cat-header" style="border-left: 3px solid ${safeColor(cat.color)}">
            <span>${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}</span>
            <div class="modal-cat-actions">
              <span class="modal-cat-count">${cat.tabs.length} tabs</span>
              <button class="open-cat-btn" data-category="${escapeHtml(cat.name)}" data-session="${escapeHtml(session.id)}">Open all ↗</button>
            </div>
          </div>
          <div class="modal-tabs">${tabsHTML}</div>
        </div>
      `;
        }

        const date = new Date(session.savedAt);

        overlay.innerHTML = `
      <div class="session-modal">
        <div class="modal-header">
          <div>
            <h2>Session - ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
            <p class="modal-subtitle">${session.tabCount} tabs • ${session.categoryCount} categories${session.aiTagged ? ' • AI tagged' : ''}</p>
          </div>
          <button class="modal-close" id="modalClose">✕</button>
        </div>
        <div class="modal-body">${categoriesHTML}</div>
      </div>
    `;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        overlay.querySelector('#modalClose').addEventListener('click', () => overlay.remove());

        // Open category buttons
        overlay.querySelectorAll('.open-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'OPEN_SESSION',
                    sessionId: btn.dataset.session,
                    category: btn.dataset.category
                });
            });
        });

        document.body.appendChild(overlay);
    }

    function renderAllTabs(query = '') {
        const allTabs = [];
        for (const session of allSessions) {
            for (const tab of session.allTabs) {
                allTabs.push({ ...tab, sessionDate: session.savedAt });
            }
        }

        const selectedCategory = categoryDropdown ? categoryDropdown.value : '';
        const selectedTag = tagDropdown ? tagDropdown.value : '';

        let filtered = allTabs;

        // Text search
        if (query) {
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.url.toLowerCase().includes(query) ||
                t.tags.some(tag => tag.toLowerCase().includes(query)) ||
                t.category.toLowerCase().includes(query)
            );
        }

        // Category dropdown filter
        if (selectedCategory) {
            filtered = filtered.filter(t => t.category === selectedCategory);
        }

        // Tag dropdown filter
        if (selectedTag) {
            filtered = filtered.filter(t => t.tags.includes(selectedTag));
        }

        // Show active filters
        updateActiveFilters(selectedCategory, selectedTag, filtered.length, allTabs.length);

        tabsTableBody.innerHTML = '';
        if (filtered.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" class="empty-table">No tabs match your filters</td>`;
            tabsTableBody.appendChild(row);
            return;
        }
        for (const tab of filtered.slice(0, 200)) {
            const row = document.createElement('tr');
            const date = new Date(tab.sessionDate || tab.savedAt);
            row.innerHTML = `
        <td><img src="${safeSrc(tab.favIconUrl)}" class="table-favicon" data-fallback></td>
        <td>
          <a href="${escapeHtml(tab.url)}" target="_blank" class="table-title" title="${escapeHtml(tab.summary || tab.title)}">${escapeHtml(tab.title)}</a>
          ${tab.summary ? `<span class="table-summary">${escapeHtml(tab.summary)}</span>` : ''}
        </td>
        <td><span class="table-cat" style="color:${safeColor(tab.categoryColor)}">${escapeHtml(tab.categoryIcon)} ${escapeHtml(tab.category)}</span></td>
        <td>${tab.tags.map(t => `<span class="dash-tag">${escapeHtml(t)}</span>`).join(' ')}</td>
        <td class="table-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td class="table-actions">
          <a href="${escapeHtml(tab.url)}" target="_blank" class="table-open" title="Open">↗</a>
          <button class="table-delete" title="Delete" data-url="${escapeHtml(tab.url)}">🗑</button>
        </td>
      `;
            tabsTableBody.appendChild(row);
        }

        // Wire up delete buttons
        tabsTableBody.querySelectorAll('.table-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const url = btn.dataset.url;
                const row = btn.closest('tr');
                row.style.opacity = '0.3';
                const resp = await chrome.runtime.sendMessage({ type: 'DELETE_TAB', tabUrl: url });
                if (resp?.success) {
                    row.remove();
                    await loadSessions();
                    buildCategoryFilters();
                    buildTagFilters();
                }
            });
        });
    }

    function updateActiveFilters(category, tag, shown, total) {
        if (!activeFilters) return;
        if (!category && !tag) {
            activeFilters.innerHTML = `<span class="filter-count">${total} tabs</span>`;
            return;
        }
        let html = `<span class="filter-count">${shown} of ${total} tabs</span>`;
        if (category) {
            html += `<button class="active-filter-chip" data-clear="category">${escapeHtml(category)} ✕</button>`;
        }
        if (tag) {
            html += `<button class="active-filter-chip" data-clear="tag">${escapeHtml(tag)} ✕</button>`;
        }
        activeFilters.innerHTML = html;
        activeFilters.querySelectorAll('.active-filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.clear === 'category') categoryDropdown.value = '';
                if (btn.dataset.clear === 'tag') tagDropdown.value = '';
                renderAllTabs(searchInput.value.toLowerCase().trim());
            });
        });
    }

    function buildCategoryFilters() {
        const catCounts = {};
        for (const session of allSessions) {
            for (const tab of session.allTabs) {
                catCounts[tab.category] = (catCounts[tab.category] || 0) + 1;
            }
        }
        const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

        // Populate session view chips
        categoryFilters.innerHTML = sorted.slice(0, 8).map(([cat, count]) =>
            `<button class="filter-chip" data-category="${escapeHtml(cat)}">${escapeHtml(cat)} (${count})</button>`
        ).join('');
        categoryFilters.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                searchInput.value = chip.dataset.category;
                searchInput.dispatchEvent(new Event('input'));
            });
        });

        // Populate category dropdown
        if (categoryDropdown) {
            const current = categoryDropdown.value;
            categoryDropdown.innerHTML = '<option value="">All Categories</option>';
            for (const [cat, count] of sorted) {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = `${cat} (${count})`;
                categoryDropdown.appendChild(opt);
            }
            categoryDropdown.value = current;
        }
    }

    function buildTagFilters() {
        const tagCounts = {};
        for (const session of allSessions) {
            for (const tab of session.allTabs) {
                for (const tag of tab.tags) {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
            }
        }
        const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

        // Populate tag dropdown
        if (tagDropdown) {
            const current = tagDropdown.value;
            tagDropdown.innerHTML = '<option value="">All Tags</option>';
            for (const [tag, count] of sorted) {
                const opt = document.createElement('option');
                opt.value = tag;
                opt.textContent = `${tag} (${count})`;
                tagDropdown.appendChild(opt);
            }
            tagDropdown.value = current;
        }
    }

    function renderInsights() {
        const totalTabs = allSessions.reduce((sum, s) => sum + s.tabCount, 0);
        document.getElementById('totalTabsSaved').textContent = totalTabs;
        document.getElementById('totalSessions').textContent = allSessions.length;

        // Category breakdown
        const catCounts = {};
        const catColors = {};
        for (const session of allSessions) {
            for (const tab of session.allTabs) {
                catCounts[tab.category] = (catCounts[tab.category] || 0) + 1;
                catColors[tab.category] = tab.categoryColor;
            }
        }

        const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
        if (sortedCats.length > 0) {
            document.getElementById('topCategory').textContent = sortedCats[0][0];
        }

        const barsEl = document.getElementById('breakdownBars');
        const maxCount = sortedCats.length > 0 ? sortedCats[0][1] : 1;
        barsEl.innerHTML = sortedCats.map(([cat, count]) => {
            const pct = Math.round((count / maxCount) * 100);
            const color = catColors[cat] || '#64748b';
            return `
        <div class="breakdown-row">
          <span class="breakdown-label">${escapeHtml(cat)}</span>
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar-fill" style="width:${pct}%;background:${safeColor(color)}"></div>
          </div>
          <span class="breakdown-count">${count}</span>
        </div>
      `;
        }).join('');

        // Tag cloud
        const tagCounts = {};
        for (const session of allSessions) {
            for (const tab of session.allTabs) {
                for (const tag of tab.tags) {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
            }
        }
        const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
        if (sortedTags.length > 0) {
            document.getElementById('topTag').textContent = sortedTags[0][0];
        }

        const tagCloud = document.getElementById('tagCloud');
        const maxTag = sortedTags.length > 0 ? sortedTags[0][1] : 1;
        tagCloud.innerHTML = sortedTags.slice(0, 30).map(([tag, count]) => {
            const size = 12 + Math.round((count / maxTag) * 16);
            const opacity = 0.5 + (count / maxTag) * 0.5;
            return `<span class="cloud-tag" style="font-size:${size}px;opacity:${opacity}">${escapeHtml(tag)}</span>`;
        }).join('');
    }

    // Escapes text for both element content and quoted attribute values
    function escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safeColor(color) {
        return /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color || '') ? color : '#64748b';
    }

    // Favicons may only load over http(s) or as inline data images
    function safeSrc(url) {
        return /^(https?:|data:image\/)/i.test(url || '') ? escapeHtml(url) : '';
    }

    // CSP-safe image error handling (replaces inline onerror)
    function setupFallbackImages(container) {
        const imgs = (container || document).querySelectorAll('img[data-fallback]');
        imgs.forEach(img => {
            img.addEventListener('error', () => { img.style.display = 'none'; });
        });
    }

    // Observe DOM changes to auto-setup fallback images
    const observer = new MutationObserver(() => setupFallbackImages());
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial load
    await loadSessions();
    renderAllTabs();
    setupFallbackImages();
});
