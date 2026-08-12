// Middleware di autenticazione e controllo accessi basato su ruoli Keycloak e contesto locale Edge.

const { refreshTokens } = require('../services/oidc-client');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

// Verifica ed eventualmente rinnova in automatico l'Access Token se prossimo alla scadenza (o scaduto)
async function ensureValidAccessToken(req) {
    if (!req.session || !req.session.tokenSet || !req.session.tokenSet.refreshToken) {
        return; // Modalità Guest o sessione senza refresh token
    }

    const { expiresAt, refreshToken } = req.session.tokenSet;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const bufferSeconds = 60; // Rinnova se mancano meno di 60 secondi alla scadenza

    if (expiresAt && (nowInSeconds + bufferSeconds >= expiresAt)) {
        try {
            console.log(`[Auth ${LOCALE_ID}] Access token in scadenza o scaduto, esecuzione refresh token...`);
            const newTokenSet = await refreshTokens(refreshToken);

            req.session.tokenSet = {
                accessToken: newTokenSet.access_token,
                refreshToken: newTokenSet.refresh_token || refreshToken,
                idToken: newTokenSet.id_token || req.session.tokenSet.idToken,
                expiresAt: newTokenSet.expires_at
            };

            if (req.session.user) {
                req.session.user.accessToken = newTokenSet.access_token;
                if (newTokenSet.id_token) {
                    req.session.user.idToken = newTokenSet.id_token;
                }
            }

            console.log(`[Auth ${LOCALE_ID}] Refresh token completato con successo. Scadenza nuovo token: ${newTokenSet.expires_at}`);
        } catch (err) {
            console.warn(`[Auth ${LOCALE_ID}] Impossibile rinnovare il token via Refresh Token:`, err.message);
        }
    }
}

// Verifica presenza di una sessione utente (Keycloak o Guest) e rinnova il token se necessario
async function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        await ensureValidAccessToken(req);
        return next();
    }
    return res.redirect('/auth/login');
}

// Riservato agli amministratori del locale specifico o di piattaforma
async function requireAdminAccess(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }

    await ensureValidAccessToken(req);

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
    ensureValidAccessToken,
    requireAuth,
    requireAdminAccess,
    getUserLocaleId,
    canAdminCurrentLocale
};
