document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('favorites-list');
    const emptyEl = document.getElementById('empty-state');

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const viewportOriginal = viewportMeta ? (viewportMeta.getAttribute('content') || '') : '';
    let viewportLocked = false;

    function setViewportLocked(lock) {
        if (!viewportMeta || !viewportOriginal) return;
        if (lock) {
            if (viewportLocked) return;
            viewportLocked = true;
            let next = viewportOriginal;
            if (/maximum-scale\s*=/.test(next)) next = next.replace(/maximum-scale\s*=\s*[^,]+/i, 'maximum-scale=1');
            else next = `${next}, maximum-scale=1`;
            if (/user-scalable\s*=/.test(next)) next = next.replace(/user-scalable\s*=\s*[^,]+/i, 'user-scalable=no');
            else next = `${next}, user-scalable=no`;
            viewportMeta.setAttribute('content', next);
            return;
        }
        if (!viewportLocked) return;
        viewportLocked = false;
        viewportMeta.setAttribute('content', viewportOriginal);
    }

    document.addEventListener('focusin', (e) => {
        const target = e.target;
        if (!target || !(target instanceof HTMLElement)) return;
        if (target.matches('.reply-input-wrapper textarea')) setViewportLocked(true);
    });

    document.addEventListener('focusout', (e) => {
        const target = e.target;
        if (!target || !(target instanceof HTMLElement)) return;
        if (!target.matches('.reply-input-wrapper textarea')) return;
        requestAnimationFrame(() => {
            const active = document.activeElement;
            if (active && active instanceof HTMLElement && active.matches('.reply-input-wrapper textarea')) return;
            setViewportLocked(false);
        });
    });

    async function shareIdea(idea) {
        const text = idea && idea.text ? String(idea.text) : '';
        if (!text) return;
        if (navigator.share) {
            try {
                await navigator.share({ text });
                return;
            } catch (e) {
            }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                alert('已复制到剪贴板');
                return;
            } catch (e) {
            }
        }
        window.prompt('复制这段灵感：', text);
    }

    function collectReplyFavorites(items, out) {
        (items || []).forEach((item) => {
            if (!item) return;
            if (item.favorite) {
                out.push({
                    idea: { ...item, replies: [] },
                    renderReplies: false
                });
            }
            if (item.replies && item.replies.length) collectReplyFavorites(item.replies, out);
        });
    }

    function collectFavorites(items, out) {
        (items || []).forEach((item) => {
            if (!item) return;
            if (item.favorite) {
                out.push({
                    idea: item,
                    renderReplies: true
                });
                return;
            }
            if (item.replies && item.replies.length) collectReplyFavorites(item.replies, out);
        });
    }

    function createIdeaCard(idea, options = {}) {
        const renderReplies = !!options.renderReplies;
        const card = document.createElement('div');
        card.className = 'idea-card';
        card.dataset.id = idea.id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'idea-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'idea-text';
        textDiv.textContent = idea.text || '';

        const expandBtn = document.createElement('button');
        expandBtn.className = 'expand-btn';
        expandBtn.textContent = '展开';

        const metaDiv = document.createElement('div');
        metaDiv.className = 'idea-meta';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'idea-actions';

        const favBtn = document.createElement('button');
        favBtn.className = 'action-btn favorite';
        favBtn.textContent = '🍄';
        favBtn.title = '收藏';
        if (idea.favorite) {
            favBtn.classList.add('active');
            favBtn.title = '取消收藏';
        }

        const shareBtn = document.createElement('button');
        shareBtn.className = 'action-btn share';
        shareBtn.textContent = '🫧';
        shareBtn.title = '分享';

        const replyBtn = document.createElement('button');
        replyBtn.className = 'action-btn reply';
        replyBtn.textContent = '💬';
        replyBtn.title = '回复';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete';
        deleteBtn.textContent = '🍂';
        deleteBtn.title = '埋入落叶层';

        actionsDiv.appendChild(favBtn);
        actionsDiv.appendChild(shareBtn);
        actionsDiv.appendChild(replyBtn);
        actionsDiv.appendChild(deleteBtn);

        const timeDiv = document.createElement('div');
        timeDiv.className = 'idea-time';
        timeDiv.textContent = idea.time || '';

        metaDiv.appendChild(actionsDiv);
        metaDiv.appendChild(timeDiv);

        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(expandBtn);
        contentDiv.appendChild(metaDiv);

        card.appendChild(contentDiv);

        const replyInputWrapper = document.createElement('div');
        replyInputWrapper.className = 'reply-input-wrapper';
        replyInputWrapper.style.display = 'none';

        const replyTextarea = document.createElement('textarea');
        replyTextarea.placeholder = '写下你的回复...';
        replyTextarea.setAttribute('aria-label', '输入回复');
        replyTextarea.addEventListener('touchstart', () => setViewportLocked(true), { passive: true });
        replyTextarea.addEventListener('mousedown', () => setViewportLocked(true));
        replyTextarea.addEventListener('focus', () => setViewportLocked(true));
        replyTextarea.addEventListener('blur', () => setViewportLocked(false));

        const submitReplyBtn = document.createElement('button');
        submitReplyBtn.type = 'button';
        submitReplyBtn.setAttribute('aria-label', '发送');
        const sendIcon = document.createElement('img');
        sendIcon.className = 'send-icon';
        sendIcon.src = 'icons/发送_send.svg';
        sendIcon.alt = '';
        sendIcon.setAttribute('aria-hidden', 'true');
        sendIcon.width = 22;
        sendIcon.height = 22;
        submitReplyBtn.appendChild(sendIcon);

        replyInputWrapper.appendChild(replyTextarea);
        replyInputWrapper.appendChild(submitReplyBtn);
        card.appendChild(replyInputWrapper);

        const repliesList = document.createElement('div');
        repliesList.className = 'replies-list';
        repliesList.style.display = 'none';
        if (renderReplies && Array.isArray(idea.replies) && idea.replies.length) {
            idea.replies.forEach((reply) => {
                repliesList.appendChild(createIdeaCard(reply, { renderReplies: true }));
            });
            repliesList.style.display = 'flex';
        }
        card.appendChild(repliesList);

        requestAnimationFrame(() => {
            if (textDiv.scrollHeight > textDiv.clientHeight) {
                card.classList.add('has-overflow');
            }
        });

        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = textDiv.classList.contains('expanded');
            if (isExpanded) {
                textDiv.classList.remove('expanded');
                expandBtn.textContent = '展开';
            } else {
                textDiv.classList.add('expanded');
                expandBtn.textContent = '收起';
            }
        });

        favBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isActive = favBtn.classList.contains('active');
            favBtn.classList.toggle('active', !isActive);
            favBtn.title = isActive ? '收藏' : '取消收藏';
            await window.StorageAPI.updateIdea(idea.id, (obj) => {
                obj.favorite = !isActive;
            });
            await render();
        });

        shareBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await shareIdea(idea);
        });

        replyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            replyInputWrapper.style.display = replyInputWrapper.style.display === 'none' ? 'flex' : 'none';
            if (replyInputWrapper.style.display === 'flex') {
                setViewportLocked(true);
                replyTextarea.focus();
            }
            else setViewportLocked(false);
        });

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('确定要把它埋进落叶层吗？')) return;
            await window.StorageAPI.deleteIdea(idea.id);
            await render();
        });

        submitReplyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const replyText = replyTextarea.value.trim();
            if (!replyText) return;
            await window.StorageAPI.addReply(idea.id, replyText);
            setViewportLocked(false);
            await render();
        });

        return card;
    }

    async function render() {
        let all = [];
        try {
            const result = await window.StorageAPI.getAll();
            all = Array.isArray(result) ? result : [];
        } catch (e) {
            all = [];
        }

        const favorites = [];
        collectFavorites(all, favorites);

        listEl.innerHTML = '';

        if (!favorites.length) {
            emptyEl.style.display = 'block';
            if (window.IdeasShell && typeof window.IdeasShell.renderNotifyIndicators === 'function') {
                window.IdeasShell.renderNotifyIndicators();
            }
            return;
        }

        emptyEl.style.display = 'none';
        favorites.forEach((entry) => {
            listEl.appendChild(createIdeaCard(entry.idea, { renderReplies: entry.renderReplies }));
        });

        if (window.IdeasShell && typeof window.IdeasShell.renderNotifyIndicators === 'function') {
            window.IdeasShell.renderNotifyIndicators();
        }
    }

    await render();
});
