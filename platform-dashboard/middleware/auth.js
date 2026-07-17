// ============================================================
// middleware/auth.js — Middleware di Autenticazione e Autorizzazione
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';


/**
 * Richiede che l'utente sia autenticato (Keycloak o Guest).
 * Se non autenticato, redirect alla pagina di login.
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/auth/login');
}

/**
 * Richiede che l'utente sia autenticato via Keycloak (NON guest).
 * Usato per operazioni che richiedono un JWT valido
 * (es. sincronizzazione, tornei).
 */
function requireOnlineAuth(req, res, next) {
    if (req.session && req.session.user && !req.session.user.isGuest) {
        return next();
    }

    if (req.session && req.session.user && req.session.user.isGuest) {
        return res.status(403).render('error', {
            title: 'Accesso Negato',
            message: 'Questa funzionalità richiede l\'autenticazione online. Accedi con il tuo account Keycloak.'
        });
    }

    return res.redirect('/auth/login');
}

/**
 * Genera un middleware che richiede uno dei ruoli specificati.
 * @param {...string} roles - Ruoli accettati
 * @returns {Function} Middleware Express
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/auth/login');
        }

        const userRoles = req.session.user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));

        if (hasRole) {
            return next();
        }

        return res.status(403).render('error', {
            title: 'Accesso Negato',
            message: `Questa sezione richiede uno dei seguenti ruoli: ${roles.join(', ')}`
        });
    };
}

/**
 * Verifica che l'utente sia admin del locale corrente (quello dell'Edge)
 * oppure admin_piattaforma (che può accedere a qualunque locale).
 * 
 * Per admin_locale: verifica la mappatura username → locale_id
 * e controlla che corrisponda al LOCALE_ID dell'Edge corrente.
 */
function requireLocaleAccess(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }

    const user = req.session.user;
    const userRoles = user.roles || [];

    // Admin piattaforma: accesso a qualunque locale
    if (userRoles.includes('admin_piattaforma')) {
        return next();
    }

    // Admin locale: verifica che il locale corrisponda
    if (userRoles.includes('admin_locale')) {
        const userLocaleId = getUserLocaleId(user);
        if (userLocaleId === LOCALE_ID) {
            return next();
        }

        return res.status(403).render('error', {
            title: 'Accesso Negato',
            message: `Non hai i permessi per accedere al locale ${LOCALE_ID}. Il tuo locale è ${userLocaleId || 'non configurato'}.`
        });
    }

    // Giocatori possono accedere alla dashboard ma non alle funzioni admin
    if (userRoles.includes('giocatore')) {
        return next();
    }

    return res.status(403).render('error', {
        title: 'Accesso Negato',
        message: 'Non hai i permessi per accedere a questa sezione.'
    });
}

/**
 * Verifica accesso admin: solo admin_locale del locale corrente o admin_piattaforma.
 * Non permette accesso ai giocatori normali.
 */
function requireAdminAccess(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }

    const user = req.session.user;
    const userRoles = user.roles || [];

    // Admin piattaforma: accesso totale
    if (userRoles.includes('admin_piattaforma')) {
        return next();
    }

    // Admin locale: verifica locale
    if (userRoles.includes('admin_locale')) {
        const userLocaleId = getUserLocaleId(user);
        if (userLocaleId === LOCALE_ID) {
            return next();
        }

        return res.status(403).render('error', {
            title: 'Accesso Negato',
            message: `Non hai i permessi per amministrare il locale ${LOCALE_ID}.`
        });
    }

    return res.status(403).render('error', {
        title: 'Accesso Negato',
        message: 'Solo gli amministratori possono accedere a questa sezione.'
    });
}

/**
 * Determina il locale_id associato a un utente admin_locale.
 * Estrae il dato dal claim del token Keycloak.
 * @param {Object} user - Oggetto utente dalla sessione
 * @returns {string|null} Il locale_id o null
 */
function getUserLocaleId(user) {
    return user.localeId || null;
}

/**
 * Determina se l'utente corrente può accedere alle funzioni admin
 * del locale dell'Edge corrente.
 * @param {Object} user - Oggetto utente dalla sessione
 * @returns {boolean}
 */
function canAdminCurrentLocale(user) {
    if (!user || !user.roles) return false;

    if (user.roles.includes('admin_piattaforma')) return true;

    if (user.roles.includes('admin_locale')) {
        const userLocaleId = getUserLocaleId(user);
        return userLocaleId === LOCALE_ID;
    }

    return false;
}

module.exports = {
    requireAuth,
    requireOnlineAuth,
    requireRole,
    requireLocaleAccess,
    requireAdminAccess,
    getUserLocaleId,
    canAdminCurrentLocale
};
