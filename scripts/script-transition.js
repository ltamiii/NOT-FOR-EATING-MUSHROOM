(() => {
    const DURATION = 180;
    const LOCK_ATTR = 'data-transition-lock';
    const WAVE_SKIP = new Set(['loading-dance.html']);

    function prefersReducedMotion() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    }

    function getFileName(href) {
        try {
            const url = new URL(href, window.location.href);
            const path = url.pathname || '';
            const parts = path.split('/').filter(Boolean);
            return parts[parts.length - 1] || '';
        } catch (e) {
            return '';
        }
    }

    function canUseWave(href) {
        if (!window.WaveTransition || typeof window.WaveTransition.go !== 'function') return false;
        const fileName = getFileName(href);
        if (WAVE_SKIP.has(fileName)) return false;
        return true;
    }

    function lock() {
        if (document.documentElement.getAttribute(LOCK_ATTR) === '1') return false;
        document.documentElement.setAttribute(LOCK_ATTR, '1');
        return true;
    }

    function cleanup() {
        document.documentElement.classList.remove('page-leaving');
        document.documentElement.removeAttribute(LOCK_ATTR);
    }

    function go(href) {
        if (!href) return;
        if (prefersReducedMotion()) {
            window.location.href = href;
            return;
        }

        if (!lock()) return;

        if (canUseWave(href)) {
            window.WaveTransition.go(href);
            return;
        }

        document.documentElement.classList.add('page-leaving');
        window.setTimeout(() => {
            window.location.href = href;
        }, DURATION);
    }

    window.PageTransition = { go };

    window.addEventListener('pageshow', cleanup);
})();
