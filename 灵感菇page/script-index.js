document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast-message');
    const heroObject = document.getElementById('hero-svg');
    let isClicked = false;

    const go = (href) => {
        if (window.PageTransition && typeof window.PageTransition.go === 'function') {
            window.PageTransition.go(href);
            return;
        }
        window.location.href = href;
    };

    const handleMushroomClick = () => {
        if (isClicked) return;
        isClicked = true;

        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        if (toast) {
            toast.classList.add('show');
        }

        setTimeout(() => {
            if (window.WaveTransition && typeof window.WaveTransition.go === 'function') {
                window.WaveTransition.go('content-ideas.html', { direction: 'up' });
                return;
            }
            go('content-ideas.html');
        }, 1500);
    };

    const injectCssToSvg = async (doc) => {
        try {
            const res = await fetch('灵感菇page/style-index.css', { cache: 'no-store' });
            if (!res.ok) return;
            const cssText = await res.text();
            const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
            style.textContent = cssText;
            doc.documentElement.appendChild(style);
        } catch (_) {}
    };

    const bindSvg = async (doc) => {
        await injectCssToSvg(doc);

        const mushroom = doc.getElementById('mushroom-dy');
        if (mushroom) {
            mushroom.style.cursor = 'pointer';
            mushroom.addEventListener('click', handleMushroomClick);
        }

        const particles = doc.querySelectorAll('#particle-dy > *');
        particles.forEach((el) => {
            const dx = (Math.random() * 56 - 28).toFixed(2) + 'px';
            const dy = (Math.random() * 68 - 34).toFixed(2) + 'px';
            const rot = (Math.random() * 42 - 21).toFixed(2) + 'deg';
            const dur = (Math.random() * 5 + 5).toFixed(2) + 's';
            const delay = (Math.random() * 4).toFixed(2) + 's';

            el.style.setProperty('--dx', dx);
            el.style.setProperty('--dy', dy);
            el.style.setProperty('--rot', rot);
            el.style.setProperty('--dur', dur);
            el.style.setProperty('--delay', delay);
        });

        const dyLayer = doc.querySelector('[vectornator\\:layerName="dy"]');
        if (dyLayer) {
            dyLayer.style.transformBox = 'fill-box';
            dyLayer.style.transformOrigin = 'center';

            dyLayer.animate(
                [
                    { transform: 'rotate(-1.6deg) scale(1)' },
                    { transform: 'rotate(1.6deg) scale(1.03)' }
                ],
                {
                    duration: 3600,
                    iterations: Infinity,
                    direction: 'alternate',
                    easing: 'ease-in-out'
                }
            );
        }
    };

    if (heroObject) {
        heroObject.addEventListener('load', () => {
            const doc = heroObject.contentDocument;
            if (!doc) return;
            bindSvg(doc);
        });
    }
});
