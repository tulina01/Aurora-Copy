// Aurora Tenant Management System - Netlify Identity integration
(function () {
    let currentUser = null;

    function setBodyState(state) {
        document.body.classList.remove('auth-checking', 'authenticated', 'unauthenticated');
        document.body.classList.add(state);
    }

    function renderUser(user) {
        const emailEl = document.getElementById('nav-user-email');
        if (emailEl) {
            emailEl.textContent = user ? user.email : '';
        }
    }

    function onLoggedIn(user) {
        currentUser = user;
        renderUser(user);
        setBodyState('authenticated');
        if (window.netlifyIdentity) {
            window.netlifyIdentity.close();
        }
        if (typeof window.onAuthReady === 'function') {
            window.onAuthReady();
        }
    }

    function onLoggedOut() {
        currentUser = null;
        renderUser(null);
        setBodyState('unauthenticated');
    }

    // Works around a netlify-identity-widget bug: when opening an invite,
    // confirmation, recovery, or email-change form (i.e. anything driven by
    // a *_token in the URL hash), the widget can end up with two elements
    // sharing id="netlify-identity-widget" -- an empty one left visible and
    // full-screen (silently blocking every click on the page), and the one
    // actually holding the rendered form left hidden. This does not happen
    // for a normal login/signup click, only the hash-token-driven flows.
    // Poll briefly for that exact broken state and swap which one is shown.
    function fixMisplacedIdentityModal() {
        const iframes = Array.from(document.querySelectorAll('iframe#netlify-identity-widget'));
        if (iframes.length < 2) {
            return false;
        }

        const withContent = iframes.find((el) => {
            try {
                return el.contentDocument && el.contentDocument.body && el.contentDocument.body.children.length > 0;
            } catch (err) {
                return false;
            }
        });
        const empty = iframes.find((el) => el !== withContent);

        if (!withContent || !empty) {
            return false;
        }
        if (window.getComputedStyle(withContent).display === 'none' && window.getComputedStyle(empty).display !== 'none') {
            empty.style.display = 'none';
            withContent.style.display = 'block';
            return true;
        }
        return false;
    }

    function watchForMisplacedIdentityModal() {
        const start = Date.now();
        const interval = setInterval(() => {
            if (fixMisplacedIdentityModal() || Date.now() - start > 8000) {
                clearInterval(interval);
            }
        }, 300);
    }

    const auth = {
        getUser() {
            return currentUser;
        },
        async getToken() {
            if (!currentUser) {
                return null;
            }
            try {
                return await currentUser.jwt();
            } catch (err) {
                console.error('Failed to refresh Netlify Identity token:', err);
                return null;
            }
        },
        login() {
            if (window.netlifyIdentity) {
                window.netlifyIdentity.open('login');
            } else {
                console.warn('[auth] netlifyIdentity is not defined, cannot open login modal');
            }
        },
        logout() {
            if (window.netlifyIdentity) {
                window.netlifyIdentity.logout();
            }
        }
    };

    window.auth = auth;

    document.addEventListener('DOMContentLoaded', function () {
        const loginBtn = document.getElementById('auth-login-btn');
        const logoutBtn = document.getElementById('auth-logout-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => auth.login());
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => auth.logout());
        }
    });

    const hasIdentityHashToken = /(invite_token|confirmation_token|recovery_token|email_change_token)=/.test(window.location.hash);

    if (window.netlifyIdentity) {
        if (hasIdentityHashToken) {
            watchForMisplacedIdentityModal();
        }

        window.netlifyIdentity.on('init', function (user) {
            if (user) {
                onLoggedIn(user);
            } else {
                onLoggedOut();
            }
        });

        window.netlifyIdentity.on('login', function (user) {
            onLoggedIn(user);
        });

        window.netlifyIdentity.on('logout', function () {
            onLoggedOut();
        });

        window.netlifyIdentity.init();
    } else {
        // The widget script didn't load (offline, blocked, or this is local
        // dev without a linked Netlify site). Don't leave the UI stuck
        // behind the login gate -- the real security boundary is the API's
        // requireIdentity middleware, which already opts out locally via
        // REQUIRE_AUTH=false. main.js's own DOMContentLoaded handler checks
        // for the 'authenticated' class and calls onAuthReady itself.
        console.warn('Netlify Identity widget unavailable; unlocking UI without a session.');
        setBodyState('authenticated');
    }
})();
