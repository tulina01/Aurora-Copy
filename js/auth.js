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

    if (window.netlifyIdentity) {
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
