document.addEventListener('DOMContentLoaded', () => {
    const targetHref = 'linggan-mushroom.html';
    const minAfterImageMs = 1200;
    const maxWaitMs = 6500;

    const go = () => {
        if (window.WaveTransition && typeof window.WaveTransition.go === 'function') {
            window.WaveTransition.go(targetHref);
            return;
        }
        window.location.href = targetHref;
    };

    let jumped = false;
    const safeGo = () => {
        if (jumped) return;
        jumped = true;
        go();
    };

    const startAt = Date.now();
    let imgLoadedAt = null;
    let tickTimer = null;
    const tick = () => {
        if (jumped) return;
        const now = Date.now();
        if (imgLoadedAt && now - imgLoadedAt >= minAfterImageMs) {
            safeGo();
            return;
        }
        if (now - startAt >= maxWaitMs) {
            safeGo();
            return;
        }
        tickTimer = window.setTimeout(tick, 80);
    };

    const splash = document.querySelector('.splash');
    if (splash) {
        splash.addEventListener(
            'click',
            () => {
                if (tickTimer) window.clearTimeout(tickTimer);
                safeGo();
            },
            { once: true }
        );
    }

    const img = document.querySelector('.splash__img');
    if (img && img instanceof HTMLImageElement) {
        const markLoaded = () => {
            if (imgLoadedAt) return;
            imgLoadedAt = Date.now();
        };
        if (img.complete && img.naturalWidth > 0) {
            markLoaded();
        } else {
            img.addEventListener('load', markLoaded, { once: true });
            img.addEventListener('error', markLoaded, { once: true });
        }
    } else {
        imgLoadedAt = Date.now();
    }

    tick();
});
