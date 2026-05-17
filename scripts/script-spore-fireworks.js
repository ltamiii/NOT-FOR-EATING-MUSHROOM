(function() {
    const palette = [
        { core: 'rgba(217, 119, 87, 0.95)', mid: 'rgba(217, 119, 87, 0.38)' },
        { core: 'rgba(106, 155, 204, 0.95)', mid: 'rgba(106, 155, 204, 0.38)' },
        { core: 'rgba(120, 140, 93, 0.95)', mid: 'rgba(120, 140, 93, 0.38)' },
        { core: 'rgba(241, 196, 15, 0.92)', mid: 'rgba(241, 196, 15, 0.36)' },
        { core: 'rgba(255, 95, 197, 0.9)', mid: 'rgba(255, 95, 197, 0.32)' }
    ];

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
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

    function createSprite(size, colors) {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        const r = size / 2;
        const g = ctx.createRadialGradient(r, r, 0, r, r, r);
        g.addColorStop(0, colors.core);
        g.addColorStop(0.35, colors.mid);
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        return c;
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

    function sporeFireworks() {
        const canvas = document.getElementById('spore-overlay');
        if (!canvas) return;

        if (prefersReducedMotion()) {
            canvas.classList.add('active');
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            setTimeout(() => canvas.classList.remove('active'), 160);
            return;
        }

        const ctx = setupCanvas(canvas);
        const sprites = palette.map((c) => createSprite(96, c));
        const particles = [];

        const burstCount = Math.floor(randomBetween(7, 11));
        const nowSeed = (performance.now() * 0.001) % 1000;

        function spawnBurst(cx, cy, tone) {
            const count = Math.floor(randomBetween(44, 72));
            for (let i = 0; i < count; i++) {
                const a = randomBetween(0, Math.PI * 2);
                const speed = randomBetween(4.5, 11.5);
                const jitter = randomBetween(0.6, 1.1);
                particles.push({
                    x: cx + randomBetween(-12, 12),
                    y: cy + randomBetween(-12, 12),
                    vx: Math.cos(a) * speed * jitter,
                    vy: Math.sin(a) * speed * jitter,
                    drag: randomBetween(0.968, 0.985),
                    gravity: randomBetween(0.05, 0.14),
                    spin: randomBetween(-0.13, 0.13),
                    rot: randomBetween(0, Math.PI * 2),
                    life: 1,
                    decay: randomBetween(0.012, 0.02),
                    size: randomBetween(18, 58),
                    sprite: tone,
                    seed: nowSeed + i * 0.37
                });
            }
        }

        for (let i = 0; i < burstCount; i++) {
            const x = randomBetween(window.innerWidth * 0.12, window.innerWidth * 0.88);
            const y = randomBetween(window.innerHeight * 0.18, window.innerHeight * 0.68);
            spawnBurst(x, y, i % sprites.length);
        }

        canvas.classList.add('active');
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        let last = performance.now();
        const start = last;
        const duration = 2200;

        function step() {
            const now = performance.now();
            const dt = Math.min(34, now - last) / 16.6667;
            last = now;

            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            ctx.globalCompositeOperation = 'lighter';

            const t = now * 0.0016;
            let alive = 0;
            for (const p of particles) {
                if (p.life <= 0) continue;
                alive += 1;

                const swirl = Math.sin((p.y * 0.02 + t) + p.seed) * 0.22;
                const curl = Math.cos((p.x * 0.02 - t * 1.2) + p.seed * 0.7) * 0.18;

                p.vx += swirl * dt;
                p.vy += curl * dt;

                p.vx *= Math.pow(p.drag, dt);
                p.vy *= Math.pow(p.drag, dt);
                p.vy += p.gravity * 12 * dt;

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += p.spin * dt;
                p.life -= p.decay * dt;

                const a = clamp(p.life, 0, 1);
                ctx.globalAlpha = a;
                const draw = p.size * (0.88 + (1 - a) * 0.5);
                const half = draw / 2;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.drawImage(sprites[p.sprite], -half, -half, draw, draw);
                ctx.restore();
            }

            if (alive > 0 && now - start < duration) {
                requestAnimationFrame(step);
                return;
            }

            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            canvas.classList.remove('active');
        }

        requestAnimationFrame(step);
    }

    window.SporeFireworks = {
        burst: sporeFireworks,
        resize: function() {
            const canvas = document.getElementById('spore-overlay');
            if (!canvas) return;
            setupCanvas(canvas);
        }
    };

    window.addEventListener('resize', () => {
        if (window.SporeFireworks) window.SporeFireworks.resize();
    });
})();

