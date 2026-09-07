(function () {
    const STORAGE_KEY = 'gp_theme';
    const THEMES = ['light', 'dark', 'colorblind'];

    function applyTheme(theme) {
        if (!THEMES.includes(theme)) theme = 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
        document.querySelectorAll('.theme-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }

    function init() {
        var saved = localStorage.getItem(STORAGE_KEY) || 'light';
        applyTheme(saved);

        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (btn) applyTheme(btn.dataset.theme);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.applyTheme = applyTheme;
    window.getCurrentTheme = function () {
        return localStorage.getItem(STORAGE_KEY) || 'light';
    };
})();
