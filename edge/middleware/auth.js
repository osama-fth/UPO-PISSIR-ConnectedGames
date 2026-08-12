// Middleware di autenticazione e controllo accessi basato su ruoli Keycloak e contesto locale Edge.

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

// Verifica presenza di una sessione utente (Keycloak o Guest)
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/auth/login');
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
    requireAdminAccess,
    getUserLocaleId,
    canAdminCurrentLocale
};
