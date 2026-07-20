// ============================================================
// routes/game.js — Rotte di Gioco
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Gestisce il flusso di gioco: selezione, avvio con login
// di 2 giocatori, eventi di gioco, e risultato finale.
// Gli eventi di gioco simulano il pattern MQTT:
// UI → POST rotta → publish MQTT → subscribe Edge → aggiorna stato
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkKeycloakHealth, directPasswordAuth } = require('../services/oidc-client');
const { creaPartita, processaEvento, pubblicaEventoMqtt, getMatch, removeMatch } = require('../services/game-engine');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';
const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080/realms/pissir-realm';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'edge-client';



/**
 * POST /game/start
 * Avvia una nuova partita. Richiede l'autenticazione di 2 giocatori.
 * Entrambi i giocatori si autenticano con username e password
 * via Direct Access Grant.
 */
router.post('/start', async (req, res) => {
    try {
        const { giocoId, player1Username, player1Password, player2Username, player2Password } = req.body;

        if (!giocoId || !['calciobalilla', 'freccette'].includes(giocoId)) {
            return res.status(400).render('error', {
                title: 'Errore',
                message: 'Gioco non valido. Scegli tra calciobalilla o freccette.'
            });
        }

        if (!player1Username || !player1Password || !player2Username || !player2Password) {
            return res.status(400).render('game-select', {
                title: 'Seleziona Gioco',
                localeId: LOCALE_ID,
                error: 'Inserisci le credenziali per entrambi i giocatori.'
            });
        }

        let giocatore1, giocatore2;
        try {
            giocatore1 = await directPasswordAuth(player1Username, player1Password);
            giocatore2 = await directPasswordAuth(player2Username, player2Password);
        } catch (authErr) {
            return res.status(401).render('game-select', {
                title: 'Seleziona Gioco',
                localeId: LOCALE_ID,
                error: `Autenticazione fallita: ${authErr.message}`
            });
        }

        // Controlla il ruolo giocatore per entrambi
        if (!giocatore1.roles.includes('giocatore') || !giocatore2.roles.includes('giocatore')) {
            return res.status(403).render('game-select', {
                title: 'Seleziona Gioco',
                localeId: LOCALE_ID,
                error: 'Entrambi gli utenti devono avere il ruolo "giocatore" per poter giocare.'
            });
        }

        // Controlla che non sia lo stesso giocatore
        if (giocatore1.id === giocatore2.id) {
            return res.status(400).render('game-select', {
                title: 'Seleziona Gioco',
                localeId: LOCALE_ID,
                error: 'I due giocatori devono essere diversi.'
            });
        }

        // Crea la partita
        const match = creaPartita(giocoId, giocatore1, giocatore2);

        // Redirect alla pagina di gioco
        return res.redirect(`/game/${match.id}`);

    } catch (err) {
        console.error(`[Game ${LOCALE_ID}] Errore avvio partita:`, err.message);
        return res.status(500).render('error', {
            title: 'Errore',
            message: `Impossibile avviare la partita: ${err.message}`
        });
    }
});

/**
 * POST /game/start-guest
 * Avvia una nuova partita in modalità Ospite.
 * Non richiede autenticazione Keycloak: i giocatori inseriscono
 * solo un nome di visualizzazione. I player_id sono NULL,
 * quindi la partita NON verrà salvata su SQLite (UC1.1).
 */
router.post('/start-guest', (req, res) => {
    try {
        const { giocoId, guest1Name, guest2Name } = req.body;

        if (!giocoId || !['calciobalilla', 'freccette'].includes(giocoId)) {
            return res.status(400).render('error', {
                title: 'Errore',
                message: 'Gioco non valido. Scegli tra calciobalilla o freccette.'
            });
        }

        // Sanitizza i nomi: rimuovi tag HTML e trim
        const nome1 = (guest1Name || '').replace(/<[^>]*>/g, '').trim();
        const nome2 = (guest2Name || '').replace(/<[^>]*>/g, '').trim();

        if (!nome1 || !nome2) {
            return res.status(400).render('game-select', {
                title: 'Seleziona Gioco',
                localeId: LOCALE_ID,
                error: 'Inserisci il nome per entrambi i giocatori.'
            });
        }

        if (nome1.toLowerCase() === nome2.toLowerCase()) {
            return res.status(400).render('game-select', {
                title: 'Seleziona Gioco',
                localeId: LOCALE_ID,
                error: 'I due giocatori devono avere nomi diversi.'
            });
        }

        // Crea giocatori ospite con id NULL (partita non salvata su SQLite)
        const giocatore1 = { id: null, username: nome1 };
        const giocatore2 = { id: null, username: nome2 };

        const match = creaPartita(giocoId, giocatore1, giocatore2);

        console.log(`[Game ${LOCALE_ID}] Partita ospite ${match.id} avviata: ${nome1} vs ${nome2}`);
        return res.redirect(`/game/${match.id}`);

    } catch (err) {
        console.error(`[Game ${LOCALE_ID}] Errore avvio partita ospite:`, err.message);
        return res.status(500).render('error', {
            title: 'Errore',
            message: `Impossibile avviare la partita: ${err.message}`
        });
    }
});

/**
 * GET /game/:matchId
 * Mostra la pagina di gioco attiva con l'interfaccia per
 * Calciobalilla o Freccette.
 */
router.get('/:matchId', (req, res) => {
    const match = getMatch(req.params.matchId);

    if (!match) {
        return res.status(404).render('error', {
            title: 'Partita Non Trovata',
            message: 'La partita richiesta non esiste o è già stata terminata.'
        });
    }

    if (match.stato === 'TERMINATA') {
        return res.render('game-result', {
            title: 'Risultato Partita',
            match,
            localeId: LOCALE_ID
        });
    }

    res.render('game-play', {
        title: `Partita in Corso — ${match.giocoId}`,
        match,
        localeId: LOCALE_ID
    });
});

/**
 * POST /game/:matchId/event
 * Riceve un evento di gioco dall'interfaccia.
 * L'evento viene processato direttamente dal game engine
 * (simulando il percorso MQTT: UI → publish → subscribe → processa).
 */
router.post('/:matchId/event', (req, res) => {
    try {
        const match = getMatch(req.params.matchId);
        if (!match) {
            return res.status(404).json({ error: 'Partita non trovata' });
        }
        if (match.stato !== 'IN_CORSO') {
            return res.status(400).json({ error: 'Partita già terminata' });
        }

        const evento = req.body;

        // Simula il percorso MQTT: pubblica l'evento, poi processalo
        // In un setup reale, il publish su Mosquitto trigger la subscription
        // che a sua volta chiama processaEvento. Qui lo facciamo in-line
        // per semplicità, ma manteniamo la semantica.
        pubblicaEventoMqtt(req.params.matchId, evento);

        // Processa l'evento direttamente (simula la ricezione via MQTT)
        const updatedMatch = processaEvento(req.params.matchId, evento);

        return res.json({
            stato: updatedMatch.stato,
            punteggio1: updatedMatch.punteggio1,
            punteggio2: updatedMatch.punteggio2,
            giocatore1: updatedMatch.giocatore1,
            giocatore2: updatedMatch.giocatore2,
            turnoCorrente: updatedMatch.turnoCorrente || null,
            tiriNelTurno: updatedMatch.tiriNelTurno || 0,
            vincitore: updatedMatch.vincitore || null,
            giocoId: updatedMatch.giocoId
        });

    } catch (err) {
        console.error(`[Game ${LOCALE_ID}] Errore evento:`, err.message);
        return res.status(400).json({ error: err.message });
    }
});

/**
 * GET /game/:matchId/status
 * Endpoint JSON per polling dello stato partita.
 */
router.get('/:matchId/status', (req, res) => {
    const match = getMatch(req.params.matchId);
    if (!match) {
        return res.status(404).json({ error: 'Partita non trovata' });
    }

    return res.json({
        id: match.id,
        stato: match.stato,
        giocoId: match.giocoId,
        punteggio1: match.punteggio1,
        punteggio2: match.punteggio2,
        giocatore1: match.giocatore1,
        giocatore2: match.giocatore2,
        turnoCorrente: match.turnoCorrente || null,
        tiriNelTurno: match.tiriNelTurno || 0,
        vincitore: match.vincitore || null,
        dataInizio: match.dataInizio,
        dataFine: match.dataFine
    });
});

/**
 * GET /game/:matchId/result
 * Pagina di risultato della partita terminata.
 */
router.get('/:matchId/result', (req, res) => {
    const match = getMatch(req.params.matchId);
    if (!match) {
        return res.status(404).render('error', {
            title: 'Partita Non Trovata',
            message: 'La partita richiesta non esiste.'
        });
    }

    res.render('game-result', {
        title: 'Risultato Partita',
        match,
        localeId: LOCALE_ID
    });

    // Cleanup: rimuovi dalla memoria dopo che il risultato è stato visualizzato
    if (match.stato === 'TERMINATA') {
        setTimeout(() => removeMatch(match.id), 60000); // Rimuovi dopo 1 minuto
    }
});



module.exports = router;
