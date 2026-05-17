document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('sms-list');
    const nameMap = {
        wholesale: 'AAA菌菇松茸批发',
        mushroom: '灵感菇^ ^',
        storm: '蘑古力酱O.o',
        confusing: '迷惑菇-.-'
    };
    const avatarVersion = '20260517';

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

    const state = window.StorageAPI.getNotifyState();
    state.unread.messages = false;
    window.StorageAPI.setNotifyState(state);

    const next = window.StorageAPI.getNotifyState();
    const convs = Object.values(next.conversations || {}).filter((c) => {
        if (!c || c.id === 'night') return false;
        return !!(c.messages && c.messages.length);
    });
    convs.sort((a, b) => {
        const aLast = a.messages && a.messages.length ? a.messages[0] : null;
        const bLast = b.messages && b.messages.length ? b.messages[0] : null;
        const at = aLast && aLast.ts ? aLast.ts : 0;
        const bt = bLast && bLast.ts ? bLast.ts : 0;
        return bt - at;
    });

    list.innerHTML = '';
    if (!convs.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '暂无消息';
        list.appendChild(empty);
    }

    convs.forEach((conv) => {
        const displayName = nameMap[conv.id] || conv.title || conv.id;
        const item = document.createElement('div');
        item.className = 'sms-item';

        const avatar = document.createElement('div');
        avatar.className = 'sms-avatar';

        const avatarImg = document.createElement('img');
        avatarImg.className = 'sms-avatar-img';
        avatarImg.alt = displayName;
        avatarImg.src = '头像用户名/' + encodeURIComponent(displayName) + '.png?v=' + encodeURIComponent(avatarVersion);

        avatarImg.addEventListener('error', () => {
            avatarImg.hidden = true;
        });

        avatar.appendChild(avatarImg);

        const content = document.createElement('div');
        content.className = 'sms-content';

        const main = document.createElement('div');
        main.className = 'sms-main';

        const title = document.createElement('div');
        title.className = 'sms-title';
        title.textContent = displayName;

        const preview = document.createElement('div');
        preview.className = 'sms-preview';
        const last = (conv.messages && conv.messages.length) ? conv.messages[0] : null;
        const lastText = last && typeof last.text === 'string' ? last.text.trim() : '';
        preview.textContent = lastText;
        preview.hidden = !lastText;

        main.appendChild(title);
        main.appendChild(preview);

        const meta = document.createElement('div');
        meta.className = 'sms-meta';

        const time = document.createElement('div');
        time.className = 'sms-time';
        if (last && typeof last.ts === 'number') {
            time.textContent = formatTimestamp(last.ts);
        } else if (last && typeof last.time === 'string') {
            time.textContent = last.time;
        } else time.textContent = '';
        time.hidden = !time.textContent;

        const dot = document.createElement('div');
        dot.className = 'sms-unread-dot';
        dot.classList.toggle('show', !!conv.unread);

        meta.appendChild(time);
        meta.appendChild(dot);

        content.appendChild(main);
        content.appendChild(meta);

        item.appendChild(avatar);
        item.appendChild(content);

        item.addEventListener('click', () => {
            const href = 'content-ideas-chat.html?cid=' + encodeURIComponent(conv.id);
            if (window.PageTransition && typeof window.PageTransition.go === 'function') {
                window.PageTransition.go(href);
                return;
            }
            window.location.href = href;
        });

        list.appendChild(item);
    });

    if (window.IdeasShell && typeof window.IdeasShell.renderNotifyIndicators === 'function') {
        window.IdeasShell.renderNotifyIndicators();
    }
});
