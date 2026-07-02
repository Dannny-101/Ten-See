/**
 * Ten&See global theme — light / dark / system preference
 * Storage key: tenandsee-theme ('light' | 'dark' | unset = follow system)
 */
(function () {
  const STORAGE_KEY = 'tenandsee-theme';
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  function getStored() {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  }

  function systemTheme() {
    return mq.matches ? 'dark' : 'light';
  }

  function resolveTheme() {
    return getStored() || systemTheme();
  }

  function apply(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
    document.querySelectorAll('[data-theme-toggle]').forEach(updateToggleA11y);
    const logo = document.getElementById('navLogo');
    if (logo) logo.src = t === 'dark' ? '/assets/logo-dm.png' : '/assets/logo-lm.png';
    return t;
  }

  function updateToggleA11y(btn) {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    btn.setAttribute(
      'aria-label',
      theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
    );
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function setTheme(mode) {
    if (mode === 'system') {
      localStorage.removeItem(STORAGE_KEY);
      return apply(systemTheme());
    }
    if (mode !== 'light' && mode !== 'dark') return resolveTheme();
    localStorage.setItem(STORAGE_KEY, mode);
    return apply(mode);
  }

  function toggle() {
    const next = (document.documentElement.getAttribute('data-theme') || 'light') === 'light' ? 'dark' : 'light';
    return setTheme(next);
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || resolveTheme();
  }

  function bindToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = '1';
      btn.addEventListener('click', () => toggle());
      updateToggleA11y(btn);
    });
  }

  apply(resolveTheme());

  function handleSystemChange(e) {
    localStorage.removeItem(STORAGE_KEY);
    apply(e.matches ? 'dark' : 'light');
  }

  // iOS Safari compatibility: try addEventListener first, fallback to addListener
  if (mq.addEventListener) {
    mq.addEventListener('change', handleSystemChange);
  } else if (mq.addListener) {
    mq.addListener(handleSystemChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToggles);
  } else {
    bindToggles();
  }

  window.TenSeeTheme = { setTheme, toggle, getTheme, apply, bindToggles };
})();
