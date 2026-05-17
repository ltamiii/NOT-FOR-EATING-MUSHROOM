(() => {
    const safeGet = (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    };

    const theme = safeGet('mushroom_pref_theme') || 'day';
    document.documentElement.dataset.theme = theme;
    const themeColor = theme === 'night' ? '#0e1d2d' : '#a8e6cf';
    document.documentElement.style.backgroundColor = themeColor;

    const head = document.head || document.getElementsByTagName('head')[0];
    const ensureMeta = (name, content) => {
        if (!head) return;
        const existing = head.querySelector(`meta[name="${name}"]`);
        const el = existing || document.createElement('meta');
        el.setAttribute('name', name);
        el.setAttribute('content', content);
        if (!existing) head.appendChild(el);
    };
    const ensureLink = (rel, href, extra) => {
        if (!head) return;
        const existing = head.querySelector(`link[rel="${rel}"]`);
        const el = existing || document.createElement('link');
        el.setAttribute('rel', rel);
        el.setAttribute('href', href);
        if (extra && typeof extra === 'object') {
            Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
        }
        if (!existing) head.appendChild(el);
    };

    ensureMeta('theme-color', themeColor);
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    ensureMeta('apple-mobile-web-app-title', '请勿食用此蘑菇');
    ensureMeta('mobile-web-app-capable', 'yes');
    ensureLink('manifest', 'manifest.webmanifest');
    ensureLink('icon', 'sign.png', { type: 'image/png' });
    ensureLink('apple-touch-icon', 'icons/app-icon-180.png');

    try {
        if (sessionStorage.getItem('__wave_transition__') === '1') {
            const dir = sessionStorage.getItem('__wave_transition_dir__') === 'up' ? 'up' : 'down';
            const style = document.createElement('style');
            style.setAttribute('data-wave-transition-pre', '1');
            style.textContent = `
.liquid[data-wave-transition-pre="1"] {
  position: fixed;
  left: -15%;
  top: -160vh;
  width: 130%;
  height: 160vh;
  background: var(--transition-liquid, #56bbb9);
  border-bottom-left-radius: 44% 18%;
  border-bottom-right-radius: 56% 20%;
  z-index: 9999;
  transform: translate3d(0, 0, 0);
  will-change: transform;
  pointer-events: none;
  transition: transform 0.95s cubic-bezier(0.22, 1, 0.36, 1);
}
.liquid[data-wave-transition-pre="1"].active {
  transform: translateY(160vh);
}
.liquid[data-wave-transition-pre="1"][data-dir="up"] {
  top: auto;
  bottom: -160vh;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: 44% 18%;
  border-top-right-radius: 56% 20%;
}
.liquid[data-wave-transition-pre="1"][data-dir="up"].active {
  transform: translateY(-160vh);
}
`;

            const liquid = document.createElement('div');
            liquid.className = 'liquid active';
            liquid.setAttribute('data-wave-transition-pre', '1');
            liquid.dataset.dir = dir;

            document.documentElement.appendChild(style);
            document.documentElement.appendChild(liquid);
        }
    } catch (e) {}

    window.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.backgroundColor = '';
        try {
            const canSW = 'serviceWorker' in navigator;
            const secure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
            if (canSW && secure) navigator.serviceWorker.register('service-worker.js').catch(() => {});
        } catch (_) {}
    });
})();
