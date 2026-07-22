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

/**
 * GET /
 * Home Page (Kiosk Mode).
 * Pubblica. Mostra la lista dei giochi e il form di login per i giocatori.
 */
router.get('/', (req, res) => {
    const installazioni = INSTALLAZIONI[LOCALE_ID] || [];
    const activeGames = getActiveMatches();

    res.render('game-select', {
        title: `Seleziona Gioco — ${LOCALE_ID}`,
        localeId: LOCALE_ID,
        installazioni,
        activeGames
    });
});

/**
 * GET /dashboard
 * Dashboard principale dell'Edge (Privata).
 * Mostra dati diversi in base al ruolo dell'utente.
 */
router.get('/dashboard', requireAuth, (req, res) => {
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

    // Statistiche personali del giocatore
    if (user && user.id && !user.isGuest) {
        try {
            playerStats = getStatsGiocatore(user.id);
        } catch (err) {
            console.error(`[Dashboard ${LOCALE_ID}] Errore stats giocatore:`, err.message);
        }
    }

    const isAdmin = canAdminCurrentLocale(user);

    res.render('dashboard', {
        title: `Dashboard — ${LOCALE_ID}`,
        localeId: LOCALE_ID,
        installazioni,
        activeGames,
        stats,
        playerStats,
        isAdmin
    });
});

module.exports = router;
