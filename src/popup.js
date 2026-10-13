/**
 * TabBrain — Popup Logic
 */

const LinkFormat = globalThis.TabBrainLinkFormat;

document.addEventListener('DOMContentLoaded', async () => {
    const $ = id => document.getElementById(id);
    const copyBtn = $('copyBtn');
    const copyLabel = $('copyLabel');
    const copyWindowBtn = $('copyWindowBtn');
    const formatPicker = $('formatPicker');
    const saveBtn = $('saveBtn');
    const saveLabel = $('saveLabel');

    let selectedTabs = [];
    let windowTabs = [];
    let currentFormat = LinkFormat.DEFAULT_FORMAT;
    let copyLabelText = 'Copy link';

    $('settingsBtn').addEventListener('click', () => openPage('src/settings.html'));
    $('dashboardBtn').addEventListener('click', () => openPage('src/dashboard.html'));

    // ── Selected tabs ──────────────────────────────────────

    const [highlighted, inWindow, stored] = await Promise.all([
        chrome.tabs.query({ currentWindow: true, highlighted: true }),
        chrome.tabs.query({ currentWindow: true }),
        chrome.storage.local.get('copyFormat')
    ]);
    selectedTabs = highlighted.filter(t => LinkFormat.tabUrl(t));
    windowTabs = inWindow.filter(t => LinkFormat.tabUrl(t));
    if (LinkFormat.FORMATS[stored.copyFormat]) currentFormat = stored.copyFormat;

    renderFormatPicker();
    renderSelection();

    copyBtn.addEventListener('click', () => copyTabs(selectedTabs, copyBtn));
    copyWindowBtn.addEventListener('click', () => copyTabs(windowTabs, copyWindowBtn));

    document.addEventListener('keydown', (e) => {
        const typing = e.target.closest('input, textarea');
        if (typing) return;
        const mod = e.metaKey || e.ctrlKey;
        if (e.key === 'Enter' && document.activeElement === document.body) {
            e.preventDefault();
            copyBtn.click();
        } else if (mod && e.key.toLowerCase() === 'c' && !window.getSelection().toString()) {
            e.preventDefault();
            copyBtn.click();
        } else if (!mod && ['1', '2', '3'].includes(e.key)) {
            setFormat(Object.keys(LinkFormat.FORMATS)[Number(e.key) - 1]);
        }
    });

    function renderFormatPicker() {
        formatPicker.innerHTML = '';
        Object.entries(LinkFormat.FORMATS).forEach(([key, def], i) => {
            const btn = document.createElement('button');
            btn.className = 'segment';
            btn.type = 'button';
            btn.setAttribute('role', 'radio');
            btn.dataset.format = key;
            btn.title = `${def.label} (${i + 1})`;
            btn.textContent = def.label;
            btn.addEventListener('click', () => setFormat(key));
            formatPicker.appendChild(btn);
        });
        syncFormatPicker();
    }

    function syncFormatPicker() {
        for (const btn of formatPicker.children) {
            const on = btn.dataset.format === currentFormat;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-checked', String(on));
        }
    }

    function setFormat(key) {
        if (!LinkFormat.FORMATS[key] || key === currentFormat) return;
        currentFormat = key;
        syncFormatPicker();
        chrome.storage.local.set({ copyFormat: key });
    }

    function renderSelection() {
        const count = selectedTabs.length;
        const multi = count > 1;

        $('selEyebrow').textContent = multi ? 'Selected tabs' : 'Current tab';
        $('selTitle').textContent = multi ? `${count} tabs` : (count ? hostOf(selectedTabs[0]) : 'No tab');
        copyLabelText = multi ? `Copy ${count} links` : 'Copy link';
        copyLabel.textContent = copyLabelText;
        copyBtn.disabled = count === 0;
        $('selHint').hidden = multi;

        // Favicon stack (first 4)
        const stack = $('favStack');
        stack.innerHTML = '';
        for (const tab of selectedTabs.slice(0, 4)) stack.appendChild(favicon(tab));
        if (count > 4) {
            const more = document.createElement('span');
            more.className = 'fav fav-more';
            more.textContent = `+${count - 4}`;
            stack.appendChild(more);
        }

        // Selected tab list
        const list = $('selList');
        list.innerHTML = '';
        for (const tab of selectedTabs) {
            const li = document.createElement('li');
            li.className = 'sel-item';
            li.title = LinkFormat.tabUrl(tab);
            li.append(favicon(tab));
            const text = document.createElement('div');
            text.className = 'sel-text';
            text.innerHTML = `<span class="sel-title"></span><span class="sel-host"></span>`;
            text.firstChild.textContent = LinkFormat.tabTitle(tab);
            text.lastChild.textContent = hostOf(tab);
            li.append(text);
            list.appendChild(li);
        }

        const others = windowTabs.length;
        copyWindowBtn.hidden = others <= count;
        copyWindowBtn.textContent = `Copy all ${others} tabs in this window`;
    }

    async function copyTabs(tabs, sourceBtn) {
        if (!tabs.length) return;
        const text = LinkFormat.formatLinks(tabs, currentFormat);
        try {
            await writeClipboard(text);
        } catch (err) {
            toast(`Could not copy: ${err.message}`, 'error');
            return;
        }
        const n = tabs.length;
        flashCopied(sourceBtn);
        toast(`Copied ${n} ${n === 1 ? 'link' : 'links'} as ${LinkFormat.FORMATS[currentFormat].label}`);
    }

    async function writeClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Fallback for when the async clipboard API is unavailable
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            if (!ok) throw new Error('clipboard unavailable');
        }
    }

    function flashCopied(btn) {
        if (btn !== copyBtn) return;
        const icon = copyBtn.querySelector('use');
        copyBtn.classList.add('copied');
        icon.setAttribute('href', '#i-check');
        copyLabel.textContent = 'Copied';
        clearTimeout(flashCopied.timer);
        flashCopied.timer = setTimeout(() => {
            copyBtn.classList.remove('copied');
            icon.setAttribute('href', '#i-copy');
            copyLabel.textContent = copyLabelText;
        }, 1400);
    }

    // ── AI status ──────────────────────────────────────────

    const settingsRes = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = settingsRes?.data || {};
    const aiOn = !!settings.apiKey && settings.aiEnabled !== false;
    $('aiStatus').classList.toggle('on', aiOn);
    $('aiStatusText').textContent = aiOn ? 'AI tags on' : 'URL categories';
    $('aiStatus').title = aiOn
        ? 'Gemini adds tags and summaries when you save'
        : 'Add a Gemini API key in Settings to turn on AI tags';

    // ── Save session ───────────────────────────────────────

    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.classList.add('busy');
        saveLabel.textContent = 'Saving…';

        try {
            const response = await chrome.runtime.sendMessage({ type: 'SAVE_TABS' });
            if (!response?.success) throw new Error(response?.error || 'Failed to save tabs');
            const data = response.data;
            if (data.allDuplicates) {
                toast(`All tabs are already saved (${data.duplicatesSkipped} skipped)`);
            } else {
                if (data.duplicatesSkipped > 0) {
                    toast(`Saved ${data.tabCount} tabs, ${data.duplicatesSkipped} duplicates skipped`);
                }
                showResults(data);
                loadSessions();
            }
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.classList.remove('busy');
            saveLabel.textContent = 'Save all tabs';
        }
    });

    function showResults(session) {
        $('results').hidden = false;
        $('tabCount').textContent = `${plural(session.tabCount, 'tab')} · ${plural(session.categoryCount, 'category', 'categories')}`;

        const list = $('categoryList');
        list.innerHTML = '';
        const sorted = Object.values(session.categories).sort((a, b) => b.tabs.length - a.tabs.length);

        for (const cat of sorted) {
            const row = document.createElement('div');
            row.className = 'category';
            row.innerHTML = `
                <button class="category-row" type="button">
                    <span class="cat-dot" style="background:${safeColor(cat.color)}"></span>
                    <span class="cat-name">${escapeHtml(cat.name)}</span>
                    <span class="cat-count">${cat.tabs.length}</span>
                </button>`;
            row.querySelector('.category-row').addEventListener('click', () => toggleCategory(row, cat));
            list.appendChild(row);
        }
    }

    function toggleCategory(row, cat) {
        const open = row.querySelector('.category-tabs');
        if (open) {
            open.remove();
            row.classList.remove('open');
            return;
        }
        row.classList.add('open');
        const tabsEl = document.createElement('div');
        tabsEl.className = 'category-tabs';
        for (const tab of cat.tabs) {
            const link = document.createElement('a');
            link.className = 'tab-link';
            link.href = tab.url;
            link.title = tab.summary || tab.url;
            link.append(favicon(tab));
            const details = document.createElement('div');
            details.className = 'tab-details';
            details.innerHTML = `
                <span class="tab-title">${escapeHtml(tab.title)}</span>
                ${tab.tags?.length ? `<span class="tab-tags">${tab.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</span>` : ''}`;
            link.append(details);
            link.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.tabs.create({ url: tab.url });
            });
            tabsEl.appendChild(link);
        }
        row.appendChild(tabsEl);
    }

    // ── Recent sessions ────────────────────────────────────

    loadSessions();

    async function loadSessions() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });
        const sessions = response?.data || [];
        const list = $('sessionsList');

        list.innerHTML = '';
        $('emptyState').hidden = sessions.length > 0;

        for (const session of sessions.slice(0, 5)) {
            const top = Object.values(session.categories)
                .sort((a, b) => b.tabs.length - a.tabs.length)
                .slice(0, 3);

            const el = document.createElement('div');
            el.className = 'session';
            el.tabIndex = 0;
            el.innerHTML = `
                <div class="session-main">
                    <div class="session-line">
                        <span class="session-time">${formatTimeAgo(new Date(session.savedAt))}</span>
                        <span class="session-count">${session.tabCount} tabs</span>
                    </div>
                    <div class="session-cats">
                        ${top.map(c => `<span class="session-cat"><span class="cat-dot" style="background:${safeColor(c.color)}"></span>${escapeHtml(c.name)}</span>`).join('')}
                    </div>
                </div>
                <div class="session-actions">
                    <button class="icon-btn sm" data-act="open" title="Reopen all tabs" aria-label="Reopen all tabs"><svg><use href="#i-restore"/></svg></button>
                    <button class="icon-btn sm danger" data-act="delete" title="Delete session" aria-label="Delete session"><svg><use href="#i-trash"/></svg></button>
                </div>`;

            el.querySelector('[data-act="open"]').addEventListener('click', (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({ type: 'OPEN_SESSION', sessionId: session.id });
            });
            el.querySelector('[data-act="delete"]').addEventListener('click', async (e) => {
                e.stopPropagation();
                await chrome.runtime.sendMessage({ type: 'DELETE_SESSION', sessionId: session.id });
                loadSessions();
            });
            const openInDashboard = () => openPage(`src/dashboard.html?session=${session.id}`);
            el.addEventListener('click', openInDashboard);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target === el) {
                    e.stopPropagation();
                    openInDashboard();
                }
            });

            list.appendChild(el);
        }
    }

    // ── Helpers ────────────────────────────────────────────

    function openPage(path) {
        chrome.tabs.create({ url: chrome.runtime.getURL(path) });
    }

    function favicon(tab) {
        const wrap = document.createElement('span');
        wrap.className = 'fav';
        const letter = (hostOf(tab)[0] || '•').toUpperCase();
        const src = tab.favIconUrl;
        if (src && /^(https?:|data:)/.test(src)) {
            const img = document.createElement('img');
            img.src = src;
            img.alt = '';
            img.addEventListener('error', () => { wrap.textContent = letter; img.remove(); });
            wrap.appendChild(img);
        } else {
            wrap.textContent = letter;
        }
        return wrap;
    }

    function hostOf(tab) {
        const url = LinkFormat.tabUrl(tab);
        try {
            const u = new URL(url);
            return u.hostname.replace(/^www\./, '') || u.protocol.replace(':', '');
        } catch {
            return url;
        }
    }

    function toast(msg, kind = 'info') {
        const el = $('toast');
        el.textContent = msg;
        el.className = `toast show ${kind}`;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
    }

    function formatTimeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    function plural(n, one, many = `${one}s`) {
        return `${n} ${n === 1 ? one : many}`;
    }

    function safeColor(color) {
        return /^#[0-9a-f]{3,8}$/i.test(color || '') ? color : '#6b6b74';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }
});
