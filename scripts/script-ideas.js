document.addEventListener('DOMContentLoaded', async () => {
    const input = document.getElementById('idea-input');
    const submitBtn = document.getElementById('submit-btn');
    const ideasList = document.getElementById('ideas-list');
    const selectBtn = document.getElementById('select-btn');
    const bulkActions = document.getElementById('bulk-actions');
    const bulkExportBtn = document.getElementById('bulk-export-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    let ideas = [];
    let selectionMode = false;
    const selectedIds = new Set();

    async function ensureNotifyState() {
        const state = window.StorageAPI.getNotifyState();
        if (!state.triggers) state.triggers = {};
        if (!state.unread) state.unread = {};

        const pushMessage = (cid, title, text) => {
            const now = new Date();
            const t = now.toLocaleTimeString('zh-CN', { hour12: false });
            if (!state.conversations) state.conversations = {};
            const baseConv = state.conversations[cid] || { id: cid, title: title || cid, unread: false, messages: [] };
            baseConv.title = title || baseConv.title;
            if (!Array.isArray(baseConv.messages)) baseConv.messages = [];
            baseConv.messages.unshift({ text, time: t, ts: now.getTime() });
            baseConv.unread = true;
            state.conversations[cid] = baseConv;
            state.unread.messages = true;
            state.basketPulse = true;
        };

        if (ideas.length === 0 && !state.triggers.seed0) {
            state.triggers.seed0 = true;
            pushMessage('wholesale', 'AAA菌菇松茸批发', '你好，这里是……一个暂时没有名字的森林');
            pushMessage('wholesale', 'AAA菌菇松茸批发', '你可以将你的灵机一动时候的想法或情绪感受播种在这里，这里有一些简单的功能可以供你使用。对了，顺便告诉你一个进入这里更快捷的方式！（点击打开）');
            pushMessage('wholesale', 'AAA菌菇松茸批发', '接下来先试试记录灵感，探索熟悉一下这里吧！（会有一些事情发生哦～');
            pushMessage('wholesale', 'AAA菌菇松茸批发', '顺带一提：你在这里播种的内容都只会乖乖待在你自己的设备里，不会上交到别处，所以隐私不用担心。但也记得时不时把重要灵感导出保存呀，不然清理缓存或换设备时，它们可能会悄悄走丢。');
        } else if (state.triggers.seed0) {
            const conv = state.conversations && state.conversations.wholesale ? state.conversations.wholesale : null;
            if (conv && Array.isArray(conv.messages)) {
                conv.messages.forEach((m) => {
                    if (!m || typeof m.text !== 'string') return;
                    if (m.text.includes('你可以将你的灵机一动时候的想法或情绪感受播种在这里') && !m.text.includes('更快捷的方式')) {
                        m.text = '你可以将你的灵机一动时候的想法或情绪感受播种在这里，这里有一些简单的功能可以供你使用。对了，顺便告诉你一个进入这里更快捷的方式！（点击打开）';
                    }
                });
            }
            if (!state.triggers.seed0_privacy) {
                state.triggers.seed0_privacy = true;
                pushMessage('wholesale', 'AAA菌菇松茸批发', '顺带一提：你在这里播种的内容都只会乖乖待在你自己的设备里，不会上交到别处，所以隐私不用担心。但也记得时不时把重要灵感导出保存呀，不然清理缓存或换设备时，它们可能会悄悄走丢。');
            }
        }

        if (ideas.length >= 3 && !state.triggers.idea3) {
            state.triggers.idea3 = true;
            pushMessage('mushroom', '灵感菇', 'hi，我是灵感菇🍄');
            pushMessage('mushroom', '灵感菇', '其实我在森林那里就看到你啦！');
            pushMessage('mushroom', '灵感菇', '不过刚刚注意到你好像在播种灵感，这可是一件值得表扬的事情哟！因为你播种越多灵感，这里的生物就会被你的灵气感染，森林里就可能会发生一些出乎你意料的事情～');
            pushMessage('mushroom', '灵感菇', '对啦，假如你暂时想不出什么要记录的东西，可以试试点击对话框下面的按钮，我会释放一些灵感孢子帮助你找到灵感0,0');
            pushMessage('mushroom', '灵感菇', '总之期待你记录下更多的灵光一现和思考，说不定未来某个时刻你会从这些灵感里得到一些出乎意料的收获哦^-^');
        }

        if (ideas.length >= 8 && !state.triggers.idea8) {
            state.triggers.idea8 = true;
            pushMessage('mushroom', '灵感菇', '你播种的灵感灵气很充足！');
            pushMessage('mushroom', '灵感菇', '现在森林迎来了一场席卷而来的信息风暴，带来了一些未知属性的蘑菇，试试去“孢子季风💨”（点击可直接跳转）看看！');
        }

        if (ideas.length >= 15 && !state.triggers.idea15) {
            state.triggers.idea15 = true;
        }

        window.StorageAPI.setNotifyState(state);
        if (window.IdeasShell && typeof window.IdeasShell.renderNotifyIndicators === 'function') {
            window.IdeasShell.renderNotifyIndicators();
        }
    }
    
    // 初始化获取所有数据并渲染
    async function init() {
        try {
            const result = await window.StorageAPI.getAll();
            ideas = Array.isArray(result) ? result : [];
        } catch (e) {
            console.error('Failed to get ideas', e);
            ideas = [];
        }
        renderIdeas();
        await ensureNotifyState();
    }
    
    init();

    // 提交灵感
    const submitIdea = async () => {
        const text = input.value.trim();
        if (!text) return;

        try {
            const savedIdea = await window.StorageAPI.save(text);
            
            const result = await window.StorageAPI.getAll();
            ideas = Array.isArray(result) ? result : [];
            
            input.value = '';
            
            const ideaElement = createIdeaElement(savedIdea);
            ideasList.insertBefore(ideaElement, ideasList.firstChild);
            await ensureNotifyState();
        } catch (e) {
            console.error('Failed to save idea', e);
        }
    };

    submitBtn.addEventListener('click', submitIdea);

    const isMobileLikeInput = (() => {
        try {
            return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        } catch (_) {
            return false;
        }
    })();

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

    function insertNewlineIntoTextarea(el) {
        if (!el) return;
        const start = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
        const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : el.value.length;
        const next = el.value.slice(0, start) + '\n' + el.value.slice(end);
        el.value = next;
        const pos = start + 1;
        el.selectionStart = pos;
        el.selectionEnd = pos;
    }

    input.addEventListener('keydown', (e) => {
        if (isMobileLikeInput) return;
        if (e.key !== 'Enter') return;
        if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            insertNewlineIntoTextarea(input);
            return;
        }
        if (!e.shiftKey) {
            e.preventDefault();
            submitIdea();
        }
    });

    // 渲染所有灵感
    function renderIdeas() {
        ideasList.innerHTML = '';
        ideas.forEach(idea => {
            const el = createIdeaElement(idea);
            ideasList.appendChild(el);
        });
        syncSelectionUI();
    }

    function setSelectionMode(next) {
        selectionMode = next;
        document.body.classList.toggle('selection-mode', selectionMode);
        if (bulkActions) bulkActions.hidden = !selectionMode;
        if (selectBtn) selectBtn.textContent = selectionMode ? '完成' : '选择';
        if (!selectionMode) {
            selectedIds.clear();
            syncSelectionUI();
        }
    }

    function toggleIdeaSelected(id, groupEl) {
        if (selectedIds.has(id)) {
            selectedIds.delete(id);
        } else {
            selectedIds.add(id);
        }
        if (groupEl) groupEl.classList.toggle('selected', selectedIds.has(id));
    }

    function syncSelectionUI() {
        const groups = ideasList.querySelectorAll('.idea-group');
        groups.forEach((g) => {
            const id = g.dataset.id;
            g.classList.toggle('selected', !!id && selectedIds.has(id));
        });
    }

    function buildIdeaExportLines(idea) {
        const lines = [];
        const timeStr = idea && idea.time ? idea.time : '';
        const headText = idea && idea.text ? idea.text : '';
        lines.push(timeStr ? `${headText}-${timeStr}` : headText);

        const walkReplies = (list) => {
            if (!Array.isArray(list)) return;
            list.forEach((r) => {
                const rt = r && r.time ? r.time : '';
                const replyText = r && r.text ? r.text : '';
                lines.push(rt ? `-回复：${replyText}-${rt}` : `-回复：${replyText}`);
                if (r && Array.isArray(r.replies) && r.replies.length) {
                    walkReplies(r.replies);
                }
            });
        };

        walkReplies(idea && idea.replies ? idea.replies : []);
        return lines;
    }

    let exportChooser = null;

    function ensureExportChooser() {
        if (exportChooser) return exportChooser;
        const overlay = document.createElement('div');
        overlay.classList.add('export-overlay');
        overlay.setAttribute('aria-hidden', 'true');

        const modal = document.createElement('div');
        modal.classList.add('export-modal');

        const title = document.createElement('div');
        title.classList.add('export-title');
        title.textContent = '选择导出格式';

        const actions = document.createElement('div');
        actions.classList.add('export-actions');

        const docxBtn = document.createElement('button');
        docxBtn.type = 'button';
        docxBtn.classList.add('export-action-btn');
        docxBtn.textContent = 'DOCX';

        const pdfBtn = document.createElement('button');
        pdfBtn.type = 'button';
        pdfBtn.classList.add('export-action-btn');
        pdfBtn.textContent = 'PDF';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.classList.add('export-action-btn', 'cancel');
        cancelBtn.textContent = '取消';

        actions.appendChild(docxBtn);
        actions.appendChild(pdfBtn);
        actions.appendChild(cancelBtn);
        modal.appendChild(title);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        exportChooser = { overlay, modal, docxBtn, pdfBtn, cancelBtn };
        return exportChooser;
    }

    function openExportChooser() {
        const chooser = ensureExportChooser();
        chooser.overlay.classList.add('open');
        chooser.overlay.setAttribute('aria-hidden', 'false');
        return new Promise((resolve) => {
            const done = (val) => {
                chooser.overlay.classList.remove('open');
                chooser.overlay.setAttribute('aria-hidden', 'true');
                chooser.docxBtn.removeEventListener('click', onDocx);
                chooser.pdfBtn.removeEventListener('click', onPdf);
                chooser.cancelBtn.removeEventListener('click', onCancel);
                chooser.overlay.removeEventListener('click', onOverlay);
                resolve(val);
            };

            const onDocx = (e) => {
                e.stopPropagation();
                done('docx');
            };
            const onPdf = (e) => {
                e.stopPropagation();
                done('pdf');
            };
            const onCancel = (e) => {
                e.stopPropagation();
                done(null);
            };
            const onOverlay = (e) => {
                if (e.target === chooser.overlay) done(null);
            };

            chooser.docxBtn.addEventListener('click', onDocx);
            chooser.pdfBtn.addEventListener('click', onPdf);
            chooser.cancelBtn.addEventListener('click', onCancel);
            chooser.overlay.addEventListener('click', onOverlay);
        });
    }

    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            setSelectionMode(!selectionMode);
        });
    }

    if (bulkExportBtn) {
        bulkExportBtn.addEventListener('click', async () => {
            if (selectedIds.size === 0) return;
            const kind = await openExportChooser();
            if (!kind) return;
            if (!window.IdeasBulkExport) return;

            let all = [];
            try {
                const result = await window.StorageAPI.getAll();
                all = Array.isArray(result) ? result : [];
            } catch (e) {
                all = Array.isArray(ideas) ? ideas : [];
            }

            const picked = all.filter((i) => selectedIds.has(i.id));
            const lines = [];
            picked.forEach((idea, idx) => {
                lines.push(...buildIdeaExportLines(idea));
                if (idx !== picked.length - 1) lines.push('');
            });

            const stamp = String(Date.now());
            if (kind === 'pdf') {
                window.IdeasBulkExport.exportLinesToPdf(lines, `灵感导出 ${stamp}`);
                return;
            }
            window.IdeasBulkExport.exportLinesToDocx(lines, `灵感导出_${stamp}.docx`);
        });
    }

    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', async () => {
            if (selectedIds.size === 0) return;
            if (!confirm('确定要把选中的灵感埋进落叶层吗？')) return;
            const ids = Array.from(selectedIds);
            for (const id of ids) {
                await window.StorageAPI.deleteIdea(id);
                const el = Array.from(ideasList.querySelectorAll('.idea-group')).find((n) => n.dataset.id === id);
                if (el) el.remove();
                selectedIds.delete(id);
            }
            const result = await window.StorageAPI.getAll();
            ideas = Array.isArray(result) ? result : [];
            await ensureNotifyState();
            syncSelectionUI();
        });
    }

    // 创建单个灵感 (支持递归渲染回复)
    function createIdeaElement(idea, isReply = false) {
        const group = isReply ? null : document.createElement('div');
        if (group) {
            group.classList.add('idea-group');
            group.dataset.id = idea.id;
        }

        const card = document.createElement('div');
        card.classList.add('idea-card');
        card.dataset.id = idea.id;

        if (group) {
            const sel = document.createElement('div');
            sel.classList.add('idea-select');
            const selBtn = document.createElement('button');
            selBtn.type = 'button';
            selBtn.classList.add('idea-select-btn');
            selBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleIdeaSelected(idea.id, group);
            });
            sel.appendChild(selBtn);
            group.appendChild(sel);
            group.appendChild(card);
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('idea-content');

        const textDiv = document.createElement('div');
        textDiv.classList.add('idea-text');
        textDiv.textContent = idea.text;

        const expandBtn = document.createElement('button');
        expandBtn.classList.add('expand-btn');
        expandBtn.textContent = '展开';

        const metaDiv = document.createElement('div');
        metaDiv.classList.add('idea-meta');

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('idea-actions');

        const favBtn = document.createElement('button');
        favBtn.classList.add('action-btn', 'favorite');
        favBtn.textContent = '🍄';
        favBtn.title = '收藏';
        if (idea.favorite) favBtn.classList.add('active');

        const replyBtn = document.createElement('button');
        replyBtn.classList.add('action-btn', 'reply');
        replyBtn.textContent = '💬';
        replyBtn.title = '回复';

        const exportBtn = document.createElement('button');
        exportBtn.classList.add('action-btn', 'export');
        exportBtn.textContent = '🫧';
        exportBtn.title = '导出标本';

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('action-btn', 'delete');
        deleteBtn.textContent = '🍂';
        deleteBtn.title = '埋入落叶层';

        actionsDiv.appendChild(favBtn);
        actionsDiv.appendChild(exportBtn);
        actionsDiv.appendChild(replyBtn);
        actionsDiv.appendChild(deleteBtn);

        // 如果是历史数据没有 time，给一个默认值
        const timeStr = idea.time || new Date().toLocaleTimeString('zh-CN', { hour12: false });
        const timeDiv = document.createElement('div');
        timeDiv.classList.add('idea-time');
        timeDiv.textContent = timeStr;

        metaDiv.appendChild(actionsDiv);
        metaDiv.appendChild(timeDiv);

        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(expandBtn);
        contentDiv.appendChild(metaDiv);

        card.appendChild(contentDiv);

        // 回复输入框容器
        const replyInputWrapper = document.createElement('div');
        replyInputWrapper.classList.add('reply-input-wrapper');
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
        replyTextarea.addEventListener('keydown', (e) => {
            if (isMobileLikeInput) return;
            if (e.key !== 'Enter') return;
            if (e.metaKey || e.ctrlKey) {
                e.preventDefault();
                insertNewlineIntoTextarea(replyTextarea);
                return;
            }
            if (!e.shiftKey) {
                e.preventDefault();
                submitReplyBtn.click();
            }
        });

        replyInputWrapper.appendChild(replyTextarea);
        replyInputWrapper.appendChild(submitReplyBtn);

        card.appendChild(replyInputWrapper);

        // 回复列表容器
        const repliesList = document.createElement('div');
        repliesList.classList.add('replies-list');
        
        if (idea.replies && idea.replies.length > 0) {
            idea.replies.forEach(reply => {
                repliesList.appendChild(createIdeaElement(reply, true));
            });
        } else {
            repliesList.style.display = 'none';
        }
        
        card.appendChild(repliesList);

        // 检查文本是否超过2行
        requestAnimationFrame(() => {
            if (textDiv.scrollHeight > textDiv.clientHeight) {
                card.classList.add('has-overflow');
            }
        });

        // 展开/折叠逻辑
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

        // 收藏
        favBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isActive = favBtn.classList.contains('active');
            if (isActive) {
                favBtn.classList.remove('active');
            } else {
                favBtn.classList.add('active');
            }
            await window.StorageAPI.updateIdea(idea.id, (obj) => {
                obj.favorite = !isActive;
            });
        });

        // 回复展开
        replyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            replyInputWrapper.style.display = replyInputWrapper.style.display === 'none' ? 'flex' : 'none';
            if (replyInputWrapper.style.display === 'flex') {
                setViewportLocked(true);
                replyTextarea.focus();
            } else {
                setViewportLocked(false);
            }
        });

        exportBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('确定要将该灵感保存为图片吗')) {
                const exporter = window.SpecimenExport;
                if (exporter && typeof exporter.exportIdeaToJpg === 'function') {
                    await exporter.exportIdeaToJpg(idea);
                } else if (exporter && typeof exporter.exportIdeaToPng === 'function') {
                    await exporter.exportIdeaToPng(idea);
                }
            }
        });

        // 删除
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('确定要把它埋进落叶层吗？')) {
                await window.StorageAPI.deleteIdea(idea.id);
                if (group) {
                    group.remove();
                    selectedIds.delete(idea.id);
                } else {
                    card.remove();
                }
                
                // 更新内存中的 ideas，并检查是否影响解锁状态
                const result = await window.StorageAPI.getAll();
                ideas = Array.isArray(result) ? result : [];
                await ensureNotifyState();
            }
        });

        // 发送回复
        submitReplyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const replyText = replyTextarea.value.trim();
            if (!replyText) return;

            try {
                const newReply = await window.StorageAPI.addReply(idea.id, replyText);
                const replyEl = createIdeaElement(newReply, true);
                repliesList.appendChild(replyEl);
                repliesList.style.display = 'flex';
                replyTextarea.value = '';
                replyInputWrapper.style.display = 'none';
                setViewportLocked(false);
            } catch (err) {
                console.error('Failed to add reply', err);
            }
        });

        return group || card;
    }

});
