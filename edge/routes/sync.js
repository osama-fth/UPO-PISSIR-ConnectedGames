// Rotte per l'avvio manuale ed il monitoraggio dello stato di sincronizzazione offline → Server Centrale.

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdminAccess } = require('../middleware/auth');
const { sincronizzaAdesso, getSyncStatus } = require('../services/sync-service');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

// Forzatura manuale della sincronizzazione delle partite dal DB SQLite locale
router.post('/now', requireAuth, requireAdminAccess, async (req, res) => {
    try {
        console.log(`[Sync ${LOCALE_ID}] Sincronizzazione manuale avviata da ${req.session.user.username}`);
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

// Ritorna le metriche di sincronizzazione (ultima esecuzione, in corso, pendenti)
router.get('/status', requireAuth, requireAdminAccess, (req, res) => {
    return res.json(getSyncStatus());
});

module.exports = router;
