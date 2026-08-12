// Gestione rotte di autenticazione OIDC (Keycloak Authorization Code Flow con PKCE) e Guest Mode offline.

const express = require('express');
const router = express.Router();

const {
    checkKeycloakHealth,
    generateAuthData,
    getRegistrationUrl,
    exchangeCode,
    getUserInfoFromToken,
    getLogoutUrl
} = require('../services/oidc-client');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

// Mostra la vista di login verfificando preliminarmente lo stato di Keycloak
router.get('/login', async (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }

    let keycloakOnline = false;
    try {
        keycloakOnline = await checkKeycloakHealth();
    } catch {
        keycloakOnline = false;
    }

    res.render('login', {
        title: 'Accedi',
        keycloakOnline,
        error: req.query.error || null
    });
});

// Inizia il flusso di autenticazione OIDC salvando state e verifier PKCE in sessione
router.get('/start', async (req, res) => {
    try {
        const online = await checkKeycloakHealth();
        if (!online) {
            return res.redirect('/auth/login?error=keycloak_unreachable');
        }

        const authData = generateAuthData();
        req.session.oidcState = authData.state;
        req.session.oidcNonce = authData.nonce;
        req.session.oidcCodeVerifier = authData.code_verifier;

        console.log(`[Auth ${LOCALE_ID}] Redirect a Keycloak per autenticazione (PKCE attivo)`);
        return res.redirect(authData.url);
    } catch (err) {
        console.error(`[Auth ${LOCALE_ID}] Errore avvio OIDC:`, err.message);
        return res.redirect('/auth/login?error=oidc_error');
    }
});

// Reindirizza al form di registrazione utente su Keycloak
router.get('/register', async (req, res) => {
    try {
        const online = await checkKeycloakHealth();
        if (!online) {
            return res.redirect('/auth/login?error=keycloak_unreachable');
        }

        const authData = getRegistrationUrl();
        req.session.oidcState = authData.state;
        req.session.oidcNonce = authData.nonce;
        req.session.oidcCodeVerifier = authData.code_verifier;

        console.log(`[Auth ${LOCALE_ID}] Redirect a Keycloak per registrazione (PKCE attivo)`);
        return res.redirect(authData.url);
    } catch (err) {
        console.error(`[Auth ${LOCALE_ID}] Errore redirect registrazione:`, err.message);
        return res.redirect('/auth/login?error=oidc_error');
    }
});

// Callback di ritorno da Keycloak: convalida lo state, effettua lo scambio token e popola la sessione
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        if (error) {
            console.warn(`[Auth ${LOCALE_ID}] Keycloak errore: ${error} - ${error_description}`);
            return res.redirect(`/auth/login?error=${error}`);
        }

        if (!code) {
            return res.redirect('/auth/login?error=missing_code');
        }

        const savedState = req.session.oidcState;
        const savedNonce = req.session.oidcNonce;
        const savedCodeVerifier = req.session.oidcCodeVerifier;

        if (!savedState || state !== savedState) {
            console.error(`[Auth ${LOCALE_ID}] State mismatch: atteso ${savedState}, ricevuto ${state}`);
            return res.redirect('/auth/login?error=state_mismatch');
        }

        if (!savedCodeVerifier) {
            console.error(`[Auth ${LOCALE_ID}] Code Verifier mancante in sessione per PKCE`);
            return res.redirect('/auth/login?error=pkce_error');
        }

        const tokenSet = await exchangeCode(req.query, savedState, savedNonce, savedCodeVerifier);
        const userInfo = getUserInfoFromToken(tokenSet);

        // Impedisce che un admin di un altro locale possa amministrare il locale corrente
        if (userInfo.roles.includes('admin_locale') && userInfo.localeId !== LOCALE_ID) {
            console.error(`[Auth ${LOCALE_ID}] Accesso negato: admin_locale del locale ${userInfo.localeId} su ${LOCALE_ID}`);

            const edgePublicUrl = process.env.EDGE_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
            const logoutUrl = getLogoutUrl(
                tokenSet.id_token,
                `${edgePublicUrl}/auth/login?error=unauthorized_locale`
            );

            delete req.session.oidcState;
            delete req.session.oidcNonce;
            delete req.session.oidcCodeVerifier;

            return res.redirect(logoutUrl);
        }

        req.session.user = userInfo;
        req.session.tokenSet = {
            accessToken: tokenSet.access_token,
            refreshToken: tokenSet.refresh_token,
            idToken: tokenSet.id_token,
            expiresAt: tokenSet.expires_at
        };

        delete req.session.oidcState;
        delete req.session.oidcNonce;
        delete req.session.oidcCodeVerifier;

        console.log(`[Auth ${LOCALE_ID}] Utente autenticato: ${userInfo.username} (${userInfo.roles.join(', ')})`);
        return res.redirect('/dashboard');
    } catch (err) {
        console.error(`[Auth ${LOCALE_ID}] Errore callback OIDC:`, err.message);
        return res.redirect('/auth/login?error=token_exchange_failed');
    }
});

// Attiva la modalità Guest (offline) senza salvataggio dati su Server Centrale
router.post('/guest', (req, res) => {
    req.session.user = {
        id: null,
        username: 'Ospite',
        email: '',
        name: 'Ospite',
        roles: [],
        isGuest: true,
        accessToken: null,
        idToken: null
    };

    console.log(`[Auth ${LOCALE_ID}] Accesso come Ospite (Guest Mode)`);
    return res.redirect('/dashboard');
});

// Distrugge la sessione locale e reindirizza al logout di Keycloak
router.get('/logout', (req, res) => {
    const idToken = req.session.tokenSet?.idToken;
    const isGuest = req.session.user?.isGuest;

    req.session.destroy((err) => {
        if (err) {
            console.error(`[Auth ${LOCALE_ID}] Errore distruzione sessione:`, err.message);
        }

        if (!isGuest && idToken) {
            const logoutUrl = getLogoutUrl(idToken);
            return res.redirect(logoutUrl);
        }

        return res.redirect('/auth/login');
    });
});

module.exports = router;
