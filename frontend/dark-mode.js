// Dark Mode Theme Manager
// Respects system preference and allows manual override

class ThemeManager {
    constructor() {
        this.THEME_KEY = 'ten-and-see-theme';
        this.LIGHT = 'light';
        this.DARK = 'dark';
        this.SYSTEM = 'system';
        this.init();
    }

    init() {
        // Load saved preference or default to system
        const saved = localStorage.getItem(this.THEME_KEY) || this.SYSTEM;
        this.setTheme(saved);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (localStorage.getItem(this.THEME_KEY) === this.SYSTEM || !localStorage.getItem(this.THEME_KEY)) {
                    this.applyTheme(e.matches ? this.DARK : this.LIGHT);
                }
            });
        }
    }

    setTheme(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
        
        if (theme === this.SYSTEM) {
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(isDark ? this.DARK : this.LIGHT);
        } else {
            this.applyTheme(theme);
        }
        
        this.updateThemeToggle();
    }

    applyTheme(theme) {
        const html = document.documentElement;
        if (theme === this.LIGHT) {
            html.setAttribute('data-theme', 'light');
        } else {
            html.removeAttribute('data-theme');
        }
    }

    toggleTheme() {
        const current = localStorage.getItem(this.THEME_KEY) || this.SYSTEM;
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const newTheme = isDark ? this.LIGHT : this.DARK;
        this.setTheme(newTheme);
    }

    updateThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            toggle.classList.toggle('light-mode', !isDark);
            toggle.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    }

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') === 'light' ? this.LIGHT : this.DARK;
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}