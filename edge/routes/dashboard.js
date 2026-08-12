// ============================================================
// routes/dashboard.js — Dashboard Edge
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdminAccess, canAdminCurrentLocale } = require('../middleware/auth');
const { getStatsLocale, getStatsGiocatore } = require('../services/sqlite-db');
const { getActiveMatches } = require('../services/game-engine');
const { directPasswordAuth, clientCredentialsAuth } = require('../services/oidc-client');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

// Giochi installati per locale (coerente con init-db.sql)
const INSTALLAZIONI = {
    'BAR_BELVEDERE': [
        { id: 'calciobalilla-1', giocoId: 'calciobalilla', nome: 'Calciobalilla' },
        { id: 'freccette-1', giocoId: 'freccette', nome: 'Freccette' }
    ],
    'SALA_GIOCHI_ROMA': [
        { id: 'calciobalilla-2', giocoId: 'calciobalilla', nome: 'Calciobalilla' },
        { id: 'freccette-2', giocoId: 'freccette', nome: 'Freccette' }
    ]
};

const CENTRAL_SERVER_URL = process.env.CENTRAL_SERVER_URL || 'http://service-gateway:8081';

/**
 * Helper: formatta una data string in ISO 8601 con offset Rome (+02:00 CEST / +01:00 CET).
 * Usa l'offset corrente di Europe/Rome.
 */
function formatRomeIso(dateStr) {
    if (!dateStr) return null;
    let cleanStr = dateStr.trim();
    if (cleanStr.length === 10) {
        cleanStr += 'T00:00:00';
    } else if (cleanStr.length === 16) {
        cleanStr += ':00';
    }
    // Calcolo dell'offset di Roma per la data specificata (CEST +02:00 / CET +01:00)
    const testDate = new Date(cleanStr + 'Z');
    const year = testDate.getUTCFullYear();
    const mar31 = new Date(Date.UTC(year, 2, 31));
    const startDst = new Date(Date.UTC(year, 2, 31 - mar31.getUTCDay(), 1, 0, 0));
    const oct31 = new Date(Date.UTC(year, 9, 31));
    const endDst = new Date(Date.UTC(year, 9, 31 - oct31.getUTCDay(), 1, 0, 0));
    const isDst = testDate >= startDst && testDate < endDst;
    const offset = isDst ? '+02:00' : '+01:00';

    return `${cleanStr}${offset}`;
}

/**
 * Helper: ottiene gli header di autenticazione Bearer per le chiamate verso il Central Gateway.
 */
async function getGatewayAuthHeaders(req) {
    let token = req?.session?.tokenSet?.accessToken;
    if (!token) {
        try {
            const auth = await clientCredentialsAuth().catch(() => directPasswordAuth('edge_sync_service', 'syncpassword'));
            token = auth.accessToken;
        } catch (err) {
            console.error(`[Dashboard ${LOCALE_ID}] Impossibile ottenere token per Gateway:`, err.message);
        }
    }
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Fetch tutti i tornei e filtra per questo locale.
 */
async function fetchTorneiLocale(req) {
    try {
        const headers = await getGatewayAuthHeaders(req);
        const response = await fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei`, { headers });
        if (!response.ok) return [];
        const all = await response.json();
        // Filtra per LOCALE_ID: se localiIds è vuoto/null, mostra a tutti
        return all.filter(t =>
            !t.localiIds || t.localiIds.length === 0 || t.localiIds.includes(LOCALE_ID)
        );
    } catch (err) {
        console.error(`[Dashboard ${LOCALE_ID}] Errore fetch tornei:`, err.message);
        return [];
    }
}

/**
 * GET /
 * Home Page (Kiosk Mode). Pubblica.
 */
router.get('/', async (req, res) => {
    const installazioni = INSTALLAZIONI[LOCALE_ID] || [];
    const activeGames = getActiveMatches();
    const torneiLocale = await fetchTorneiLocale(req);
    // Nella home mostriamo solo tornei ATTIVI (per la selezione partita)
    const torneiAttivi = torneiLocale.filter(t => t.stato === 'ATTIVO');

    res.render('game-select', {
        title: `Seleziona Gioco — ${LOCALE_ID}`,
        localeId: LOCALE_ID,
        installazioni,
        activeGames,
        torneiAttivi
    });
});

/**
 * GET /dashboard
 * Dashboard principale dell'Edge (Privata).
 */
router.get('/dashboard', requireAuth, async (req, res) => {
    const user = req.session.user;
    const installazioni = INSTALLAZIONI[LOCALE_ID] || [];
    const activeGames = getActiveMatches();

    let localStats = { totalePartite: 0, inAttesaDiSync: 0, sincronizzate: 0, perGioco: [], ultimePartite: [] };
    try {
        localStats = getStatsLocale();
    } catch (err) {
        console.error(`[Dashboard ${LOCALE_ID}] Errore caricamento stats locali:`, err.message);
    }

    let stats = { ...localStats };

    // Arricchisce le statistiche dell'Edge con le partite censite nel Cloud per questo locale
    try {
        let tokenToUse = req.session.tokenSet?.accessToken;
        if (!tokenToUse) {
            try {
                const serviceUser = await directPasswordAuth('edge_sync_service', 'syncpassword');
                tokenToUse = serviceUser.accessToken;
            } catch (authErr) {
                console.error(`[Dashboard ${LOCALE_ID}] Impossibile ottenere token per fetch partite centrali:`, authErr.message);
            }
        }

        const headers = {};
        if (tokenToUse) {
            headers['Authorization'] = `Bearer ${tokenToUse}`;
        }

        const centralRes = await fetch(`${CENTRAL_SERVER_URL}/api/v1/partite?localeId=${LOCALE_ID}&page=0&size=100`, { headers });
        if (centralRes.ok) {
            const centralData = await centralRes.json();
            const centralPartite = (centralData.content || []).map(p => {
                let giocoIdNormalized = p.giocoId || (p.nomeGioco ? p.nomeGioco.toLowerCase() : 'calciobalilla');
                return {
                    id: p.id,
                    installazione_id: p.installazioneId,
                    locale_id: p.localeId,
                    gioco_id: giocoIdNormalized,
                    giocatore_1_id: p.giocatore1Id,
                    giocatore_1_username: p.giocatore1Username,
                    giocatore_2_id: p.giocatore2Id,
                    giocatore_2_username: p.giocatore2Username,
                    punteggio_1: p.punteggio1,
                    punteggio_2: p.punteggio2,
                    data_inizio: p.dataInizio,
                    data_fine: p.dataFine,
                    torneo_id: p.torneoId,
                    sincronizzata: 1
                };
            });

            // Unisci partite dal Cloud e partite locali non ancora sincronizzate
            const localUnsynced = (localStats.ultimePartite || []).filter(p => !p.sincronizzata);
            const mergedMap = new Map();

            centralPartite.forEach(p => mergedMap.set(p.id, p));
            localUnsynced.forEach(p => mergedMap.set(p.id, p));

            const combinedPartite = Array.from(mergedMap.values()).sort(
                (a, b) => new Date(b.data_fine) - new Date(a.data_fine)
            );

            // Aggregazioni per gioco
            const giocoStatsMap = {};
            combinedPartite.forEach(p => {
                const gId = p.gioco_id || 'calciobalilla';
                if (!giocoStatsMap[gId]) {
                    giocoStatsMap[gId] = { gioco_id: gId, count: 0, sum_p1: 0, sum_p2: 0 };
                }
                giocoStatsMap[gId].count++;
                giocoStatsMap[gId].sum_p1 += (p.punteggio_1 || 0);
                giocoStatsMap[gId].sum_p2 += (p.punteggio_2 || 0);
            });

            const perGiocoAgg = Object.values(giocoStatsMap).map(g => ({
                gioco_id: g.gioco_id,
                count: g.count,
                avg_p1: g.count > 0 ? g.sum_p1 / g.count : 0,
                avg_p2: g.count > 0 ? g.sum_p2 / g.count : 0
            }));

            stats = {
                totalePartite: combinedPartite.length,
                inAttesaDiSync: localStats.inAttesaDiSync,
                sincronizzate: centralData.totalElements,
                perGioco: perGiocoAgg,
                ultimePartite: combinedPartite.slice(0, 10)
            };
        }
    } catch (errCentral) {
        console.error(`[Dashboard ${LOCALE_ID}] Errore fetch partite centrali per locale:`, errCentral.message);
    }

    // Statistiche personali del giocatore
    let playerStats = null;
    if (user && user.id && !user.isGuest) {
        try {
            const detailRes = await fetch(`${CENTRAL_SERVER_URL}/api/v1/utenti/${user.id}`, {
                headers: { 'Authorization': `Bearer ${req.session.tokenSet.accessToken}` }
            });
            if (detailRes.ok) {
                const detailData = await detailRes.json();
                let ultimePartiteFormatted = [];
                try {
                    const partiteRes = await fetch(`${CENTRAL_SERVER_URL}/api/v1/utenti/${user.id}/partite?page=0&size=5`, {
                        headers: { 'Authorization': `Bearer ${req.session.tokenSet.accessToken}` }
                    });
                    if (partiteRes.ok) {
                        const partitePage = await partiteRes.json();
                        ultimePartiteFormatted = (partitePage.content || []).map(p => ({
                            giocatore_1_id: p.giocatore1Id,
                            giocatore_2_id: p.giocatore2Id,
                            punteggio_1: p.punteggio1,
                            punteggio_2: p.punteggio2,
                            gioco_id: p.nomeGioco || p.installazioneId || 'partita',
                            data_fine: p.dataFine
                        }));
                    }
                } catch (errPartite) {
                    console.error(`[Dashboard ${LOCALE_ID}] Errore fetch ultime partite:`, errPartite.message);
                }
                playerStats = {
                    totalePartite: detailData.totalePartite || 0,
                    vittorie: detailData.vittorie || 0,
                    sconfitte: detailData.sconfitte || 0,
                    percentualeVittorie: detailData.percentualeVittorie || 0,
                    ultimePartite: ultimePartiteFormatted
                };
            }
        } catch (err) {
            console.error(`[Dashboard ${LOCALE_ID}] Errore fetch stats giocatore:`, err.message);
        }
    }

    const isAdmin = canAdminCurrentLocale(user);

    // Fetch tornei filtrati per locale
    const torneiLocale = await fetchTorneiLocale(req);

    // Per ogni torneo, aggiungi info iscrizione utente corrente
    let torneiConStato = [];
    if (!user.isGuest && user.id) {
        const headers = await getGatewayAuthHeaders(req);
        torneiConStato = await Promise.all(torneiLocale.map(async t => {
            try {
                const iscRes = await fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei/${t.id}/iscrizioni`, { headers });
                const iscrizioniList = iscRes.ok ? (await iscRes.json()) : [];
                const isIscritto = iscrizioniList.some(i => i.utenteId === user.id);
                return {
                    ...t,
                    isIscritto,
                    canUnenroll: isIscritto && t.stato === 'NON_ATTIVO',
                    canCancel: isAdmin && t.stato === 'NON_ATTIVO'
                };
            } catch {
                return { ...t, isIscritto: false, canUnenroll: false, canCancel: isAdmin && t.stato === 'NON_ATTIVO' };
            }
        }));
    } else {
        torneiConStato = torneiLocale.map(t => ({
            ...t, isIscritto: false, canUnenroll: false, canCancel: isAdmin && t.stato === 'NON_ATTIVO'
        }));
    }

    res.render('dashboard', {
        title: `Dashboard — ${LOCALE_ID}`,
        localeId: LOCALE_ID,
        installazioni,
        activeGames,
        stats,
        playerStats,
        isAdmin,
        tornei: torneiConStato
    });
});

/**
 * GET /tornei/:torneoId/dettaglio e /dashboard/tornei/:torneoId/dettaglio
 * Dettaglio torneo: classifica + iscritti
 */
router.get(['/tornei/:torneoId/dettaglio', '/dashboard/tornei/:torneoId/dettaglio'], async (req, res) => {
    try {
        const { torneoId } = req.params;
        const headers = await getGatewayAuthHeaders(req);
        const [torneoRes, classificaRes, iscrittiRes] = await Promise.all([
            fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei/${torneoId}`, { headers }),
            fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei/${torneoId}/classifica`, { headers }),
            fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei/${torneoId}/iscrizioni`, { headers })
        ]);

        const torneo = torneoRes.ok ? await torneoRes.json() : null;
        const classificaData = classificaRes.ok ? await classificaRes.json() : { classifica: [] };
        const iscritti = iscrittiRes.ok ? await iscrittiRes.json() : [];

        res.json({
            torneo,
            classifica: classificaData.classifica || [],
            iscritti
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /tornei/iscriviti e /dashboard/tornei/iscriviti
 * Iscrive l'utente corrente a un torneo.
 */
router.post(['/tornei/iscriviti', '/dashboard/tornei/iscriviti'], requireAuth, async (req, res) => {
    try {
        const { torneoId } = req.body;
        const utenteId = req.session.user.id;

        const response = await fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei/${torneoId}/iscrizioni`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.session.tokenSet.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ utenteId })
        });

        if (response.ok) {
            res.json({ success: true });
        } else {
            const data = await response.json().catch(() => ({}));
            res.status(response.status).json({ error: data.message || 'Errore durante l\'iscrizione.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Errore di connessione al server centrale.' });
    }
});

/**
 * POST /tornei/disiscrivi e /dashboard/tornei/disiscrivi
 * Disiscrive l'utente corrente da un torneo.
 */
router.post(['/tornei/disiscrivi', '/dashboard/tornei/disiscrivi'], requireAuth, async (req, res) => {
    try {
        const { torneoId } = req.body;
        const utenteId = req.session.user.id;

        const response = await fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei/${torneoId}/iscrizioni/${utenteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${req.session.tokenSet.accessToken}` }
        });

        if (response.ok || response.status === 204) {
            res.json({ success: true });
        } else {
            const data = await response.json().catch(() => ({}));
            res.status(response.status).json({ error: data.message || 'Errore durante la disiscrizione.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Errore di connessione al server centrale.' });
    }
});

/**
 * POST /tornei/cancella e /dashboard/tornei/cancella
 * Cancella un torneo (solo admin, solo se NON_ATTIVO).
 */
router.post(['/tornei/cancella', '/dashboard/tornei/cancella'], requireAuth, requireAdminAccess, async (req, res) => {
    try {
        const { torneoId } = req.body;

        const response = await fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei/${torneoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${req.session.tokenSet.accessToken}` }
        });

        if (response.ok || response.status === 204) {
            res.json({ success: true });
        } else {
            const data = await response.json().catch(() => ({}));
            res.status(response.status).json({ error: data.message || 'Errore durante la cancellazione.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Errore di connessione al server centrale.' });
    }
});

/**
 * POST /tornei/crea e /dashboard/tornei/crea
 * Crea un nuovo torneo (solo per Admin).
 */
router.post(['/tornei/crea', '/dashboard/tornei/crea'], requireAuth, requireAdminAccess, async (req, res) => {
    try {
        const { nome, giocoId, dataInizio, dataFine, localiIds } = req.body;

        const payload = {
            nome,
            giocoId,
            dataInizio: formatRomeIso(dataInizio),
            dataFine: formatRomeIso(dataFine),
            localiId: Array.isArray(localiIds) ? localiIds : (localiIds ? [localiIds] : [LOCALE_ID])
        };

        const response = await fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.session.tokenSet.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            res.json({ success: true });
        } else {
            const data = await response.json().catch(() => ({}));
            res.status(response.status).json({ error: data.message || 'Errore durante la creazione del torneo.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Errore di connessione al server centrale.' });
    }
});

module.exports = router;
