// ============================================================
// services/oidc-client.js — Client OIDC (openid-client)
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Gestisce la discovery e la configurazione del client OIDC
// per l'Authorization Code Flow con PKCE.
// ============================================================

const { Issuer, generators } = require('openid-client');

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

const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'edge-client';
const EDGE_PUBLIC_URL = process.env.EDGE_PUBLIC_URL || 'http://localhost:3001';

/**
 * Inizializza il client OIDC via discovery.
 * Usa la URL interna per la comunicazione server-to-server.
 */
async function initOidcClient() {
    try {
        // Fetch manuale del discovery document
        const response = await fetch(`${KEYCLOAK_INTERNAL_URL}/.well-known/openid-configuration`);
        if (!response.ok) {
            throw new Error(`Impossibile recuperare OIDC config: ${response.statusText}`);
        }
        const metadata = await response.json();

        // ------------------------------------------------------------
        // TRUCCO PER DOCKER (Split-Brain DNS)
        // L'issuer per la validazione JWT deve corrispondere a quello
        // pubblico (localhost:9080), perché Keycloak usa l'host del
        // browser. Ma gli endpoint backend (token, jwks) devono 
        // rimanere su keycloak:8080 per funzionare dentro Docker.
        // ------------------------------------------------------------
        metadata.issuer = KEYCLOAK_PUBLIC_URL;
        metadata.authorization_endpoint = metadata.authorization_endpoint.replace(KEYCLOAK_INTERNAL_URL, KEYCLOAK_PUBLIC_URL);
        metadata.end_session_endpoint = metadata.end_session_endpoint.replace(KEYCLOAK_INTERNAL_URL, KEYCLOAK_PUBLIC_URL);
        if (metadata.registration_endpoint) {
            metadata.registration_endpoint = metadata.registration_endpoint.replace(KEYCLOAK_INTERNAL_URL, KEYCLOAK_PUBLIC_URL);
        }

        const issuer = new Issuer(metadata);

        oidcClient = new issuer.Client({
            client_id: CLIENT_ID,
            redirect_uris: [`${EDGE_PUBLIC_URL}/auth/callback`],
            response_types: ['code'],
            post_logout_redirect_uris: [`${EDGE_PUBLIC_URL}/`],
            token_endpoint_auth_method: 'none' // Essenziale per Public Clients
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
 * Genera l'URL di autorizzazione Keycloak con PKCE.
 * @returns {Object} Oggetto con { url, state, nonce, code_verifier }
 */
function generateAuthData() {
    if (!oidcClient) {
        throw new Error('Client OIDC non inizializzato');
    }

    const state = generators.state();
    const nonce = generators.nonce();
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);

    // Ora la libreria ha gli endpoint già configurati correttamente
    const authUrl = oidcClient.authorizationUrl({
        scope: 'openid profile email',
        state: state,
        nonce: nonce,
        code_challenge: code_challenge,
        code_challenge_method: 'S256',
    });

    return {
        url: authUrl,
        state,
        nonce,
        code_verifier
    };
}

/**
 * Genera l'URL di registrazione Keycloak.
 */
function getRegistrationUrl() {
    if (!oidcClient) {
        throw new Error('Client OIDC non inizializzato');
    }

    const state = generators.state();
    const nonce = generators.nonce();
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);

    // Generiamo i parametri completi PKCE usando l'authorizationUrl
    const authUrl = new URL(oidcClient.authorizationUrl({
        scope: 'openid profile email',
        state: state,
        nonce: nonce,
        code_challenge: code_challenge,
        code_challenge_method: 'S256',
    }));

    // Sostituiamo l'endpoint di login con quello di registrazione di Keycloak
    authUrl.pathname = authUrl.pathname.replace('/protocol/openid-connect/auth', '/protocol/openid-connect/registrations');

    return {
        url: authUrl.toString(),
        state,
        nonce,
        code_verifier
    };
}

/**
 * Scambia l'authorization code per i token usando PKCE.
 */
async function exchangeCode(params, state, nonce, code_verifier) {
    if (!oidcClient) {
        throw new Error('Client OIDC non inizializzato');
    }

    const checks = { state, nonce, code_verifier };

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
    
    // Decodifica manuale dell'Access Token per estrarre i realm_roles e attributi custom
    let accessRoles = [];
    let localeId = null;
    if (tokenSet.access_token) {
        try {
            const payloadBase64 = tokenSet.access_token.split('.')[1];
            const decoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
            const accessClaims = JSON.parse(decoded);
            accessRoles = accessClaims.realm_access?.roles || [];
            localeId = accessClaims.locale_id || null;
        } catch (err) {
            console.error("Errore decodifica Access Token:", err.message);
        }
    }

    const allRoles = claims.realm_roles || claims.realm_access?.roles || accessRoles;
    const validRoles = ['admin_piattaforma', 'admin_locale', 'giocatore'];
    const roles = allRoles.filter(role => validRoles.includes(role));

    return {
        id: claims.sub,
        username: claims.preferred_username || claims.sub,
        email: claims.email || '',
        name: `${claims.given_name || ''} ${claims.family_name || ''}`.trim(),
        roles: roles,
        localeId: localeId || claims.locale_id || null,
        isGuest: false,
        accessToken: tokenSet.access_token,
        idToken: tokenSet.id_token
    };
}

/**
 * Genera l'URL per la fine sessione a norma OIDC.
 * @param {string} idTokenHint - Il token ID dell'utente
 * @param {string} [customRedirectUri] - URL di redirect personalizzato opzionale
 */
function getLogoutUrl(idTokenHint, customRedirectUri) {
    if (!oidcClient) {
        throw new Error('Client OIDC non inizializzato');
    }
    
    const logoutUrl = oidcClient.endSessionUrl({
        id_token_hint: idTokenHint,
        post_logout_redirect_uri: customRedirectUri || `${EDGE_PUBLIC_URL}/`
    });
    
    return logoutUrl;
}

function isOidcAvailable() {
    return oidcAvailable;
}

/**
 * Autentica un utente usando il Direct Access Grant (Password Flow).
 * Usato per il login del giocatore 2 o per utenti di servizio (cron sync).
 */
async function directPasswordAuth(username, password) {
    const tokenUrl = `${KEYCLOAK_INTERNAL_URL}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        username: username,
        password: password,
        scope: 'openid profile email'
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    if (!response.ok) {
        throw new Error(`Credenziali non valide per ${username}`);
    }

    const tokenData = await response.json();

    // Decodifica il token per estrarre le info utente
    const payloadBase64 = tokenData.access_token.split('.')[1];
    const decoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const claims = JSON.parse(decoded);
    const roles = claims.realm_access?.roles || [];

    return {
        id: claims.sub,
        username: claims.preferred_username || username,
        email: claims.email || '',
        roles: roles,
        accessToken: tokenData.access_token
    };
}

module.exports = {
    initOidcClient,
    checkKeycloakHealth,
    generateAuthData,
    getRegistrationUrl,
    exchangeCode,
    getUserInfoFromToken,
    getLogoutUrl,
    isOidcAvailable,
    directPasswordAuth
};
