document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-btn');
    const basketBtn = document.getElementById('basket-btn');
    const basketWrapper = document.getElementById('basket-wrapper');
    const basketMenu = document.getElementById('basket-menu');
    const moreBtn = document.getElementById('more-btn');

    const basketMessages = document.getElementById('basket-messages');
    const basketStorm = document.getElementById('basket-storm');
    const basketFavorites = document.getElementById('basket-favorites');

    const dotMessages = document.getElementById('dot-messages');

    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('drawer');
    const drawerClose = document.getElementById('drawer-close');
    const drawerPanel = document.getElementById('drawer-panel');

    const prefs = {
        themeKey: 'mushroom_pref_theme'
    };

    function getPref(key, fallback) {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : raw;
    }

    function setPref(key, value) {
        localStorage.setItem(key, value);
    }

    function applyPrefs() {
        const theme = getPref(prefs.themeKey, 'day');

        document.documentElement.dataset.theme = theme;
    }

    function go(href) {
        if (!href) return;
        if (window.PageTransition && typeof window.PageTransition.go === 'function') {
            window.PageTransition.go(href);
            return;
        }
        window.location.href = href;
    }

    function setBasketOpen(open) {
        if (!basketMenu) return;
        basketMenu.classList.toggle('open', open);
        if (open && window.StorageAPI) {
            const state = window.StorageAPI.getNotifyState();
            if (state.basketPulse) {
                state.basketPulse = false;
                window.StorageAPI.setNotifyState(state);
                renderNotifyIndicators();
            }
        }
    }

    function openDrawer() {
        if (!drawer || !drawerOverlay) return;
        drawer.classList.add('open');
        drawerOverlay.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
    }

    function closeDrawer() {
        if (!drawer || !drawerOverlay) return;
        drawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        if (drawerPanel) drawerPanel.classList.remove('open');
        lastPanelKind = '';
        lastPanelAnchor = null;
    }

    let lastPanelKind = '';
    let lastPanelAnchor = null;

    function positionPanel(anchorEl) {
        if (!drawerPanel) return;
        if (!anchorEl) return;
        anchorEl.insertAdjacentElement('afterend', drawerPanel);
    }

    function openPanel(kind, anchorEl) {
        if (!drawerPanel) return;
        const same =
            kind &&
            kind === lastPanelKind &&
            drawerPanel.classList.contains('open') &&
            anchorEl &&
            anchorEl === lastPanelAnchor;
        if (same) {
            drawerPanel.classList.remove('open');
            lastPanelKind = '';
            lastPanelAnchor = anchorEl || null;
            return;
        }
        lastPanelKind = kind;
        lastPanelAnchor = anchorEl || lastPanelAnchor;
        positionPanel(anchorEl);
        drawerPanel.classList.add('open');

        if (kind === 'theme') {
            const current = getPref(prefs.themeKey, 'day');
            drawerPanel.innerHTML = `
                <div class="panel-options">
                    <button class="panel-option ${current === 'day' ? 'active' : ''}" data-pref="${prefs.themeKey}" data-value="day" type="button">白昼模式</button>
                    <button class="panel-option ${current === 'night' ? 'active' : ''}" data-pref="${prefs.themeKey}" data-value="night" type="button">夜游模式</button>
                </div>
            `;
            return;
        }

        if (kind === 'export') {
            drawerPanel.innerHTML = `
                <div class="panel-sub">1. 点击🫧即可将单张灵感卡片导出为JPG<br>2. 点击选择-选择多张灵感卡片-点击导出，可选择导出为DOCX或PDF格式</div>
            `;
            return;
        }

        drawerPanel.classList.remove('open');
    }

    function renderNotifyIndicators() {
        if (!window.StorageAPI) return;
        const state = window.StorageAPI.getNotifyState();
        if (basketBtn) basketBtn.classList.toggle('basket-pulse', !!state.basketPulse);

        const hasUnreadMessages = !!state.unread.messages || Object.values(state.conversations || {}).some((c) => !!(c && c.unread));
        if (dotMessages) dotMessages.classList.toggle('show', hasUnreadMessages);
    }

    applyPrefs();

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const href = document.body && document.body.dataset ? document.body.dataset.backHref : '';
            go(href || 'content-ideas.html');
        });
    }

    if (basketBtn && basketMenu && basketWrapper) {
        basketBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setBasketOpen(!basketMenu.classList.contains('open'));
        });

        document.addEventListener('click', (e) => {
            if (!basketWrapper.contains(e.target)) setBasketOpen(false);
        });
    }

    if (basketMessages) {
        basketMessages.addEventListener('click', (e) => {
            e.stopPropagation();
            go('content-ideas-messages.html');
        });
    }

    if (basketStorm) {
        basketStorm.addEventListener('click', (e) => {
            e.stopPropagation();
            go('content-storm.html');
        });
    }

    if (basketFavorites) {
        basketFavorites.addEventListener('click', (e) => {
            e.stopPropagation();
            go('content-ideas-favorites.html');
        });
    }

    if (moreBtn) {
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openDrawer();
        });
    }

    if (drawerClose) {
        drawerClose.addEventListener('click', () => closeDrawer());
    }

    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', () => closeDrawer());
    }

    if (drawer) {
        drawer.addEventListener('click', (e) => {
            const target = e.target;
            if (!target || !(target instanceof HTMLElement)) {
                e.stopPropagation();
                return;
            }

            const prefKey = target.getAttribute('data-pref');
            const value = target.getAttribute('data-value');
            if (prefKey && value !== null) {
                setPref(prefKey, value);
                applyPrefs();
                if (lastPanelKind === 'theme') openPanel('theme');
            }

            e.stopPropagation();
        });
    }

    document.addEventListener('click', () => closeDrawer());

    document.querySelectorAll('[data-drawer-action]').forEach((el) => {
        el.addEventListener('click', (e) => {
            const action = el.getAttribute('data-drawer-action');
            if (action === 'about') {
                go('content-about-forest.html');
                return;
            }
            openPanel(action, el);
        });
    });

    window.IdeasShell = {
        renderNotifyIndicators
    };

    renderNotifyIndicators();
});
