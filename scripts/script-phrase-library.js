(function() {
    const CACHE_KEY_PREFIX = 'mushroom_phrase_library_cache_v2_';
    const CURSOR_PREFIX = 'mushroom_phrase_cursor_v1_';
    const SHUFFLE_PREFIX = 'mushroom_phrase_shuffle_v1_';
    const TARGETS = [
        { cid: 'mushroom', name: '灵感菇' },
        { cid: 'confusing', name: '迷惑菇' },
        { cid: 'storm', name: '蘑古力酱' }
    ];
    const FILE_MAP = {
        mushroom: '灵感菇-word.docx',
        confusing: '迷惑菇-word.docx',
        storm: '蘑古力酱-word.docx'
    };

    const JSON_MAP = {
        mushroom: 'phrase-library-mushroom.json',
        confusing: 'phrase-library-confusing.json',
        storm: 'phrase-library-storm.json'
    };

    function safeParse(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function fnv1a(bytes) {
        let h = 0x811c9dc5;
        for (let i = 0; i < bytes.length; i++) {
            h ^= bytes[i];
            h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16);
    }

    function readU16(buf, off) {
        return buf[off] | (buf[off + 1] << 8);
    }

    function readU32(buf, off) {
        return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0;
    }

    function findEOCD(bytes) {
        const sig = 0x06054b50;
        const maxBack = Math.min(bytes.length, 65557);
        for (let i = 22; i <= maxBack; i++) {
            const off = bytes.length - i;
            if (readU32(bytes, off) === sig) return off;
        }
        return -1;
    }

    function findZipEntry(bytes, entryName) {
        const eocd = findEOCD(bytes);
        if (eocd < 0) return null;
        const cdCount = readU16(bytes, eocd + 10);
        const cdOffset = readU32(bytes, eocd + 16);

        let ptr = cdOffset;
        const cdSig = 0x02014b50;
        for (let i = 0; i < cdCount; i++) {
            if (readU32(bytes, ptr) !== cdSig) return null;
            const method = readU16(bytes, ptr + 10);
            const compSize = readU32(bytes, ptr + 20);
            const uncompSize = readU32(bytes, ptr + 24);
            const nameLen = readU16(bytes, ptr + 28);
            const extraLen = readU16(bytes, ptr + 30);
            const commentLen = readU16(bytes, ptr + 32);
            const localOffset = readU32(bytes, ptr + 42);
            const nameBytes = bytes.subarray(ptr + 46, ptr + 46 + nameLen);
            const name = new TextDecoder('utf-8').decode(nameBytes);
            if (name === entryName) {
                return { method, compSize, uncompSize, localOffset };
            }
            ptr += 46 + nameLen + extraLen + commentLen;
        }
        return null;
    }

    function extractZipData(bytes, entry) {
        const localSig = 0x04034b50;
        if (readU32(bytes, entry.localOffset) !== localSig) return null;
        const nameLen = readU16(bytes, entry.localOffset + 26);
        const extraLen = readU16(bytes, entry.localOffset + 28);
        const dataOff = entry.localOffset + 30 + nameLen + extraLen;
        return bytes.subarray(dataOff, dataOff + entry.compSize);
    }

    async function inflateRawToString(bytes) {
        const input = new Blob([bytes]).stream();
        const ds = new DecompressionStream('deflate-raw');
        const out = input.pipeThrough(ds);
        const res = await new Response(out).arrayBuffer();
        return new TextDecoder('utf-8').decode(res);
    }

    function xmlToParagraphs(xml) {
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const err = doc.getElementsByTagName('parsererror');
        if (err && err.length) return [];
        const ps = Array.from(doc.getElementsByTagName('w:p'));
        const out = [];
        for (const p of ps) {
            const ts = Array.from(p.getElementsByTagName('w:t'));
            const text = ts.map((n) => (n && n.textContent ? n.textContent : '')).join('');
            const cleaned = (text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleaned) out.push(cleaned);
        }
        return out;
    }

    function parseSingleDoc(paragraphs, mushroomName) {
        const out = [];
        const titleRe = new RegExp(`^\\s*(\\d+\\s*[\\.、]?)?\\s*${mushroomName}\\s*(话语库)?\\s*$`);
        for (const raw of paragraphs) {
            const line = (raw || '').trim();
            if (!line) continue;
            if (titleRe.test(line)) continue;
            if (/话语库/.test(line) && line.length <= 12) continue;
            const cleaned = line
                .replace(/^\s*\d+\s*[\.\、)\]]\s*/g, '')
                .replace(/^\s*[-•]\s*/g, '')
                .trim();
            if (!cleaned) continue;
            out.push(cleaned);
        }
        return out;
    }

    async function loadFromJson(cid) {
        const file = JSON_MAP[cid];
        if (!file) return null;
        let res;
        try {
            res = await fetch(file, { cache: 'no-store' });
        } catch (_) {
            return null;
        }
        if (!res || !res.ok) return null;
        let data;
        try {
            data = await res.json();
        } catch (_) {
            return null;
        }
        if (!Array.isArray(data) || data.length === 0) return null;
        const cacheKey = CACHE_KEY_PREFIX + cid;
        localStorage.setItem(cacheKey, JSON.stringify({ hash: 'json', data }));
        return data;
    }

    async function loadFromDocx(cid) {
        if (typeof DecompressionStream !== 'function') return null;
        const file = FILE_MAP[cid];
        if (!file) return null;
        const res = await fetch(file, { cache: 'no-store' });
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const hash = fnv1a(bytes.subarray(0, Math.min(bytes.length, 16000)));

        const cacheKey = CACHE_KEY_PREFIX + cid;
        const cached = safeParse(localStorage.getItem(cacheKey), null);
        if (cached && cached.hash === hash && cached.data && typeof cached.data === 'object') {
            return cached.data;
        }

        const entry = findZipEntry(bytes, 'word/document.xml');
        if (!entry) return null;
        const data = extractZipData(bytes, entry);
        if (!data) return null;

        let xml = '';
        if (entry.method === 0) {
            xml = new TextDecoder('utf-8').decode(data);
        } else if (entry.method === 8) {
            xml = await inflateRawToString(data);
        } else {
            return null;
        }

        const paragraphs = xmlToParagraphs(xml);
        const name = TARGETS.find((t) => t.cid === cid)?.name || '';
        const parsed = parseSingleDoc(paragraphs, name);

        localStorage.setItem(cacheKey, JSON.stringify({ hash, data: parsed }));
        return parsed;
    }

    function randomInt(max) {
        if (max <= 1) return 0;
        const g = typeof globalThis !== 'undefined' ? globalThis : window;
        const c = g && g.crypto && typeof g.crypto.getRandomValues === 'function' ? g.crypto : null;
        if (!c) return Math.floor(Math.random() * max);
        const buf = new Uint32Array(1);
        const limit = Math.floor(0xffffffff / max) * max;
        let x = 0;
        do {
            c.getRandomValues(buf);
            x = buf[0] >>> 0;
        } while (x >= limit);
        return x % max;
    }

    function makeShuffleOrder(n) {
        const arr = Array.from({ length: n }, (_, i) => i);
        for (let i = arr.length - 1; i > 0; i--) {
            const j = randomInt(i + 1);
            const t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        return arr;
    }

    function nextFromShuffled(items, cid) {
        const key = SHUFFLE_PREFIX + cid;
        const state = safeParse(localStorage.getItem(key), null);
        let order = null;
        let i = 0;

        if (state && Array.isArray(state.order) && state.order.length === items.length) {
            order = state.order;
            i = typeof state.i === 'number' ? state.i : 0;
        }

        if (!order || i >= order.length) {
            order = makeShuffleOrder(items.length);
            i = 0;
        }

        const next = items[order[i] % items.length];
        localStorage.setItem(key, JSON.stringify({ order, i: i + 1 }));
        return next;
    }

    function fallbackQuestion(cid) {
        const name = TARGETS.find((t) => t.cid === cid)?.name || '对面菇';
        return `（${name}）话语库暂时无法读取。你愿意随便说一句现在最想说的话吗？`;
    }

    async function getQuestion(cid) {
        const items = (await loadFromJson(cid)) || (await loadFromDocx(cid));
        if (!items || !Array.isArray(items) || items.length === 0) {
            return fallbackQuestion(cid);
        }
        return nextFromShuffled(items, cid);
    }

    window.PhraseLibrary = {
        getQuestion
    };
})();
