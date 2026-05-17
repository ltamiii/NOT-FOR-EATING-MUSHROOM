document.addEventListener('DOMContentLoaded', () => {
    const targetHref = 'linggan-mushroom.html';

    const go = () => {
        if (window.WaveTransition && typeof window.WaveTransition.go === 'function') {
            window.WaveTransition.go(targetHref);
            return;
        }
        window.location.href = targetHref;
    };

    const timer = window.setTimeout(go, 3000);

    const splash = document.querySelector('.splash');
    if (splash) {
        splash.addEventListener(
            'click',
            () => {
                window.clearTimeout(timer);
                go();
            },
            { once: true }
        );
    }
});
