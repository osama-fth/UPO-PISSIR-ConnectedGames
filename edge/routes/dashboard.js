// ============================================================
// routes/dashboard.js — Dashboard Edge
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Dashboard principale con dati dinamici dal buffer SQLite.
// Vista differenziata per ruolo:
//   - Giocatore: pulsante "Gioca", statistiche personali
//   - Admin Locale: statistiche del locale, pulsante "Sincronizza"
//   - Admin Piattaforma: accesso completo a tutti i dati
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdminAccess, canAdminCurrentLocale } = require('../middleware/auth');
const { getStatsLocale, getStatsGiocatore } = require('../services/sqlite-db');
const { getActiveMatches } = require('../services/game-engine');

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
 * GET /
 * Home Page (Kiosk Mode).
 * Pubblica. Mostra la lista dei giochi, i tornei attivi e il form di login per i giocatori.
 */
router.get('/', async (req, res) => {
    const installazioni = INSTALLAZIONI[LOCALE_ID] || [];
    const activeGames = getActiveMatches();

    let torneiAttivi = [];
    try {
        const url = `${CENTRAL_SERVER_URL}/api/v1/tornei?stato=ATTIVO`;
        const response = await fetch(url);
        if (response.ok) {
            torneiAttivi = await response.json();
            // Filtra solo i tornei associati a questo locale (opzionale, ma sicuro)
            // Se la risposta dell'API non espone i locali, li mostriamo tutti o l'edge non discrimina
        }
    } catch (err) {
        console.error(`[Dashboard ${LOCALE_ID}] Errore fetch tornei:`, err.message);
    }

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
 * Mostra dati diversi in base al ruolo dell'utente.
 */
router.get('/dashboard', requireAuth, async (req, res) => {
    const user = req.session.user;
    const installazioni = INSTALLAZIONI[LOCALE_ID] || [];
    const activeGames = getActiveMatches();

    let stats = null;
    let playerStats = null;

    try {
        stats = getStatsLocale();
    } catch (err) {
        console.error(`[Dashboard ${LOCALE_ID}] Errore caricamento stats:`, err.message);
        stats = { totalePartite: 0, inAttesaDiSync: 0, sincronizzate: 0, perGioco: [], ultimePartite: [] };
    }

    // Statistiche personali del giocatore dal Server Centrale (nessun fallback SQLite)
    if (user && user.id && !user.isGuest) {
        try {
            const detailUrl = `${CENTRAL_SERVER_URL}/api/v1/utenti/${user.id}`;
            const detailRes = await fetch(detailUrl, {
                headers: { 'Authorization': `Bearer ${req.session.tokenSet.accessToken}` }
            });
            if (detailRes.ok) {
                const detailData = await detailRes.json();

                let ultimePartiteFormatted = [];
                try {
                    const partiteUrl = `${CENTRAL_SERVER_URL}/api/v1/utenti/${user.id}/partite?page=0&size=5`;
                    const partiteRes = await fetch(partiteUrl, {
                        headers: { 'Authorization': `Bearer ${req.session.tokenSet.accessToken}` }
                    });
                    if (partiteRes.ok) {
                        const partitePage = await partiteRes.json();
                        const content = partitePage.content || [];
                        ultimePartiteFormatted = content.map(p => ({
                            giocatore_1_id: p.giocatore1Id,
                            giocatore_2_id: p.giocatore2Id,
                            punteggio_1: p.punteggio1,
                            punteggio_2: p.punteggio2,
                            gioco_id: p.nomeGioco || p.installazioneId || 'partita',
                            data_fine: p.dataFine
                        }));
                    }
                } catch (errPartite) {
                    console.error(`[Dashboard ${LOCALE_ID}] Errore fetch ultime partite dal server centrale:`, errPartite.message);
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
            console.error(`[Dashboard ${LOCALE_ID}] Errore fetch stats giocatore dal server centrale:`, err.message);
            playerStats = { totalePartite: 0, vittorie: 0, sconfitte: 0, percentualeVittorie: 0, ultimePartite: [] };
        }
    }

    const isAdmin = canAdminCurrentLocale(user);

    let torneiAttivi = [];
    try {
        const url = `${CENTRAL_SERVER_URL}/api/v1/tornei?stato=ATTIVO`;
        // Fetch requires the access token because this is in /dashboard? No, GET /tornei is public if we don't pass token? 
        // Wait, Gateway forwards to torneo-service. Let's pass the token anyway.
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${req.session.tokenSet.accessToken}` }
        });
        if (response.ok) {
            torneiAttivi = await response.json();
        }
    } catch (err) {
        console.error(`[Dashboard ${LOCALE_ID}] Errore fetch tornei:`, err.message);
    }

    res.render('dashboard', {
        title: `Dashboard — ${LOCALE_ID}`,
        localeId: LOCALE_ID,
        installazioni,
        activeGames,
        stats,
        playerStats,
        isAdmin,
        torneiAttivi
    });
});

/**
 * POST /dashboard/tornei/iscriviti
 * Iscrive l'utente corrente a un torneo.
 */
router.post('/tornei/iscriviti', requireAuth, async (req, res) => {
    try {
        const { torneoId } = req.body;
        const url = `${CENTRAL_SERVER_URL}/api/v1/tornei/${torneoId}/iscrizioni`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.session.tokenSet.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            res.json({ success: true });
        } else {
            const data = await response.json().catch(() => ({}));
            res.status(response.status).json({ error: data.message || 'Errore durante l\'iscrizione al torneo.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Errore di connessione al server centrale.' });
    }
});

/**
 * POST /dashboard/tornei/crea
 * Crea un nuovo torneo (solo per Admin Piattaforma).
 */
router.post('/tornei/crea', requireAuth, requireAdminAccess, async (req, res) => {
    try {
        const { nome, giocoId, dataFine, localiIds } = req.body;
        
        const payload = {
            nome,
            giocoId,
            dataInizio: new Date().toISOString(),
            dataFine: new Date(dataFine).toISOString(),
            localiIds: Array.isArray(localiIds) ? localiIds : [localiIds]
        };
        
        const url = `${CENTRAL_SERVER_URL}/api/v1/tornei`;
        const response = await fetch(url, {
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
