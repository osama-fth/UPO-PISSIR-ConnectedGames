// ============================================================
// routes/dashboard.js — Dashboard Edge
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

/**
 * GET /
 * Dashboard principale dell'Edge.
 * Mostra stato utente, connessione MQTT, info locale.
 * La logica dei giochi verrà aggiunta in una fase successiva.
 */
router.get('/', requireAuth, (req, res) => {
    res.render('dashboard', {
        title: `Dashboard — ${LOCALE_ID}`,
        localeId: LOCALE_ID
    });
});

module.exports = router;
