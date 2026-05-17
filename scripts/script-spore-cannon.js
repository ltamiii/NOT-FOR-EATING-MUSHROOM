(function() {
    const palette = [
        'rgba(255, 92, 160, 1)',
        'rgba(255, 173, 82, 1)',
        'rgba(74, 210, 205, 1)',
        'rgba(172, 146, 255, 1)',
        'rgba(255, 132, 110, 1)'
    ];
    const state = {
        raf: 0,
        particles: [],
        ctx: null,
        running: false,
        lastBurstAt: 0
    };

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function prefersReducedMotion() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (_) {
            return false;
        }
    }

    function randomBetween(a, b) {
        return a + Math.random() * (b - a);
    }

    function setupCanvas(canvas) {
        const dpr = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        state.ctx = ctx;
        return ctx;
    }

    function stop() {
        if (state.raf) cancelAnimationFrame(state.raf);
        state.raf = 0;
        state.running = false;
        state.particles = [];
    }

    function getAnchors(opts) {
        if (opts && opts.anchorEl && typeof opts.anchorEl.getBoundingClientRect === 'function') {
            const inputWrap = opts.anchorEl.closest ? opts.anchorEl.closest('.chat-inputbar-inner') : null;
            const r = inputWrap && typeof inputWrap.getBoundingClientRect === 'function'
                ? inputWrap.getBoundingClientRect()
                : opts.anchorEl.getBoundingClientRect();
            const y = clamp(r.top + r.height / 2, window.innerHeight * 0.25, window.innerHeight - 90);
            const leftX = clamp(r.left + 12, 0, window.innerWidth);
            const rightX = clamp(r.right - 12, 0, window.innerWidth);
            return { y, leftX, rightX };
        }
        return { y: window.innerHeight - 120, leftX: window.innerWidth * 0.5 - 120, rightX: window.innerWidth * 0.5 + 120 };
    }

    function spawnSide(side, xStart, y) {
        const count = Math.floor(randomBetween(18, 26));
        const baseAngle = side === 'left' ? -Math.PI * 0.42 : (-Math.PI + Math.PI * 0.42);
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + randomBetween(-Math.PI * 0.18, Math.PI * 0.18);
            const speed = randomBetween(13.0, 22.0);
            const radius = randomBetween(3.2, 7.0);
            const x = xStart;
            const jitterX = randomBetween(-8, 8);
            const jitterY = randomBetween(-10, 10);
            state.particles.push({
                x: x + jitterX,
                y: y + jitterY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                drag: randomBetween(0.972, 0.986),
                gravity: randomBetween(0.04, 0.1),
                life: 1,
                decay: randomBetween(0.012, 0.02),
                radius,
                color: palette[Math.floor(Math.random() * palette.length)],
                wobble: randomBetween(0.6, 1.35),
                seed: randomBetween(0, 1000)
            });
        }
    }

    function burst(opts) {
        const now = performance.now();
        if (now - state.lastBurstAt < 220) return;
        state.lastBurstAt = now;

        const canvas = document.getElementById('spore-overlay');
        if (!canvas) return;
        const ctx = state.ctx || setupCanvas(canvas);

        stop();

        if (prefersReducedMotion()) {
            canvas.classList.add('active');
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            setTimeout(() => canvas.classList.remove('active'), 160);
            return;
        }

        const a = getAnchors(opts);
        spawnSide('left', a.leftX, a.y);
        spawnSide('right', a.rightX, a.y);

        canvas.classList.add('active');
        state.running = true;

        let last = performance.now();
        const start = last;
        const duration = 1250;

        function step() {
            const t = performance.now();
            const dt = Math.min(34, t - last) / 16.6667;
            last = t;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            let alive = 0;
            for (const p of state.particles) {
                if (p.life <= 0) continue;
                alive += 1;

                const wobble = Math.sin((t * 0.007 + p.seed) * p.wobble) * 0.22;
                p.vx += wobble * dt;
                p.vx *= Math.pow(p.drag, dt);
                p.vy *= Math.pow(p.drag, dt);
                p.vy += p.gravity * 12 * dt;

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= p.decay * dt;

                const a = clamp(p.life, 0, 1);
                ctx.globalAlpha = a;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * (0.9 + (1 - a) * 0.25), 0, Math.PI * 2);
                ctx.fill();
            }

            if (alive > 0 && t - start < duration) {
                state.raf = requestAnimationFrame(step);
                return;
            }

            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            canvas.classList.remove('active');
            stop();
        }

        state.raf = requestAnimationFrame(step);
    }

    window.SporeCannon = {
        burst,
        resize: function() {
            const canvas = document.getElementById('spore-overlay');
            if (!canvas) return;
            setupCanvas(canvas);
        }
    };

    window.addEventListener('resize', () => {
        if (window.SporeCannon) window.SporeCannon.resize();
    });
})();
