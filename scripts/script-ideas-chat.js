document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('chat-wrap');
    const titleEl = document.getElementById('chat-title');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const sporeBtn = document.getElementById('spore-btn');
    const inputbar = document.getElementById('chat-inputbar');
    const baseInnerHeight = window.innerHeight;
    let keyboardOffset = 0;
    let keyboardRaf = 0;
    let inputbarHeight = 0;

    const nameMap = {
        wholesale: 'AAA菌菇松茸批发',
        mushroom: '灵感菇^ ^',
        storm: '蘑古力酱O.o',
        confusing: '迷惑菇-.-',
        night: '夜行菇'
    };

    const params = new URLSearchParams(window.location.search);
    const cid = params.get('cid') || 'mushroom';
    const sporeEnabled = cid === 'mushroom' || cid === 'confusing' || cid === 'storm';
    if (sporeBtn) sporeBtn.hidden = !sporeEnabled;
    const shortcutToken = '更快捷的方式！';
    const shortcutHref = '更快捷的方式！.html';

    const state = window.StorageAPI.getNotifyState();
    if (!state.conversations) state.conversations = {};
    if (!state.conversations[cid]) state.conversations[cid] = { id: cid, title: '聊天', unread: false, messages: [] };
    const conv = state.conversations[cid];

    titleEl.textContent = nameMap[cid] || conv.title || '聊天';

    conv.unread = false;
    const hasUnread = Object.values(state.conversations || {}).some((c) => c && c.unread);
    if (!state.unread) state.unread = { messages: false };
    state.unread.messages = hasUnread;
    window.StorageAPI.setNotifyState(state);

    function formatTimestamp(ts) {
        const d = new Date(ts);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const diffDays = Math.round((today - dayStart) / 86400000);
        const HH = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        if (diffDays === 0) return `${HH}:${mm}`;
        if (diffDays === 1) return `昨日 ${HH}:${mm}`;
        const M = String(d.getMonth() + 1);
        const D = String(d.getDate());
        const H = String(d.getHours());
        return `${M}-${D} ${H}:${mm}`;
    }

    function normalizeMessage(m) {
        const text = m && typeof m.text === 'string' ? m.text : '';
        const ts = m && typeof m.ts === 'number' ? m.ts : (m && typeof m.time === 'string' ? Date.now() : Date.now());
        const from = m && (m.from === 'user' || m.from === 'mushroom') ? m.from : 'mushroom';
        return { text, ts, from };
    }

    function scrollToBottom(behavior = 'smooth') {
        const last = wrap && wrap.lastElementChild ? wrap.lastElementChild : null;
        if (last && typeof last.scrollIntoView === 'function') {
            last.scrollIntoView({ block: 'end', behavior });
        }
    }

    function measureInputbarHeight() {
        if (!inputbar || typeof inputbar.getBoundingClientRect !== 'function') return;
        const rect = inputbar.getBoundingClientRect();
        inputbarHeight = Math.ceil(rect.height);
    }

    function updateBottomSpace() {
        if (!inputbarHeight) measureInputbarHeight();
        const extra = 34;
        document.body.style.setProperty('--chat-inputbar-space', `${Math.ceil(inputbarHeight + extra + keyboardOffset)}px`);
    }

    function updateInputHeight() {
        if (!input || !(input instanceof HTMLTextAreaElement)) return;
        input.style.height = 'auto';
        const next = Math.min(input.scrollHeight, 120);
        input.style.height = `${Math.max(next, 24)}px`;
        input.style.overflowY = input.scrollHeight > 120 ? 'auto' : 'hidden';
        updateBottomSpace();
    }

    function updateKeyboardOffset() {
        if (!inputbar) return;
        if (keyboardRaf) cancelAnimationFrame(keyboardRaf);
        keyboardRaf = requestAnimationFrame(() => {
            keyboardRaf = 0;
            const vv = window.visualViewport;
            const active =
                !!input &&
                input instanceof HTMLElement &&
                document.activeElement === input;

            const nextOffset = vv && active
                ? Math.max(0, baseInnerHeight - vv.height - vv.offsetTop)
                : 0;

            if (Math.abs(nextOffset - keyboardOffset) < 2) return;

            keyboardOffset = Math.round(nextOffset);
            inputbar.style.setProperty('--keyboard-offset', `${keyboardOffset}px`);
            updateBottomSpace();
        });
    }

    function render() {
        if (!wrap) return;
        wrap.innerHTML = '';
        const list = Array.isArray(conv.messages) ? conv.messages.slice().reverse() : [];
        for (const raw of list) {
            const m = normalizeMessage(raw);
            const inbound = m.from !== 'user';
            const item = document.createElement('div');
            item.className = `chat-item ${inbound ? 'inbound' : 'outbound'}`;

            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${inbound ? 'inbound' : 'outbound'}`;
            const canJumpStorm = inbound && typeof m.text === 'string' && m.text.includes('孢子季风💨');
            const canOpenShortcut = inbound && typeof m.text === 'string' && m.text.includes(shortcutToken);
            if (canJumpStorm) {
                const parts = m.text.split('孢子季风💨');
                if (parts[0]) bubble.appendChild(document.createTextNode(parts[0]));
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chat-jump-link';
                btn.dataset.jump = 'storm';
                btn.textContent = '孢子季风💨';
                bubble.appendChild(btn);
                if (parts[1]) bubble.appendChild(document.createTextNode(parts[1]));
            } else if (canOpenShortcut) {
                const parts = m.text.split(shortcutToken);
                if (parts[0]) bubble.appendChild(document.createTextNode(parts[0]));
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chat-jump-link';
                btn.dataset.jump = 'shortcut';
                btn.textContent = shortcutToken;
                bubble.appendChild(btn);
                if (parts[1]) bubble.appendChild(document.createTextNode(parts[1]));
            } else {
                bubble.textContent = m.text;
            }

            const time = document.createElement('div');
            time.className = `chat-time ${inbound ? 'inbound' : 'outbound'}`;
            time.textContent = formatTimestamp(m.ts);

            item.appendChild(bubble);
            item.appendChild(time);
            wrap.appendChild(item);
        }
        requestAnimationFrame(() => {
            updateBottomSpace();
            scrollToBottom('auto');
        });
    }

    function persist() {
        state.conversations[cid] = conv;
        conv.unread = false;
        const has = Object.values(state.conversations || {}).some((c) => c && c.unread);
        state.unread.messages = has;
        window.StorageAPI.setNotifyState(state);
        if (window.IdeasShell && typeof window.IdeasShell.renderNotifyIndicators === 'function') {
            window.IdeasShell.renderNotifyIndicators();
        }
    }

    function sendMessage(text) {
        const trimmed = (text || '').trim();
        if (!trimmed) return;
        const ts = Date.now();
        if (!Array.isArray(conv.messages)) conv.messages = [];
        conv.messages.unshift({ text: trimmed, ts, time: formatTimestamp(ts), from: 'user' });
        if (input) input.value = '';
        updateInputHeight();
        persist();
        render();
    }

    async function triggerSpore() {
        if (!sporeEnabled) return;
        if (window.SporeCannon && typeof window.SporeCannon.burst === 'function') {
            window.SporeCannon.burst({ anchorEl: sporeBtn });
        }
        const ts = Date.now();
        let q = '';
        try {
            q = window.PhraseLibrary && typeof window.PhraseLibrary.getQuestion === 'function'
                ? await window.PhraseLibrary.getQuestion(cid)
                : '';
        } catch (_) {
            q = '';
        }
        const text = q || '你愿意说说此刻脑子里最亮的那句话吗？';
        if (!Array.isArray(conv.messages)) conv.messages = [];
        conv.messages.unshift({ text, ts, time: formatTimestamp(ts), from: 'mushroom' });
        persist();
        render();
    }

    if (sendBtn && input) {
        sendBtn.addEventListener('click', () => sendMessage(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input.value);
            }
        });
        input.addEventListener('input', () => updateInputHeight());
        input.addEventListener('focus', () => {
            measureInputbarHeight();
            updateKeyboardOffset();
            requestAnimationFrame(() => scrollToBottom('auto'));
            setTimeout(() => {
                updateKeyboardOffset();
                scrollToBottom('auto');
            }, 260);
        });
        input.addEventListener('blur', () => {
            keyboardOffset = 0;
            if (inputbar) inputbar.style.setProperty('--keyboard-offset', '0px');
            updateBottomSpace();
        });
    }

    if (sporeBtn) sporeBtn.addEventListener('click', () => triggerSpore());

    if (wrap) {
        wrap.addEventListener('click', (e) => {
            const target = e.target;
            if (!target || !(target instanceof HTMLElement)) return;
            if (target.classList.contains('chat-jump-link') && target.dataset.jump === 'storm') {
                const href = 'content-storm.html';
                if (window.PageTransition && typeof window.PageTransition.go === 'function') {
                    window.PageTransition.go(href);
                    return;
                }
                window.location.href = href;
            }
            if (target.classList.contains('chat-jump-link') && target.dataset.jump === 'shortcut') {
                const href = encodeURI(shortcutHref);
                if (window.PageTransition && typeof window.PageTransition.go === 'function') {
                    window.PageTransition.go(href);
                    return;
                }
                window.location.href = href;
            }
        });
    }

    render();
    measureInputbarHeight();
    updateInputHeight();
    updateKeyboardOffset();

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateKeyboardOffset);
    }
    window.addEventListener('resize', updateKeyboardOffset);

    if (window.ResizeObserver && inputbar) {
        const ro = new ResizeObserver(() => {
            measureInputbarHeight();
            updateBottomSpace();
        });
        ro.observe(inputbar);
    }

    if (window.IdeasShell && typeof window.IdeasShell.renderNotifyIndicators === 'function') {
        window.IdeasShell.renderNotifyIndicators();
    }
});
