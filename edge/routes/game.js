// Gestione ciclo di vita della partita (avvio autenticato o ospite, simulazione eventi MQTT e stato finale).

const express = require('express');
const router = express.Router();
const { directPasswordAuth, clientCredentialsAuth } = require('../services/oidc-client');
const { creaPartita, pubblicaEventoMqtt, getMatch, removeMatch } = require('../services/game-engine');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';
const CENTRAL_SERVER_URL = process.env.CENTRAL_SERVER_URL || 'http://service-gateway:8081';

// Recupera i token JWT di sessione o di servizio per le chiamate verso il Gateway centrale
async function getGatewayAuthHeaders(req) {
    let token = req?.session?.tokenSet?.accessToken;
    if (!token) {
        try {
            const auth = await clientCredentialsAuth().catch(() => directPasswordAuth('edge_sync_service', 'syncpassword'));
            token = auth.accessToken;
        } catch (err) {
            console.error(`[Game ${LOCALE_ID}] Impossibile ottenere token per Gateway:`, err.message);
        }
    }
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Recupera i tornei attivi per la selezione in fase di avvio partita
async function getTorneiAttiviLocale(req) {
    try {
        const headers = await getGatewayAuthHeaders(req);
        const response = await fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei`, { headers });
        if (!response.ok) return [];
        const all = await response.json();
        return all.filter(t => t.stato === 'ATTIVO');
    } catch (err) {
        console.error(`[Game ${LOCALE_ID}] Errore fetch tornei:`, err.message);
        return [];
    }
}

// Avvia una partita chiedendo le credenziali Direct Access Grant a entrambi i giocatori
router.post('/start', async (req, res) => {
    try {
        const { giocoId, player1Username, player1Password, player2Username, player2Password, torneoId } = req.body;

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
                torneiAttivi: await getTorneiAttiviLocale(req),
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
                torneiAttivi: await getTorneiAttiviLocale(req),
                error: `Autenticazione fallita: ${authErr.message}`
            });
        }

        if (!giocatore1.roles.includes('giocatore') || !giocatore2.roles.includes('giocatore')) {
            return res.status(403).render('game-select', {
                title: 'Seleziona Gioco',
                localeId: LOCALE_ID,
                torneiAttivi: await getTorneiAttiviLocale(req),
                error: 'Entrambi gli utenti devono avere il ruolo "giocatore" per poter giocare.'
            });
        }

        if (giocatore1.id === giocatore2.id) {
            return res.status(400).render('game-select', {
                title: 'Seleziona Gioco',
                localeId: LOCALE_ID,
                torneiAttivi: await getTorneiAttiviLocale(req),
                error: 'I due giocatori devono essere diversi.'
            });
        }

        // Se la partita fa parte di un torneo, verifica che entrambi i giocatori siano iscritti
        const selectedTorneo = torneoId ? torneoId : null;
        if (selectedTorneo) {
            try {
                const headers = await getGatewayAuthHeaders(req);
                const iscRes = await fetch(`${CENTRAL_SERVER_URL}/api/v1/tornei/${selectedTorneo}/iscrizioni`, { headers });
                if (!iscRes.ok) {
                    throw new Error(`Impossibile verificare le iscrizioni al torneo (status ${iscRes.status})`);
                }
                const iscrizioni = await iscRes.json();
                const iscrittiIds = iscrizioni.map(i => i.utenteId);

                const p1Iscritto = iscrittiIds.includes(giocatore1.id);
                const p2Iscritto = iscrittiIds.includes(giocatore2.id);

                if (!p1Iscritto || !p2Iscritto) {
                    const nonIscritto = !p1Iscritto ? giocatore1.username : giocatore2.username;
                    return res.status(403).render('game-select', {
                        title: 'Seleziona Gioco',
                        localeId: LOCALE_ID,
                        torneiAttivi: await getTorneiAttiviLocale(req),
                        error: `Impossibile avviare la partita: "${nonIscritto}" non è iscritto a questo torneo.`
                    });
                }
            } catch (torneoErr) {
                return res.status(500).render('game-select', {
                    title: 'Seleziona Gioco',
                    localeId: LOCALE_ID,
                    torneiAttivi: await getTorneiAttiviLocale(req),
                    error: `Errore verifica iscrizioni torneo: ${torneoErr.message}`
                });
            }
        }

        const match = creaPartita(giocoId, giocatore1, giocatore2, selectedTorneo);
        return res.redirect(`/game/${match.id}`);
    } catch (err) {
        console.error(`[Game ${LOCALE_ID}] Errore avvio partita:`, err.message);
        return res.status(500).render('error', {
            title: 'Errore',
            message: `Impossibile avviare la partita: ${err.message}`
        });
    }
});

// Avvia una partita amichevole senza autenticazione Keycloak (id null, non salvata in DB)
router.post('/start-guest', (req, res) => {
    try {
        const { giocoId, guest1Name, guest2Name } = req.body;

        if (!giocoId || !['calciobalilla', 'freccette'].includes(giocoId)) {
            return res.status(400).render('error', {
                title: 'Errore',
                message: 'Gioco non valido. Scegli tra calciobalilla o freccette.'
            });
        }

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

// Renderizza la vista di gioco in corso o il risultato finale
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

// Invia un evento di gioco al broker MQTT simulando la rilevazione da sensori fisici
router.post('/:matchId/event', (req, res) => {
    try {
        const match = getMatch(req.params.matchId);
        if (!match) {
            return res.status(404).json({ error: 'Partita non trovata' });
        }
        if (match.stato !== 'IN_CORSO') {
            return res.status(400).json({ error: 'Partita già terminata' });
        }

        pubblicaEventoMqtt(req.params.matchId, req.body);
        return res.json({ success: true, message: 'Evento inviato al broker MQTT' });
    } catch (err) {
        console.error(`[Game ${LOCALE_ID}] Errore evento:`, err.message);
        return res.status(400).json({ error: err.message });
    }
});

// Ritorna lo stato aggiornato della partita per l'aggiornamento dinamico in pagina via Polling/AJAX
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

// Mostra la pagina finale e programma il cleanup dalla memoria
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

    if (match.stato === 'TERMINATA') {
        setTimeout(() => removeMatch(match.id), 60000);
    }
});

module.exports = router;
