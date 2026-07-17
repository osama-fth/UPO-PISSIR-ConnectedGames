// ============================================================
// routes/sync.js — Rotte di Sincronizzazione
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Espone gli endpoint per la sincronizzazione manuale
// e lo stato della sync Edge → Server Centrale.
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdminAccess } = require('../middleware/auth');
const { sincronizzaAdesso, getSyncStatus } = require('../services/sync-service');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

/**
 * POST /sync/now
 * Trigger manuale della sincronizzazione.
 * Accessibile solo ad admin_locale (del proprio locale) e admin_piattaforma.
 * Utilizza l'access token dell'utente corrente per autenticare
 * la richiesta verso il Server Centrale.
 */
router.post('/now', requireAuth, requireAdminAccess, async (req, res) => {
    try {
        console.log(`[Sync ${LOCALE_ID}] Sincronizzazione manuale avviata da ${req.session.user.username}`);

        // Usiamo sempre il token di servizio (edge_sync_service) invece di quello
        // dell'utente per evitare errori 401 dovuti al mismatch dell'issuer JWT
        // tra l'accesso da localhost (browser) e keycloak:8080 (backend)
        const result = await sincronizzaAdesso(null);

        if (result.inProgress) {
            return res.status(409).json({
                error: result.error,
                inProgress: true
            });
        }

        if (result.success) {
            return res.json({
                message: 'Sincronizzazione completata',
                salvate: result.salvate,
                fallite: result.fallite,
                dettagliFallite: result.dettagliFallite || []
            });
        } else {
            return res.status(500).json({
                error: result.error || 'Errore durante la sincronizzazione'
            });
        }

    } catch (err) {
        console.error(`[Sync ${LOCALE_ID}] Errore sync manuale:`, err.message);
        return res.status(500).json({ error: err.message });
    }
});

/**
 * GET /sync/status
 * Restituisce lo stato corrente della sincronizzazione.
 * Accessibile ad admin_locale e admin_piattaforma.
 */
router.get('/status', requireAuth, requireAdminAccess, (req, res) => {
    const status = getSyncStatus();
    return res.json(status);
});

module.exports = router;
