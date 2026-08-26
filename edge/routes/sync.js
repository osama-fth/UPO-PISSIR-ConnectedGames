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
            // Controlla se l'errore è dovuto a problemi di connettività
            const isNetworkError = result.error && (
                result.error.includes('fetch failed') ||
                result.error.includes('ECONNREFUSED') ||
                result.error.includes('ENOTFOUND') ||
                result.error.includes('ETIMEDOUT') ||
                result.error.includes('timeout') ||
                result.error.includes('network')
            );
            const userMessage = isNetworkError
                ? 'Errore: servizio cloud non disponibile al momento'
                : (result.error || 'Errore durante la sincronizzazione');
            return res.status(isNetworkError ? 503 : 500).json({
                error: userMessage
            });
        }
    } catch (err) {
        console.error(`[Sync ${LOCALE_ID}] Errore sync manuale:`, err.message);
        const isNetworkError = err.message && (
            err.message.includes('fetch failed') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('ENOTFOUND') ||
            err.message.includes('ETIMEDOUT')
        );
        return res.status(isNetworkError ? 503 : 500).json({
            error: isNetworkError
                ? 'Errore: servizio cloud non disponibile al momento'
                : err.message
        });
    }
});

// Ritorna le metriche di sincronizzazione (ultima esecuzione, in corso, pendenti)
router.get('/status', requireAuth, requireAdminAccess, (req, res) => {
    return res.json(getSyncStatus());
});

module.exports = router;
