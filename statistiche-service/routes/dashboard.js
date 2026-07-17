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
const { requireAuth } = require('../middleware/auth');

const CENTRAL_SERVER_URL = process.env.CENTRAL_SERVER_URL || 'http://service-gateway:8081';

router.get('/', requireAuth, async (req, res) => {
    const user = req.session.user;
    
    // Solo admin_piattaforma può accedere
    if (!user.roles || !user.roles.includes('admin_piattaforma')) {
        return res.status(403).send("Accesso negato: richiesto ruolo admin_piattaforma");
    }

    let stats = { totalePartite: 0, totaleUtenti: 0, totaleTornei: 0 };
    
    try {
        const response = await fetch(`${CENTRAL_SERVER_URL}/api/v1/statistiche`, {
            headers: {
                'Authorization': `Bearer ${req.session.tokenSet.accessToken}`
            }
        });
        if (response.ok) {
            stats = await response.json();
        }
    } catch (err) {
        console.error(`[Platform Dashboard] Errore fetch stats:`, err.message);
    }

    res.render('dashboard', {
        title: `Dashboard Globale — Connected Games`,
        stats,
        user
    });
});

module.exports = router;
