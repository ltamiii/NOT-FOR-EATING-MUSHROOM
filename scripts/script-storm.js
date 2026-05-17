document.addEventListener('DOMContentLoaded', () => {
    // 模拟风暴加载，3秒后进入互动页
    setTimeout(() => {
        if (window.PageTransition && typeof window.PageTransition.go === 'function') {
            window.PageTransition.go('content-storm.html');
            return;
        }
        window.location.href = 'content-storm.html';
    }, 3000);
});
