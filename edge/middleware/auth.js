// ============================================================
// middleware/auth.js — Middleware di Autenticazione
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================

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

module.exports = {
    requireAuth,
    requireOnlineAuth
};
