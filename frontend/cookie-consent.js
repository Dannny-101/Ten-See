(function () {
    const COOKIE_NAME = 'tensee_cookie_consent';
    const MAX_AGE = 60 * 60 * 24 * 180;

    function getCookie(name) {
        return document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1];
    }

    function setCookie(name, value) {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    }

    function saveConsent(preferences) {
        const consent = {
            necessary: true,
            analytics: Boolean(preferences.analytics),
            marketing: Boolean(preferences.marketing),
            savedAt: new Date().toISOString()
        };

        setCookie(COOKIE_NAME, JSON.stringify(consent));
        window.TenSeeCookieConsent = consent;
        document.dispatchEvent(new CustomEvent('tensee:cookies-updated', { detail: consent }));
        document.getElementById('cookieConsent')?.classList.remove('is-visible');
    }

    function renderBanner() {
        if (getCookie(COOKIE_NAME)) return;

        const banner = document.createElement('section');
        banner.className = 'cookie-consent is-visible';
        banner.id = 'cookieConsent';
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML = `
            <div class="cookie-panel">
                <div class="cookie-copy">
                    <h2>&#x1F36A; We value your privacy</h2>
                    <p>We use cookies to enhance your browsing experience, serve personalised content, and analyse our traffic.</p>
                </div>
                <div class="cookie-actions">
                    <button class="cookie-btn" type="button" data-cookie-action="reject">Reject All</button>
                    <button class="cookie-btn" type="button" data-cookie-action="essential">Essential Only</button>
                    <button class="cookie-btn primary" type="button" data-cookie-action="accept">Accept All</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
        banner.addEventListener('click', (event) => {
            const button = event.target.closest('[data-cookie-action]');
            if (!button) return;

            const action = button.dataset.cookieAction;
            if (action === 'accept')    saveConsent({ analytics: true,  marketing: true  });
            if (action === 'essential') saveConsent({ analytics: false, marketing: false });
            if (action === 'reject')    saveConsent({ analytics: false, marketing: false });
        });
    }

    document.addEventListener('DOMContentLoaded', renderBanner);
})();
