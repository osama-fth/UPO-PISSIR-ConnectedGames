// ============================================================
// services/game-engine.js — Motore di Gioco In-Memory
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Gestisce lo stato delle partite attive in memoria.
// Supporta Calciobalilla (a 10 gol) e Freccette (301).
// Gli eventi di gioco passano via MQTT per rispettare il
// pattern architetturale sensori → broker → edge.
// ============================================================

const { v4: uuidv4 } = require('uuid');
const { publishEvent, getMqttEvents } = require('./mqtt-client');
const { 
    salvaPartita, 
    salvaPartitaAttiva, 
    rimuoviPartitaAttiva, 
    getPartiteAttiveSalvate 
} = require('./sqlite-db');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

// Mappa delle partite attive: matchId → stato partita
const activeMatches = new Map();

// Mapping gioco_id → installazione_id per il locale corrente
const INSTALLAZIONI = {
    'BAR_BELVEDERE': {
        'calciobalilla': 'calciobalilla-1',
        'freccette': 'freccette-1'
    },
    'SALA_GIOCHI_ROMA': {
        'calciobalilla': 'calciobalilla-2',
        'freccette': 'freccette-2'
    }
};

/**
 * Crea una nuova partita.
 * @param {string} giocoId - 'calciobalilla' o 'freccette'
 * @param {Object} giocatore1 - { id, username }
 * @param {Object} giocatore2 - { id, username }
 * @param {string} [torneoId] - UUID opzionale del torneo
 * @returns {Object} Lo stato iniziale della partita
 */
function creaPartita(giocoId, giocatore1, giocatore2, torneoId = null) {
    const matchId = uuidv4();
    const installazioneId = INSTALLAZIONI[LOCALE_ID]?.[giocoId];

    if (!installazioneId) {
        throw new Error(`Gioco "${giocoId}" non installato nel locale ${LOCALE_ID}`);
    }

    const match = {
        id: matchId,
        giocoId,
        installazioneId,
        localeId: LOCALE_ID,
        torneoId,
        giocatore1: { id: giocatore1.id, username: giocatore1.username },
        giocatore2: { id: giocatore2.id, username: giocatore2.username },
        stato: 'IN_CORSO',
        dataInizio: new Date().toISOString(),
        dataFine: null,
        eventi: []
    };

    if (giocoId === 'calciobalilla') {
        match.punteggio1 = 0;
        match.punteggio2 = 0;
        match.maxPunteggio = 10;
    } else if (giocoId === 'freccette') {
        match.punteggio1 = 301;
        match.punteggio2 = 301;
        match.turnoCorrente = 1; // 1 = giocatore1, 2 = giocatore2
        match.tiriNelTurno = 0;
        match.maxTiriPerTurno = 3;
    }

    activeMatches.set(matchId, match);
    try {
        salvaPartitaAttiva(match); // Fix C1: Persistenza immediata su SQLite
    } catch (e) {
        console.error(`[GameEngine ${LOCALE_ID}] Errore salvataggio partita attiva SQLite:`, e.message);
    }

    console.log(`[GameEngine ${LOCALE_ID}] Partita ${matchId} creata: ${giocoId} — ${giocatore1.username} vs ${giocatore2.username}`);

    return match;
}

/**
 * Processa un evento di gioco ricevuto via MQTT.
 * @param {string} matchId - ID della partita
 * @param {Object} evento - Dati dell'evento
 * @returns {Object} Lo stato aggiornato della partita
 */
function processaEvento(matchId, evento) {
    const match = activeMatches.get(matchId);
    if (!match) {
        throw new Error(`Partita ${matchId} non trovata`);
    }
    if (match.stato !== 'IN_CORSO') {
        throw new Error(`Partita ${matchId} già terminata`);
    }

    match.eventi.push({
        ...evento,
        timestamp: new Date().toISOString()
    });

    let resMatch;
    if (match.giocoId === 'calciobalilla') {
        resMatch = processaEventoCalciobalilla(match, evento);
    } else if (match.giocoId === 'freccette') {
        resMatch = processaEventoFreccette(match, evento);
    } else {
        resMatch = match;
    }

    // Fix C1: Aggiorna lo stato della partita attiva in SQLite dopo l'evento
    if (resMatch && resMatch.stato === 'IN_CORSO') {
        try {
            salvaPartitaAttiva(resMatch);
        } catch (e) {
            console.error(`[GameEngine ${LOCALE_ID}] Errore aggiornamento partita attiva in SQLite:`, e.message);
        }
    }

    return resMatch;
}

/**
 * Calciobalilla: incrementa il punteggio del team che ha segnato.
 * Al raggiungimento di 10 gol, la partita termina.
 */
function processaEventoCalciobalilla(match, evento) {
    if (evento.tipo !== 'GOAL') return match;

    if (evento.team === 'A') {
        match.punteggio1++;
    } else if (evento.team === 'B') {
        match.punteggio2++;
    }

    console.log(`[GameEngine] Calciobalilla ${match.id}: ${match.punteggio1} - ${match.punteggio2}`);

    // Controlla fine partita (10 gol)
    if (match.punteggio1 >= match.maxPunteggio || match.punteggio2 >= match.maxPunteggio) {
        terminaPartita(match);
    }

    return match;
}

/**
 * Freccette 301: sottrae il punteggio dal totale.
 * Turni alternati (3 tiri per turno). Bust se si scende sotto 0.
 * Vince chi raggiunge esattamente 0.
 */
function processaEventoFreccette(match, evento) {
    if (evento.tipo !== 'TIRO') return match;

    const valore = calcolaValoreTiro(evento.settore, evento.moltiplicatore);
    const isPlayer1Turn = match.turnoCorrente === 1;

    if (isPlayer1Turn) {
        const nuovoPunteggio = match.punteggio1 - valore;
        if (nuovoPunteggio < 0) {
            // Bust: il turno è annullato, il punteggio non cambia
            console.log(`[GameEngine] Freccette ${match.id}: BUST per ${match.giocatore1.username} (${match.punteggio1} - ${valore} = ${nuovoPunteggio})`);
            // Passa al prossimo giocatore
            match.turnoCorrente = 2;
            match.tiriNelTurno = 0;
            return match;
        }
        match.punteggio1 = nuovoPunteggio;
    } else {
        const nuovoPunteggio = match.punteggio2 - valore;
        if (nuovoPunteggio < 0) {
            console.log(`[GameEngine] Freccette ${match.id}: BUST per ${match.giocatore2.username} (${match.punteggio2} - ${valore} = ${nuovoPunteggio})`);
            match.turnoCorrente = 1;
            match.tiriNelTurno = 0;
            return match;
        }
        match.punteggio2 = nuovoPunteggio;
    }

    match.tiriNelTurno++;

    console.log(`[GameEngine] Freccette ${match.id}: G1=${match.punteggio1} G2=${match.punteggio2} (tiro: ${evento.settore}×${evento.moltiplicatore} = ${valore})`);

    // Controlla fine partita
    if (match.punteggio1 === 0 || match.punteggio2 === 0) {
        terminaPartita(match);
        return match;
    }

    // Dopo 3 tiri, cambia turno
    if (match.tiriNelTurno >= match.maxTiriPerTurno) {
        match.turnoCorrente = isPlayer1Turn ? 2 : 1;
        match.tiriNelTurno = 0;
    }

    return match;
}

/**
 * Calcola il valore numerico di un tiro di freccette.
 * @param {number|string} settore - Numero del settore (1-20) o 'BULL' (25) o 'DBULL' (50)
 * @param {number} moltiplicatore - 1 (singolo), 2 (doppio), 3 (triplo)
 */
function calcolaValoreTiro(settore, moltiplicatore) {
    if (settore === 'BULL') return 25;
    if (settore === 'DBULL') return 50;

    const settoreNumero = parseInt(settore, 10);
    if (isNaN(settoreNumero) || settoreNumero < 1 || settoreNumero > 20) {
        return 0;
    }

    const molt = parseInt(moltiplicatore, 10);
    if (molt < 1 || molt > 3) return settoreNumero;

    return settoreNumero * molt;
}

/**
 * Termina una partita e la salva nel buffer SQLite.
 */
function terminaPartita(match) {
    match.stato = 'TERMINATA';
    match.dataFine = new Date().toISOString();

    // Determina il vincitore
    if (match.giocoId === 'calciobalilla') {
        match.vincitore = match.punteggio1 > match.punteggio2
            ? match.giocatore1.username
            : match.giocatore2.username;
    } else if (match.giocoId === 'freccette') {
        match.vincitore = match.punteggio1 === 0
            ? match.giocatore1.username
            : match.giocatore2.username;
    }

    console.log(`[GameEngine ${LOCALE_ID}] Partita ${match.id} TERMINATA — Vincitore: ${match.vincitore}`);

    // Per calciobalilla salviamo i punteggi così come sono (gol segnati)
    // Per freccette salviamo il punteggio residuo (0 = vincitore)
    const punteggio1Finale = match.giocoId === 'calciobalilla' ? match.punteggio1 : (301 - match.punteggio1);
    const punteggio2Finale = match.giocoId === 'calciobalilla' ? match.punteggio2 : (301 - match.punteggio2);

    // Salva nel buffer SQLite (solo se entrambi i giocatori sono autenticati)
    const hasAuthPlayers = match.giocatore1.id && match.giocatore2.id;
    if (hasAuthPlayers) {
        try {
            salvaPartita({
                id: match.id,
                installazioneId: match.installazioneId,
                localeId: match.localeId,
                giocoId: match.giocoId,
                giocatore1Id: match.giocatore1.id,
                giocatore1Username: match.giocatore1.username,
                giocatore2Id: match.giocatore2.id,
                giocatore2Username: match.giocatore2.username,
                punteggio1: punteggio1Finale,
                punteggio2: punteggio2Finale,
                dataInizio: match.dataInizio,
                dataFine: match.dataFine,
                torneoId: match.torneoId
            });
        } catch (err) {
            console.error(`[GameEngine ${LOCALE_ID}] Errore salvataggio SQLite:`, err.message);
        }
    } else {
        console.log(`[GameEngine ${LOCALE_ID}] Partita ospite — non salvata su SQLite`);
    }

    // Fix C1: Rimuove la partita dalla tabella partite_attive quando termina
    try {
        rimuoviPartitaAttiva(match.id);
    } catch (e) {
        console.error(`[GameEngine ${LOCALE_ID}] Errore rimozione partita attiva in SQLite:`, e.message);
    }

    return match;
}

/**
 * Pubblica un evento di gioco su MQTT (simulazione sensori).
 * L'evento viene poi riconsumato dall'Edge via subscription.
 */
function pubblicaEventoMqtt(matchId, evento) {
    const match = activeMatches.get(matchId);
    if (!match) return false;

    const mqttPayload = {
        tipo: evento.tipo,
        matchId: matchId,
        giocoId: match.giocoId,
        ...evento,
        timestamp: new Date().toISOString()
    };

    return publishEvent(mqttPayload);
}

/**
 * Recupera lo stato di una partita attiva.
 */
function getMatch(matchId) {
    return activeMatches.get(matchId) || null;
}

/**
 * Recupera tutte le partite attive.
 */
function getActiveMatches() {
    return Array.from(activeMatches.values()).filter(m => m.stato === 'IN_CORSO');
}

/**
 * Rimuove una partita dalla memoria e da SQLite (cleanup).
 */
function removeMatch(matchId) {
    activeMatches.delete(matchId);
    try {
        rimuoviPartitaAttiva(matchId);
    } catch (e) {
        // Ignora se non presente
    }
}

/**
 * Carica le partite attive salvate nel DB SQLite all'avvio dell'Edge Node (Fix C1).
 */
function caricaPartiteAttiveDaDb() {
    try {
        const matches = getPartiteAttiveSalvate();
        for (const m of matches) {
            if (m && m.id && m.stato === 'IN_CORSO') {
                activeMatches.set(m.id, m);
            }
        }
        if (activeMatches.size > 0) {
            console.log(`[GameEngine ${LOCALE_ID}] Ripristinate ${activeMatches.size} partite attive da SQLite (Fix C1)`);
        }
    } catch (err) {
        console.error(`[GameEngine ${LOCALE_ID}] Errore ripristino partite attive da SQLite:`, err.message);
    }
}

/**
 * Controllo periodico per pulizia partite abbandonate (Fix C1 TTL).
 */
function avviaTimeoutPartiteAbbandonate() {
    setInterval(() => {
        const now = Date.now();
        const MAX_INACTIVE_MS = 2 * 60 * 60 * 1000; // 2 ore

        for (const [matchId, match] of activeMatches.entries()) {
            const lastEventTime = match.eventi && match.eventi.length > 0
                ? new Date(match.eventi[match.eventi.length - 1].timestamp).getTime()
                : new Date(match.dataInizio).getTime();

            if (now - lastEventTime > MAX_INACTIVE_MS) {
                console.warn(`[GameEngine ${LOCALE_ID}] Partita ${matchId} inattiva da >2h. Marcatura come ABBANDONATA.`);
                match.stato = 'ABBANDONATA';
                removeMatch(matchId);
            }
        }
    }, 5 * 60 * 1000).unref();
}

module.exports = {
    creaPartita,
    processaEvento,
    pubblicaEventoMqtt,
    getMatch,
    getActiveMatches,
    removeMatch,
    calcolaValoreTiro,
    caricaPartiteAttiveDaDb,
    avviaTimeoutPartiteAbbandonate
};

// ============================================================
// Inizializzazione e sottoscrizione eventi MQTT reali
// ============================================================
caricaPartiteAttiveDaDb();
avviaTimeoutPartiteAbbandonate();

getMqttEvents().on('evento', ({ topic, payload }) => {
    try {
        if (payload && payload.matchId && payload.tipo) {
            console.log(`[GameEngine ${LOCALE_ID}] Elaborazione evento MQTT reale per match ${payload.matchId}`);
            processaEvento(payload.matchId, payload);
        }
    } catch (err) {
        console.error(`[GameEngine ${LOCALE_ID}] Errore elaborazione evento MQTT:`, err.message);
    }
});
