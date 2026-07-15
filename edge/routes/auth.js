// ============================================================
// routes/auth.js — Rotte di Autenticazione OIDC
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Implementa il flusso Authorization Code Flow con Keycloak:
// 1. /auth/login — Pagina di login con check stato Keycloak
// 2. /auth/start — Redirect a Keycloak per autenticazione
// 3. /auth/callback — Callback OIDC, scambio codice per token
// 4. /auth/register — Redirect a pagina registrazione Keycloak
// 5. /auth/guest — Accesso in modalità Ospite (offline)
// 6. /auth/logout — Logout con distruzione sessione
// ============================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const {
    checkKeycloakHealth,
    generateAuthData,
    getRegistrationUrl,
    exchangeCode,
    getUserInfoFromToken,
    getLogoutUrl,
    isOidcAvailable
} = require('../services/oidc-client');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

/**
 * GET /auth/login
 * Mostra la pagina di login.
 * Controlla se Keycloak è raggiungibile per decidere
 * se mostrare il pulsante di login o il fallback Guest.
 */
router.get('/login', async (req, res) => {
    // Se già autenticato, redirect alla dashboard
    if (req.session.user) {
        return res.redirect('/');
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

/**
 * GET /auth/start
 * Avvia il flusso OIDC Authorization Code Flow.
 * Genera state e nonce, li salva in sessione,
 * e fa il redirect a Keycloak.
 */
router.get('/start', async (req, res) => {
    try {
        // Verifica che Keycloak sia raggiungibile
        const online = await checkKeycloakHealth();
        if (!online) {
            return res.redirect('/auth/login?error=keycloak_unreachable');
        }

        // Genera dati di auth (state, nonce, url PKCE con code_challenge)
        const authData = generateAuthData();

        // Salva in sessione per la verifica nel callback
        req.session.oidcState = authData.state;
        req.session.oidcNonce = authData.nonce;
        req.session.oidcCodeVerifier = authData.code_verifier; // PKCE verifier

        console.log(`[Auth ${LOCALE_ID}] Redirect a Keycloak per autenticazione (PKCE attivo)`);

        return res.redirect(authData.url);
    } catch (err) {
        console.error(`[Auth ${LOCALE_ID}] Errore avvio OIDC:`, err.message);
        return res.redirect('/auth/login?error=oidc_error');
    }
});

/**
 * GET /auth/register
 * Redirect alla pagina di registrazione di Keycloak.
 */
router.get('/register', async (req, res) => {
    try {
        const online = await checkKeycloakHealth();
        if (!online) {
            return res.redirect('/auth/login?error=keycloak_unreachable');
        }

        const regUrl = getRegistrationUrl();
        console.log(`[Auth ${LOCALE_ID}] Redirect a Keycloak per registrazione`);
        return res.redirect(regUrl);
    } catch (err) {
        console.error(`[Auth ${LOCALE_ID}] Errore redirect registrazione:`, err.message);
        return res.redirect('/auth/login?error=oidc_error');
    }
});

/**
 * GET /auth/callback
 * Callback invocato da Keycloak dopo il login/registrazione.
 * Scambia l'authorization code per i token (backend-to-backend)
 * e salva le informazioni utente in sessione.
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Keycloak ha restituito un errore (es. utente ha annullato)
        if (error) {
            console.warn(`[Auth ${LOCALE_ID}] Keycloak errore: ${error} - ${error_description}`);
            return res.redirect(`/auth/login?error=${error}`);
        }

        if (!code) {
            return res.redirect('/auth/login?error=missing_code');
        }

        // Verifica state anti-CSRF
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

        // Scambio authorization code → token (backend-to-backend via rete Docker)
        // Passiamo req.query completo a openid-client (incluso 'iss' e altri parametri previsti da Keycloak)
        const tokenSet = await exchangeCode(req.query, savedState, savedNonce, savedCodeVerifier);
        console.log(`[Auth ${LOCALE_ID}] Token ottenuto, scadenza: ${tokenSet.expires_at}`);

        // Estrai informazioni utente dal token JWT
        const userInfo = getUserInfoFromToken(tokenSet);

        // Salva in sessione
        req.session.user = userInfo;
        req.session.tokenSet = {
            accessToken: tokenSet.access_token,
            idToken: tokenSet.id_token,
            expiresAt: tokenSet.expires_at
        };

        // Pulisci state/nonce/verifier dalla sessione
        delete req.session.oidcState;
        delete req.session.oidcNonce;
        delete req.session.oidcCodeVerifier;

        console.log(`[Auth ${LOCALE_ID}] Utente autenticato: ${userInfo.username} (${userInfo.roles.join(', ')})`);

        return res.redirect('/');

    } catch (err) {
        console.error(`[Auth ${LOCALE_ID}] Errore callback OIDC:`, err.message);
        return res.redirect('/auth/login?error=token_exchange_failed');
    }
});

/**
 * POST /auth/guest
 * Accesso in modalità Ospite.
 * Attivato quando Keycloak non è raggiungibile (UC1 - Scenario Alternativo).
 * L'utente può giocare ma i dati non vengono salvati.
 */
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
    return res.redirect('/');
});

/**
 * GET /auth/logout
 * Distrugge la sessione locale e fa il logout su Keycloak.
 */
router.get('/logout', (req, res) => {
    const idToken = req.session.tokenSet?.idToken;
    const isGuest = req.session.user?.isGuest;

    req.session.destroy((err) => {
        if (err) {
            console.error(`[Auth ${LOCALE_ID}] Errore distruzione sessione:`, err.message);
        }

        // Se era un utente Keycloak, redirect al logout di Keycloak
        if (!isGuest && idToken) {
            const logoutUrl = getLogoutUrl(idToken);
            return res.redirect(logoutUrl);
        }

        // Se era un Ospite, torna alla pagina di login
        return res.redirect('/auth/login');
    });
});

module.exports = router;
