// Client OIDC (openid-client) per discovery, login con PKCE, Direct Access Grant e Client Credentials.

const { Issuer, generators } = require('openid-client');

let oidcClient = null;
let oidcAvailable = false;

const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080/realms/pissir-realm';
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_URL || 'http://localhost:9080/realms/pissir-realm';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'edge-client';
const EDGE_PUBLIC_URL = process.env.EDGE_PUBLIC_URL || 'http://localhost:3001';

// Inizializza il client OIDC applicando lo split-brain tra URL interna (Docker) e URL pubblica (Browser)
async function initOidcClient() {
    try {
        const response = await fetch(`${KEYCLOAK_INTERNAL_URL}/.well-known/openid-configuration`);
        if (!response.ok) {
            throw new Error(`Impossibile recuperare OIDC config: ${response.statusText}`);
        }
        const metadata = await response.json();

        // Mantiene l'issuer pubblico per la validazione dei JWT ed usa l'host interno per le chiamate HTTP
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
            token_endpoint_auth_method: 'none'
        });

        oidcAvailable = true;
        return oidcClient;
    } catch (err) {
        oidcAvailable = false;
        throw err;
    }
}

// Verifica con timeout (2s) la raggiungibilità di Keycloak senza bloccare l'Edge Node
async function checkKeycloakHealth() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(KEYCLOAK_INTERNAL_URL, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
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

// Genera l'URL di login con parametri anti-CSRF (state, nonce) e verifier PKCE (S256)
function generateAuthData() {
    if (!oidcClient) throw new Error('Client OIDC non inizializzato');

    const state = generators.state();
    const nonce = generators.nonce();
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);

    const authUrl = oidcClient.authorizationUrl({
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge,
        code_challenge_method: 'S256',
    });

    return { url: authUrl, state, nonce, code_verifier };
}

function getRegistrationUrl() {
    if (!oidcClient) throw new Error('Client OIDC non inizializzato');

    const state = generators.state();
    const nonce = generators.nonce();
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);

    const authUrl = new URL(oidcClient.authorizationUrl({
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge,
        code_challenge_method: 'S256',
    }));

    authUrl.pathname = authUrl.pathname.replace('/protocol/openid-connect/auth', '/protocol/openid-connect/registrations');

    return { url: authUrl.toString(), state, nonce, code_verifier };
}

async function exchangeCode(params, state, nonce, code_verifier) {
    if (!oidcClient) throw new Error('Client OIDC non inizializzato');
    return await oidcClient.callback(`${EDGE_PUBLIC_URL}/auth/callback`, params, { state, nonce, code_verifier });
}

// Decodifica l'Access Token JWT ed estrae i ruoli e l'eventuale claim locale_id
function getUserInfoFromToken(tokenSet) {
    const claims = tokenSet.claims();
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
        roles,
        localeId: localeId || claims.locale_id || null,
        isGuest: false,
        accessToken: tokenSet.access_token,
        idToken: tokenSet.id_token
    };
}

function getLogoutUrl(idTokenHint, customRedirectUri) {
    if (!oidcClient) throw new Error('Client OIDC non inizializzato');
    return oidcClient.endSessionUrl({
        id_token_hint: idTokenHint,
        post_logout_redirect_uri: customRedirectUri || `${EDGE_PUBLIC_URL}/`
    });
}

function isOidcAvailable() {
    return oidcAvailable;
}

// Autentica direttamente un giocatore (Direct Access Grant) per il secondo giocatore o per servizi
async function directPasswordAuth(username, password) {
    const tokenUrl = `${KEYCLOAK_INTERNAL_URL}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        username,
        password,
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
    const payloadBase64 = tokenData.access_token.split('.')[1];
    const decoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const claims = JSON.parse(decoded);

    return {
        id: claims.sub,
        username: claims.preferred_username || username,
        email: claims.email || '',
        roles: claims.realm_access?.roles || [],
        accessToken: tokenData.access_token
    };
}

// Autentica un service account client via Client Credentials Grant
async function clientCredentialsAuth(
    clientId = process.env.SYNC_CLIENT_ID || 'edge-sync-client',
    clientSecret = process.env.SYNC_CLIENT_SECRET || 'edge-sync-secret-12345'
) {
    const tokenUrl = `${KEYCLOAK_INTERNAL_URL}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'openid profile email'
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    if (!response.ok) {
        throw new Error(`Client Credentials Auth fallita per '${clientId}': ${response.statusText}`);
    }

    const tokenData = await response.json();
    return { accessToken: tokenData.access_token };
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
    directPasswordAuth,
    clientCredentialsAuth
};
