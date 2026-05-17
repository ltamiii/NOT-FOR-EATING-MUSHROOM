window.StorageAPI = {
    _ideasKey: 'mushroom_ideas_data',
    _deletedKey: 'mushroom_ideas_deleted',
    _notifyKey: 'mushroom_notify_state',
    _safeParse: function(str, fallback) {
        try {
            return str ? JSON.parse(str) : fallback;
        } catch (e) {
            return fallback;
        }
    },
    _getTimeString: function() {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const HH = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${yy}-${mm}-${dd} ${HH}:${min}`;
    },
    getAll: async function() {
        const data = localStorage.getItem(this._ideasKey);
        return this._safeParse(data, []);
    },
    saveAll: async function(data) {
        localStorage.setItem(this._ideasKey, JSON.stringify(data));
    },
    save: async function(text) {
        const data = await this.getAll();
        const newIdea = {
            id: Date.now().toString(),
            text,
            time: this._getTimeString(),
            favorite: false,
            replies: []
        };
        data.unshift(newIdea);
        await this.saveAll(data);
        return newIdea;
    },
    updateIdea: async function(id, updater) {
        const data = await this.getAll();
        const updateRecursive = (list) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    updater(list[i]);
                    return true;
                }
                if (list[i].replies && list[i].replies.length > 0) {
                    if (updateRecursive(list[i].replies)) return true;
                }
            }
            return false;
        };
        updateRecursive(data);
        await this.saveAll(data);
    },
    _getDeletedAll: async function() {
        const data = localStorage.getItem(this._deletedKey);
        return this._safeParse(data, []);
    },
    _saveDeletedAll: async function(list) {
        localStorage.setItem(this._deletedKey, JSON.stringify(list));
    },
    purgeDeletedOlderThanDays: async function(days) {
        const list = await this._getDeletedAll();
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const kept = list.filter(i => i && i.deletedAt && i.deletedAt >= cutoff);
        await this._saveDeletedAll(kept);
        return kept;
    },
    getDeletedWithinDays: async function(days) {
        const kept = await this.purgeDeletedOlderThanDays(days);
        return kept.slice().sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    },
    deleteIdea: async function(id) {
        const data = await this.getAll();
        let removed = null;
        const deleteRecursive = (list) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    removed = list[i];
                    list.splice(i, 1);
                    return true;
                }
                if (list[i].replies && list[i].replies.length > 0) {
                    if (deleteRecursive(list[i].replies)) return true;
                }
            }
            return false;
        };
        deleteRecursive(data);
        await this.saveAll(data);
        if (removed) {
            const del = await this._getDeletedAll();
            del.unshift({ ...removed, deletedAt: Date.now() });
            await this._saveDeletedAll(del);
        }
        return removed;
    },
    addReply: async function(parentId, text) {
        const data = await this.getAll();
        const newReply = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
            text,
            time: this._getTimeString(),
            favorite: false,
            replies: []
        };
        const addRecursive = (list) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === parentId) {
                    if (!list[i].replies) list[i].replies = [];
                    list[i].replies.push(newReply);
                    return true;
                }
                if (list[i].replies && list[i].replies.length > 0) {
                    if (addRecursive(list[i].replies)) return true;
                }
            }
            return false;
        };
        addRecursive(data);
        await this.saveAll(data);
        return newReply;
    },
    getNotifyState: function() {
        const raw = localStorage.getItem(this._notifyKey);
        const base = {
            basketPulse: false,
            unread: { messages: false },
            triggers: {
                seed0: false,
                idea3: false,
                idea8: false,
                idea10: false,
                idea15: false,
                firstPull: false,
                chocoPull: false
            },
            conversations: {
                wholesale: { id: 'wholesale', title: 'AAA菌菇松茸批发', unread: false, messages: [] },
                mushroom: { id: 'mushroom', title: '灵感菇', unread: false, messages: [] },
                storm: { id: 'storm', title: '孢子季风', unread: false, messages: [] },
                confusing: { id: 'confusing', title: '迷惑菇', unread: false, messages: [] }
            }
        };
        const parsed = this._safeParse(raw, null);
        if (!parsed) return base;
        const merged = { ...base, ...parsed };
        merged.unread = { ...base.unread, ...(parsed.unread || {}) };
        merged.triggers = { ...base.triggers, ...(parsed.triggers || {}) };
        const parsedConversations = parsed.conversations && typeof parsed.conversations === 'object' ? parsed.conversations : {};
        const allConversationIds = Array.from(new Set([
            ...Object.keys(base.conversations),
            ...Object.keys(parsedConversations)
        ])).filter((cid) => cid !== 'night');
        merged.conversations = {};
        allConversationIds.forEach((cid) => {
            const baseConv = base.conversations[cid] || { id: cid, title: cid, unread: false, messages: [] };
            const parsedConv = parsedConversations[cid] || {};
            merged.conversations[cid] = {
                ...baseConv,
                ...parsedConv,
                messages: Array.isArray(parsedConv.messages) ? parsedConv.messages : baseConv.messages
            };
        });
        if (merged.triggers && Object.prototype.hasOwnProperty.call(merged.triggers, 'night10')) {
            delete merged.triggers.night10;
        }
        return merged;
    },
    setNotifyState: function(state) {
        localStorage.setItem(this._notifyKey, JSON.stringify(state));
    }
};
