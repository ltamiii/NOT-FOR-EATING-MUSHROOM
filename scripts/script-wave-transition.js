(() => {
  const KEY = '__wave_transition__';
  const KEY_DIR = '__wave_transition_dir__';
  const TRANSITION_MS = 950;
  const JUMP_AT_MS = Math.round(TRANSITION_MS * 0.66);

  const normalizeDir = (dir) => (dir === 'up' ? 'up' : 'down');
  const getStoredDir = () => {
    try {
      return normalizeDir(sessionStorage.getItem(KEY_DIR));
    } catch (e) {
      return 'down';
    }
  };

  const mountLiquid = () => {
    const existing = document.querySelector('.liquid[data-wave-transition-pre="1"]');
    if (existing) return existing;

    const liquid = document.createElement('div');
    liquid.className = 'liquid';
    (document.body || document.documentElement).appendChild(liquid);
    return liquid;
  };

  const cleanupPre = () => {
    const style = document.querySelector('style[data-wave-transition-pre="1"]');
    const liquid = document.querySelector('.liquid[data-wave-transition-pre="1"]');
    if (liquid) liquid.remove();
    if (style) style.remove();
  };

  const go = (href, opts) => {
    if (!href) return;

    const dir = normalizeDir(opts && opts.direction);

    const liquid = mountLiquid();
    liquid.dataset.dir = dir;

    let jumped = false;
    const jump = () => {
      if (jumped) return;
      jumped = true;
      sessionStorage.setItem(KEY, '1');
      sessionStorage.setItem(KEY_DIR, dir);
      window.location.href = href;
    };

    requestAnimationFrame(() => {
      liquid.getBoundingClientRect();
      requestAnimationFrame(() => {
        liquid.classList.add('active');
      });
    });

    liquid.addEventListener(
      'transitionend',
      (e) => {
        if (e.propertyName !== 'transform') return;
        jump();
      },
      { once: true }
    );

    window.setTimeout(jump, JUMP_AT_MS);
    window.setTimeout(jump, TRANSITION_MS + 160);
  };

  const revealIfNeeded = () => {
    if (sessionStorage.getItem(KEY) !== '1') return;
    sessionStorage.removeItem(KEY);
    const dir = getStoredDir();
    try {
      sessionStorage.removeItem(KEY_DIR);
    } catch (e) {}

    const liquid = mountLiquid();
    liquid.dataset.dir = dir;
    liquid.classList.add('active');

    const cleanup = () => {
      cleanupPre();
      liquid.remove();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        liquid.classList.remove('active');
      });
    });

    liquid.addEventListener(
      'transitionend',
      (e) => {
        if (e.propertyName !== 'transform') return;
        cleanup();
      },
      { once: true }
    );

    window.setTimeout(cleanup, TRANSITION_MS + 220);
  };

  window.WaveTransition = { go, revealIfNeeded };
  revealIfNeeded();
  document.addEventListener('DOMContentLoaded', revealIfNeeded);
})();
