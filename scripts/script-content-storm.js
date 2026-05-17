document.addEventListener('DOMContentLoaded', async () => {
    const svgWrap = document.getElementById('storm-svg-wrap');
    const svgHost = document.getElementById('storm-svg-host');
    const emptyEl = document.getElementById('storm-empty');
    const backBtn = document.getElementById('back-btn');
    if (!svgWrap || !svgHost) return;

    const pullSound = document.getElementById('pull-sound');
    const popSound = document.getElementById('pop-sound');

    let sceneType = 'confusing';
    let sceneFilename = 'confused mushroom-5.13.svg';
    let forcedScene = null;
    let ideaCount = 0;
    let allowInteraction = true;
    let triggers = {};
    let unlocked = false;

    try {
        const params = new URLSearchParams(window.location.search);
        const qsScene = (params.get('scene') || '').trim().toLowerCase();
        const dsScene = (document.body && document.body.dataset ? document.body.dataset.scene : '') || (svgWrap.dataset ? svgWrap.dataset.scene : '');
        const dsSceneNorm = String(dsScene || '').trim().toLowerCase();
        forcedScene = qsScene || dsSceneNorm || null;
    } catch (_) {}

    if (forcedScene === 'choco' || forcedScene === 'confusing') {
        sceneType = forcedScene === 'choco' ? 'choco' : 'confusing';
        sceneFilename = forcedScene === 'choco' ? 'choco-5.13.svg' : 'confused mushroom-5.13.svg';
    } else {
        forcedScene = null;
    }

    try {
        const s = window.StorageAPI && typeof window.StorageAPI.getNotifyState === 'function'
            ? window.StorageAPI.getNotifyState()
            : null;
        triggers = s && s.triggers ? s.triggers : {};
    } catch (_) {}

    try {
        const allIdeas = window.StorageAPI && typeof window.StorageAPI.getAll === 'function'
            ? await window.StorageAPI.getAll()
            : [];
        ideaCount = Array.isArray(allIdeas) ? allIdeas.length : 0;
        unlocked = ideaCount >= 8 || !!triggers.idea8;
        if (!forcedScene) {
            const canChoco = ideaCount >= 15 && !!triggers.firstPull;
            sceneType = canChoco ? 'choco' : 'confusing';
            sceneFilename = canChoco ? 'choco-5.13.svg' : 'confused mushroom-5.13.svg';
        }
    } catch (_) {}

    try {
        const pulled = sceneType === 'choco' ? !!triggers.chocoPull : !!triggers.firstPull;
        allowInteraction = unlocked && !pulled;
    } catch (_) {}

    try {
        if (sceneType === 'choco') document.title = '请勿食用此蘑菇 - 蘑古力酱';
    } catch (_) {}

    if (emptyEl) emptyEl.style.display = allowInteraction ? 'none' : 'grid';
    svgHost.style.display = allowInteraction ? '' : 'none';
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.PageTransition && typeof window.PageTransition.go === 'function') {
                window.PageTransition.go('content-ideas.html');
                return;
            }
            window.location.href = 'content-ideas.html';
        });
    }

    let svgEl = null;
    let mushroomEl = null;
    let mushroomWrapper = null;
    let hasMountedSvg = false;

    let pxToSvg = 1;
    let origin = { x: 0, y: 0 };

    const state = {
        isDragging: false,
        isPopped: false,
        isArmed: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        lastT: 0,
        lastVelY: 0,
        positionY: 0,
        velocityY: 0,
        dragLean: 0,
        springFrame: null,
        popFrame: null
    };

    const physics = {
        stiffness: 0.11,
        damping: 0.86
    };

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function updateScale() {
        if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        const vb = svgEl.viewBox && svgEl.viewBox.baseVal ? svgEl.viewBox.baseVal : null;
        if (!vb || rect.height <= 0) {
            pxToSvg = 1;
            return;
        }
        pxToSvg = vb.height / rect.height;
    }

    function getPopThresholdPx() {
        if (!mushroomWrapper) return -window.innerHeight * 0.28;
        const rect = mushroomWrapper.getBoundingClientRect();
        return -Math.min(window.innerHeight * 0.28, rect.height * 0.85);
    }

    function getBasePointClient() {
        if (!mushroomWrapper || !svgEl || !svgEl.createSVGPoint) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const pt = svgEl.createSVGPoint();
        pt.x = origin.x;
        pt.y = origin.y;
        const m = mushroomWrapper.getScreenCTM();
        if (!m) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const p = pt.matrixTransform(m);
        return { x: p.x, y: p.y };
    }

    function applyMushroomTransform(nowMs = performance.now()) {
        if (!mushroomWrapper) return;
        const pullPx = -Math.min(0, state.positionY);
        const thresholdPx = -getPopThresholdPx();
        const progress = clamp(thresholdPx > 0 ? pullPx / (thresholdPx * 1.05) : 0, 0, 1);

        const tremor = Math.sin(nowMs * 0.02 + progress * 2.4) * progress * 1.15;
        const swayX = (Math.sin(nowMs * 0.018 + progress * 1.7) * 0.9 + state.dragLean * 3.2) * progress;
        const rot = (state.dragLean * 4.2 + Math.sin(nowMs * 0.012) * 1.2) * progress;

        const sx = 1 - progress * 0.028;
        const sy = 1 + progress * 0.055;

        const tx = (swayX * pxToSvg).toFixed(3);
        const ty = ((state.positionY + tremor) * pxToSvg).toFixed(3);
        const ox = origin.x.toFixed(3);
        const oy = origin.y.toFixed(3);

        const t = `translate(${tx} ${ty}) translate(${ox} ${oy}) rotate(${rot.toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${(-origin.x).toFixed(3)} ${(-origin.y).toFixed(3)})`;
        mushroomWrapper.setAttribute('transform', t);
    }

    function stopSpring() {
        if (state.springFrame) cancelAnimationFrame(state.springFrame);
        state.springFrame = null;
    }

    function stopPop() {
        if (state.popFrame) cancelAnimationFrame(state.popFrame);
        state.popFrame = null;
    }

    function springLoop(prevMs) {
        if (state.isDragging || state.isPopped) return;
        const now = performance.now();
        const dt = Math.min(34, now - (prevMs || now)) / 16.6667;

        const force = -physics.stiffness * state.positionY;
        state.velocityY += force * dt;
        state.velocityY *= Math.pow(physics.damping, dt);
        state.positionY += state.velocityY * dt;
        state.dragLean *= Math.pow(0.8, dt);

        applyMushroomTransform(now);

        if (Math.abs(state.positionY) > 0.6 || Math.abs(state.velocityY) > 0.6 || Math.abs(state.dragLean) > 0.02) {
            state.springFrame = requestAnimationFrame(() => springLoop(now));
        } else {
            state.positionY = 0;
            state.velocityY = 0;
            state.dragLean = 0;
            applyMushroomTransform(now);
            stopSpring();
        }
    }

    function onPointerDown(e) {
        if (!allowInteraction) return;
        if (state.isPopped || !mushroomWrapper) return;
        if (state.pointerId !== null) return;
        state.isDragging = true;
        state.isArmed = false;
        state.pointerId = e.pointerId;
        state.startX = e.clientX;
        state.startY = e.clientY;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.lastT = performance.now();
        state.lastVelY = 0;

        stopSpring();
        stopPop();

        try {
            mushroomWrapper.setPointerCapture(e.pointerId);
        } catch (_) {}

        try {
            if (pullSound) {
                pullSound.currentTime = 0;
                pullSound.play().catch(() => {});
            }
        } catch (_) {}
    }

    function onPointerMove(e) {
        if (!state.isDragging || state.isPopped) return;
        if (e.pointerId !== state.pointerId) return;

        const now = performance.now();
        const dy = e.clientY - state.startY;
        const dx = e.clientX - state.startX;

        const dt = Math.max(10, now - state.lastT);
        state.lastVelY = (e.clientY - state.lastY) / dt;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.lastT = now;

        state.dragLean = clamp(dx / 220, -1, 1);

        if (dy < 0) {
            const threshold = getPopThresholdPx();
            const x = -dy;
            const maxDist = -threshold * 1.55;
            const visualDist = maxDist * (1 - Math.exp(-x / (maxDist * 0.65)));
            state.positionY = -visualDist;

            applyMushroomTransform(now);

            state.isArmed = state.positionY <= threshold;
        } else {
            state.positionY *= 0.72;
            applyMushroomTransform(now);
        }
    }

    function onPointerUp(e) {
        if (!state.isDragging || state.isPopped) return;
        if (e && e.pointerId !== state.pointerId) return;
        state.isDragging = false;
        state.pointerId = null;

        if (state.isArmed) {
            popMushroom();
            return;
        }

        state.velocityY = clamp(state.lastVelY * 260, -18, 10);
        springLoop();

        try {
            if (pullSound) pullSound.pause();
        } catch (_) {}
    }

    function popMushroom() {
        if (state.isPopped) return;
        state.isPopped = true;
        state.isDragging = false;
        state.isArmed = false;
        state.pointerId = null;
        stopSpring();

        try {
            if (pullSound) pullSound.pause();
            if (popSound) {
                popSound.currentTime = 0;
                popSound.play().catch(() => {});
            }
        } catch (_) {}

        if (navigator.vibrate) {
            navigator.vibrate([70, 45, 120]);
        }

        const rect = mushroomWrapper.getBoundingClientRect();
        const capX = rect.left + rect.width / 2;
        const capY = rect.top + rect.height * 0.24;
        createParticles(capX, capY - 10);

        const start = performance.now();
        const duration = 320;
        const baseY = state.positionY;

        function popLoop() {
            const now = performance.now();
            const t = clamp((now - start) / duration, 0, 1);
            state.positionY = baseY + (-10) * easeOutCubic(t);
            applyMushroomTransform(now);
            const alpha = 1 - easeOutCubic(t);
            mushroomWrapper.style.opacity = String(alpha);
            mushroomWrapper.setAttribute('opacity', String(alpha));

            if (t < 1) {
                state.popFrame = requestAnimationFrame(popLoop);
            } else {
                mushroomWrapper.style.display = 'none';
                stopPop();
            }
        }

        popLoop();

        if (window.StorageAPI && typeof window.StorageAPI.getNotifyState === 'function') {
            const s = window.StorageAPI.getNotifyState();
            if (!s.triggers) s.triggers = {};
            if (!s.unread) s.unread = { messages: false };
            if (!s.conversations) s.conversations = {};

            const pushConvMessage = (cid, title, text, ts) => {
                const conv = s.conversations[cid] || { id: cid, title: title || cid, unread: false, messages: [] };
                conv.title = title || conv.title;
                if (!Array.isArray(conv.messages)) conv.messages = [];
                conv.messages.unshift({ text, ts, from: 'mushroom' });
                conv.unread = true;
                s.conversations[cid] = conv;
                s.unread.messages = true;
                s.basketPulse = true;
            };

            const baseTs = Date.now();

            if (sceneType === 'confusing') {
                if (!s.triggers.firstPull) {
                    s.triggers.firstPull = true;
                    pushConvMessage('mushroom', '灵感菇', '你刚刚拔出的菇叫迷惑菇哦', baseTs);
                    pushConvMessage('mushroom', '灵感菇', '它会对你的判卷老师进行迷惑，你的答案在老师眼中会变成正确答案，快说谢谢迷惑菇～(-.-)', baseTs + 1);
                    pushConvMessage('confusing', '迷惑菇', '下牛好！我迷惑菇^ - ^', baseTs + 2);
                    window.StorageAPI.setNotifyState(s);
                }
            } else if (sceneType === 'choco') {
                if (!s.triggers.chocoPull) {
                    s.triggers.chocoPull = true;
                    pushConvMessage('storm', '蘑古力酱', '你甜甜的微笑 就像…蘑古力酱！', baseTs);
                    window.StorageAPI.setNotifyState(s);
                }
            }
        }

        setTimeout(() => {
            if (window.PageTransition && typeof window.PageTransition.go === 'function') {
                window.PageTransition.go('content-ideas.html');
                return;
            }
            window.location.href = 'content-ideas.html';
        }, 1500);
    }

    function setupCanvas(canvas) {
        const dpr = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return ctx;
    }

    function createParticles(x, y) {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        const ctx = setupCanvas(canvas);

        const particles = [];
        const colors = ['#9b59b6', '#d97757', '#6a9bcc', '#a8e6cf', '#f1c40f', '#4b735f', '#f4f7dd'];
        const count = 220;
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = Math.random() * 14 + 10;
            const size = Math.random() * 2.6 + 1.2;
            const ox = (Math.random() - 0.5) * 18;
            const oy = (Math.random() - 0.5) * 12;
            particles.push({
                x: x + ox,
                y: y + oy,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                drag: 0.992,
                gravity: 0.18,
                life: 1,
                decay: Math.random() * 0.018 + 0.012,
                size,
                color: colors[(Math.random() * colors.length) | 0]
            });
        }

        let last = performance.now();

        function step() {
            const now = performance.now();
            const dt = Math.min(34, now - last) / 16.6667;
            last = now;

            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            let alive = 0;
            for (const p of particles) {
                if (p.life <= 0) continue;
                alive += 1;

                p.vx *= Math.pow(p.drag, dt);
                p.vy *= Math.pow(p.drag, dt);
                p.vy += p.gravity * 12 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= p.decay * dt;

                const alpha = clamp(p.life, 0, 1);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            if (alive > 0) {
                requestAnimationFrame(step);
            } else {
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            }
        }

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        step();
    }

    function sanitizeSvgDoc(doc) {
        doc.querySelectorAll('script').forEach(n => n.remove());
        doc.querySelectorAll('*').forEach(n => {
            for (const attr of Array.from(n.attributes || [])) {
                if (/^on/i.test(attr.name)) n.removeAttribute(attr.name);
            }
        });
    }

    function mountSvg(svgNode) {
        if (!svgNode || hasMountedSvg) return;
        hasMountedSvg = true;

        const vb = svgNode.viewBox && svgNode.viewBox.baseVal ? svgNode.viewBox.baseVal : null;
        if (vb && vb.width > 0 && vb.height > 0) {
            svgWrap.style.setProperty('--scene-ar', `${vb.width} / ${vb.height}`);
            svgWrap.style.width = `min(96vw, 980px, calc(78svh * ${(vb.width / vb.height).toFixed(5)}))`;
        }

        svgNode.classList.add('storm-svg');
        svgNode.removeAttribute('width');
        svgNode.removeAttribute('height');
        svgNode.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        svgHost.innerHTML = '';
        svgHost.appendChild(document.importNode(svgNode, true));

        svgEl = svgHost.querySelector('svg');
        if (!svgEl) return;

        svgWrap.classList.add('is-ready');
        updateScale();

        mushroomEl =
            svgEl.querySelector('g[vectornator\\:layerName="mushroom"]') ||
            svgEl.querySelector('g#mushroom');

        if (!mushroomEl) {
            const candidates = Array.from(svgEl.querySelectorAll('g'));
            mushroomEl = candidates.find(g => g.getAttribute('vectornator:layerName') === 'mushroom' || g.getAttribute('inkscape:label') === 'mushroom');
        }
        if (!mushroomEl) return;
        if (!allowInteraction) return;

        mushroomWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        mushroomWrapper.setAttribute('id', 'mushroom-drag');

        const parent = mushroomEl.parentNode;
        parent.insertBefore(mushroomWrapper, mushroomEl);
        mushroomWrapper.appendChild(mushroomEl);

        requestAnimationFrame(() => {
            const bbox = mushroomWrapper.getBBox();
            origin = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height };
            applyMushroomTransform();
        });

        mushroomWrapper.addEventListener('pointerdown', onPointerDown);
        mushroomWrapper.addEventListener('pointermove', onPointerMove, { passive: true });
        mushroomWrapper.addEventListener('pointerup', onPointerUp, { passive: true });
        mushroomWrapper.addEventListener('pointercancel', onPointerUp, { passive: true });
    }

    async function loadSceneSvg() {
        try {
            const res = await fetch(sceneFilename, { cache: 'no-cache' });
            const text = await res.text();
            const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
            sanitizeSvgDoc(doc);
            mountSvg(doc.documentElement);
        } catch (_) {
            const fallback = document.getElementById('storm-svg-fallback');
            if (fallback && fallback.tagName.toLowerCase() === 'object') {
                fallback.setAttribute('data', sceneFilename);
            }
            svgWrap.classList.add('is-ready');
        }
    }

    window.addEventListener('resize', () => {
        updateScale();
        const canvas = document.getElementById('particle-canvas');
        if (canvas) setupCanvas(canvas);
    });

    const fallback = document.getElementById('storm-svg-fallback');
    if (fallback && fallback.tagName.toLowerCase() === 'object') {
        fallback.setAttribute('data', sceneFilename);
        fallback.addEventListener('load', () => {
            if (hasMountedSvg) return;
            svgWrap.classList.add('is-ready');
            try {
                const doc = fallback.contentDocument;
                const svg = doc && doc.querySelector && doc.querySelector('svg');
                if (!doc || !svg) return;
                sanitizeSvgDoc(doc);
                mountSvg(svg);
            } catch (_) {}
        });
    }

    if (window.location.protocol !== 'file:') {
        loadSceneSvg();
    }
});
