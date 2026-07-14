// ============================================================
// services/oidc-client.js — Client OIDC (openid-client)
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Gestisce la discovery e la configurazione del client OIDC
// per l'Authorization Code Flow con Keycloak.
// ============================================================

const { Issuer } = require('openid-client');

let oidcClient = null;
let oidcAvailable = false;

/**
 * URL interna di Keycloak (comunicazione backend-to-backend dentro Docker).
 * Distinta dalla URL pubblica usata per i redirect del browser.
 */
const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL
    || 'http://keycloak:8080/realms/pissir-realm';

/**
 * URL pubblica di Keycloak (quella che il browser dell'utente raggiunge).
 * Usata nei redirect di login e nei link della pagina di login.
 */
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_URL
    || 'http://localhost:9080/realms/pissir-realm';

const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'edge-app';
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'edge-app-secret-dev';
const EDGE_PUBLIC_URL = process.env.EDGE_PUBLIC_URL || 'http://localhost:3001';

/**
 * Inizializza il client OIDC via discovery.
 * Usa la URL interna per la comunicazione server-to-server.
 */
async function initOidcClient() {
    try {
        const issuer = await Issuer.discover(KEYCLOAK_INTERNAL_URL);

        oidcClient = new issuer.Client({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uris: [`${EDGE_PUBLIC_URL}/auth/callback`],
            response_types: ['code'],
            post_logout_redirect_uris: [`${EDGE_PUBLIC_URL}/`]
        });

        oidcAvailable = true;
        return oidcClient;
    } catch (err) {
        oidcAvailable = false;
        throw err;
    }
}

/**
 * Controlla se Keycloak è raggiungibile.
 * Usa un timeout di 2 secondi per non bloccare l'utente.
 */
async function checkKeycloakHealth() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(KEYCLOAK_INTERNAL_URL, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
            // Se il client non è ancora inizializzato, proviamo a farlo
            if (!oidcClient) {
                await initOidcClient();
            }
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Genera l'URL di autorizzazione Keycloak.
 * NOTA: usa la URL pubblica per il redirect nel browser dell'utente,
 * ma il client openid-client usa internamente la URL interna per
 * le chiamate server-to-server (token exchange).
 */
function getAuthorizationUrl(state, nonce) {
    if (!oidcClient) {
        throw new Error('Client OIDC non inizializzato');
    }

    // Costruiamo la URL di auth manualmente usando la URL pubblica
    // perché il browser dell'utente deve raggiungere Keycloak
    // tramite localhost:9080, non tramite il nome Docker interno.
    const authUrl = new URL(`${KEYCLOAK_PUBLIC_URL}/protocol/openid-connect/auth`);
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${EDGE_PUBLIC_URL}/auth/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);

    return authUrl.toString();
}

/**
 * Genera l'URL di registrazione Keycloak.
 * Keycloak espone un endpoint dedicato per la registrazione.
 */
function getRegistrationUrl() {
    const regUrl = new URL(`${KEYCLOAK_PUBLIC_URL}/protocol/openid-connect/registrations`);
    regUrl.searchParams.set('client_id', CLIENT_ID);
    regUrl.searchParams.set('redirect_uri', `${EDGE_PUBLIC_URL}/auth/callback`);
    regUrl.searchParams.set('response_type', 'code');
    regUrl.searchParams.set('scope', 'openid profile email');

    return regUrl.toString();
}

/**
 * Scambia l'authorization code per i token (backend-to-backend).
 * Questa chiamata avviene internamente tramite la rete Docker.
 */
async function exchangeCode(code, state, nonce) {
    if (!oidcClient) {
        throw new Error('Client OIDC non inizializzato');
    }

    const params = { code, state };
    const checks = { state, nonce };

    const tokenSet = await oidcClient.callback(
        `${EDGE_PUBLIC_URL}/auth/callback`,
        params,
        checks
    );

    return tokenSet;
}

/**
 * Ottiene le informazioni dell'utente dal token.
 */
function getUserInfoFromToken(tokenSet) {
    const claims = tokenSet.claims();
    return {
        id: claims.sub,
        username: claims.preferred_username || claims.sub,
        email: claims.email || '',
        name: `${claims.given_name || ''} ${claims.family_name || ''}`.trim(),
        roles: claims.realm_roles || claims.realm_access?.roles || [],
        isGuest: false,
        accessToken: tokenSet.access_token,
        idToken: tokenSet.id_token
    };
}

function getLogoutUrl(idTokenHint) {
    const logoutUrl = new URL(`${KEYCLOAK_PUBLIC_URL}/protocol/openid-connect/logout`);
    if (idTokenHint) {
        logoutUrl.searchParams.set('id_token_hint', idTokenHint);
    }
    logoutUrl.searchParams.set('post_logout_redirect_uri', `${EDGE_PUBLIC_URL}/`);
    return logoutUrl.toString();
}

function isOidcAvailable() {
    return oidcAvailable;
}

module.exports = {
    initOidcClient,
    checkKeycloakHealth,
    getAuthorizationUrl,
    getRegistrationUrl,
    exchangeCode,
    getUserInfoFromToken,
    getLogoutUrl,
    isOidcAvailable
};
