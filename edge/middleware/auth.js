// Middleware di autenticazione e controllo accessi basato su ruoli Keycloak e contesto locale Edge.

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

// Verifica presenza di una sessione utente (Keycloak o Guest)
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/auth/login');
}

// Richiede autenticazione Keycloak online (esclude utenti Guest)
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

// Verifica il possesso di uno dei ruoli specificati
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/auth/login');
        }

        const userRoles = req.session.user.roles || [];
        if (roles.some(role => userRoles.includes(role))) {
            return next();
        }

        return res.status(403).render('error', {
            title: 'Accesso Negato',
            message: `Questa sezione richiede uno dei seguenti ruoli: ${roles.join(', ')}`
        });
    };
}

// Controlla che l'utente abbia accesso al locale dell'Edge corrente o sia admin di piattaforma
function requireLocaleAccess(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }

    const user = req.session.user;
    const userRoles = user.roles || [];

    if (userRoles.includes('admin_piattaforma')) {
        return next();
    }

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

    if (userRoles.includes('giocatore')) {
        return next();
    }

    return res.status(403).render('error', {
        title: 'Accesso Negato',
        message: 'Non hai i permessi per accedere a questa sezione.'
    });
}

// Riservato agli amministratori del locale specifico o di piattaforma
function requireAdminAccess(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }

    const user = req.session.user;
    const userRoles = user.roles || [];

    if (userRoles.includes('admin_piattaforma')) {
        return next();
    }

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

function getUserLocaleId(user) {
    return user.localeId || null;
}

function canAdminCurrentLocale(user) {
    if (!user || !user.roles) return false;
    if (user.roles.includes('admin_piattaforma')) return true;

    if (user.roles.includes('admin_locale')) {
        return getUserLocaleId(user) === LOCALE_ID;
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
