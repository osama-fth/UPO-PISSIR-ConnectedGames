// Motore di gioco in-memoria per Calciobalilla, Freccette e Biliardo 8-Ball con persistenza stato su SQLite e broker MQTT.

const { v4: uuidv4 } = require('uuid');
const { publishEvent, getMqttEvents } = require('./mqtt-client');
const {
    salvaPartita,
    salvaPartitaAttiva,
    rimuoviPartitaAttiva,
    getPartiteAttiveSalvate,
    salvaInstallazioniCache,
    getInstallazioniCache
} = require('./sqlite-db');
const { clientCredentialsAuth } = require('./oidc-client');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';
const CENTRAL_SERVER_URL = process.env.CENTRAL_SERVER_URL || 'http://service-gateway:8081';

const activeMatches = new Map();
const installazioniLocaleMap = new Map();

// Helper per estrarre la chiave normalizzata del gioco ('calciobalilla', 'freccette', 'biliardo')
function normalizzaGiocoId(str) {
    const s = (str || '').toLowerCase();
    if (s.includes('biliardo')) return 'biliardo';
    if (s.includes('calciobalilla')) return 'calciobalilla';
    if (s.includes('freccette')) return 'freccette';
    return s;
}

// Caricamento dinamico installazioni con fallback offline su SQLite
function getInstSuffix() {
    const match = (LOCALE_ID || '').match(/\d+/);
    return match ? match[0] : '1';
}

async function initInstallazioni() {
    try {
        const authData = await clientCredentialsAuth();
        const res = await fetch(`${CENTRAL_SERVER_URL}/api/v1/locali/${LOCALE_ID}/giochi`, {
            headers: { 'Authorization': `Bearer ${authData.accessToken}` }
        });
        if (res.ok) {
            const giochi = await res.json();
            installazioniLocaleMap.clear();
            giochi.forEach(g => {
                const gId = normalizzaGiocoId(g.tipoGioco || g.giocoId);
                installazioniLocaleMap.set(gId, g.id);
            });
            salvaInstallazioniCache(giochi);
            console.log(`[GameEngine ${LOCALE_ID}] Installazioni caricate dal Server Centrale (${installazioniLocaleMap.size} attive)`);
            return;
        }
    } catch (err) {
        console.warn(`[GameEngine ${LOCALE_ID}] Server centrale non raggiungibile (${err.message}), caricamento da cache...`);
    }

    const cached = getInstallazioniCache();
    if (cached && cached.length > 0) {
        installazioniLocaleMap.clear();
        cached.forEach(g => {
            const gId = normalizzaGiocoId(g.giocoId || g.tipoGioco);
            installazioniLocaleMap.set(gId, g.id);
        });
        console.log(`[GameEngine ${LOCALE_ID}] Installazioni caricate da cache SQLite (${installazioniLocaleMap.size} attive)`);
    } else {
        const instSuffix = getInstSuffix();
        installazioniLocaleMap.set('calciobalilla', `calciobalilla-${instSuffix}`);
        installazioniLocaleMap.set('freccette', `freccette-${instSuffix}`);
        installazioniLocaleMap.set('biliardo', `biliardo-${instSuffix}`);
        console.log(`[GameEngine ${LOCALE_ID}] Usato fallback dinamico default per installazioni`);
    }
}

function getInstallazioni() {
    const list = [];
    installazioniLocaleMap.forEach((instId, giocoId) => {
        list.push({ id: instId, giocoId, nome: giocoId.charAt(0).toUpperCase() + giocoId.slice(1) });
    });
    return list;
}

function creaPartita(giocoId, giocatore1, giocatore2, torneoId = null) {
    const matchId = uuidv4();
    const key = normalizzaGiocoId(giocoId);
    const installazioneId = installazioniLocaleMap.get(key) || `${key}-${getInstSuffix()}`;

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
        match.turnoCorrente = 1;
        match.tiriNelTurno = 0;
        match.maxTiriPerTurno = 3;
    } else if (giocoId === 'biliardo') {
        // Palle solide (1-7) per giocatore 1, rigate (9-15) per giocatore 2
        match.palleRimanenti1 = [1, 2, 3, 4, 5, 6, 7];
        match.palleRimanenti2 = [9, 10, 11, 12, 13, 14, 15];
        match.palla8InGioco = true;
        match.turnoCorrente = 1;
        // punteggio = palle rimanenti da imbuca re (parte da 7, scende a 0)
        match.punteggio1 = 7;
        match.punteggio2 = 7;
    }

    activeMatches.set(matchId, match);
    try {
        salvaPartitaAttiva(match);
    } catch (e) {
        console.error(`[GameEngine ${LOCALE_ID}] Errore salvataggio partita attiva SQLite:`, e.message);
    }

    console.log(`[GameEngine ${LOCALE_ID}] Partita ${matchId} creata: ${giocoId} — ${giocatore1.username} vs ${giocatore2.username}`);
    return match;
}

// Applica le regole di gioco in base al tipo
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

    let resMatch = match;
    if (match.giocoId === 'calciobalilla') {
        resMatch = processaEventoCalciobalilla(match, evento);
    } else if (match.giocoId === 'freccette') {
        resMatch = processaEventoFreccette(match, evento);
    } else if (match.giocoId === 'biliardo') {
        resMatch = processaEventoBiliardo(match, evento);
    }

    if (resMatch && resMatch.stato === 'IN_CORSO') {
        try {
            salvaPartitaAttiva(resMatch);
        } catch (e) {
            console.error(`[GameEngine ${LOCALE_ID}] Errore aggiornamento partita attiva in SQLite:`, e.message);
        }
    }

    return resMatch;
}

function processaEventoCalciobalilla(match, evento) {
    if (evento.tipo !== 'GOAL') return match;

    if (evento.team === 'A') {
        match.punteggio1++;
    } else if (evento.team === 'B') {
        match.punteggio2++;
    }

    console.log(`[GameEngine] Calciobalilla ${match.id}: ${match.punteggio1} - ${match.punteggio2}`);

    if (match.punteggio1 >= match.maxPunteggio || match.punteggio2 >= match.maxPunteggio) {
        terminaPartita(match);
    }

    return match;
}

function processaEventoFreccette(match, evento) {
    if (evento.tipo !== 'TIRO') return match;

    const valore = calcolaValoreTiro(evento.settore, evento.moltiplicatore);
    const isPlayer1Turn = match.turnoCorrente === 1;

    if (isPlayer1Turn) {
        const nuovoPunteggio = match.punteggio1 - valore;
        if (nuovoPunteggio < 0) {
            console.log(`[GameEngine] Freccette ${match.id}: BUST per ${match.giocatore1.username}`);
            match.turnoCorrente = 2;
            match.tiriNelTurno = 0;
            return match;
        }
        match.punteggio1 = nuovoPunteggio;
    } else {
        const nuovoPunteggio = match.punteggio2 - valore;
        if (nuovoPunteggio < 0) {
            console.log(`[GameEngine] Freccette ${match.id}: BUST per ${match.giocatore2.username}`);
            match.turnoCorrente = 1;
            match.tiriNelTurno = 0;
            return match;
        }
        match.punteggio2 = nuovoPunteggio;
    }

    match.tiriNelTurno++;
    console.log(`[GameEngine] Freccette ${match.id}: G1=${match.punteggio1} G2=${match.punteggio2}`);

    if (match.punteggio1 === 0 || match.punteggio2 === 0) {
        terminaPartita(match);
        return match;
    }

    if (match.tiriNelTurno >= match.maxTiriPerTurno) {
        match.turnoCorrente = isPlayer1Turn ? 2 : 1;
        match.tiriNelTurno = 0;
    }

    return match;
}

// --- BILIARDO 8-BALL ---

// Identifica a quale giocatore appartiene una palla (1-7 = G1/solide, 9-15 = G2/rigate)
function identificaProprietarioPalla(palla) {
    if (palla >= 1 && palla <= 7) return 1;
    if (palla >= 9 && palla <= 15) return 2;
    return null; // palla 8 — gestione separata
}

function processaEventoBiliardo(match, evento) {
    const isPlayer1Turn = match.turnoCorrente === 1;

    if (evento.tipo === 'FALLO') {
        // Fallo: cambio turno semplice
        match.turnoCorrente = isPlayer1Turn ? 2 : 1;
        console.log(`[GameEngine] Biliardo ${match.id}: FALLO — turno passa a Giocatore ${match.turnoCorrente}`);
        return match;
    }

    if (evento.tipo !== 'IMBUCATA') return match;

    const palla = parseInt(evento.palla, 10);
    if (isNaN(palla) || palla < 1 || palla > 15) {
        console.warn(`[GameEngine] Biliardo ${match.id}: palla non valida (${evento.palla})`);
        return match;
    }

    // Gestione palla 8 (nera) — evento cruciale
    if (palla === 8) {
        if (!match.palla8InGioco) return match;
        match.palla8InGioco = false;

        const giocatoreCorrenteHaFinito = isPlayer1Turn
            ? match.palleRimanenti1.length === 0
            : match.palleRimanenti2.length === 0;

        if (giocatoreCorrenteHaFinito) {
            match.vincitore = isPlayer1Turn ? match.giocatore1.username : match.giocatore2.username;
            console.log(`[GameEngine] Biliardo ${match.id}: Giocatore ${match.turnoCorrente} (${match.vincitore}) imbuca la palla 8 → VITTORIA`);
        } else {
            match.vincitore = isPlayer1Turn ? match.giocatore2.username : match.giocatore1.username;
            console.log(`[GameEngine] Biliardo ${match.id}: Giocatore ${match.turnoCorrente} imbuca la palla 8 in anticipo → SCONFITTA (Vince ${match.vincitore})`);
        }
        terminaPartita(match);
        return match;
    }

    // Gestione palla normale (1-7 solide, 9-15 rigate)
    const proprietario = identificaProprietarioPalla(palla);

    if (proprietario === 1) {
        const idx = match.palleRimanenti1.indexOf(palla);
        if (idx !== -1) {
            match.palleRimanenti1.splice(idx, 1);
            match.punteggio1 = match.palleRimanenti1.length;
        }
    } else if (proprietario === 2) {
        const idx = match.palleRimanenti2.indexOf(palla);
        if (idx !== -1) {
            match.palleRimanenti2.splice(idx, 1);
            match.punteggio2 = match.palleRimanenti2.length;
        }
    }

    console.log(`[GameEngine] Biliardo ${match.id}: Palla ${palla} imbucata (G1: ${match.punteggio1} rimanenti, G2: ${match.punteggio2} rimanenti)`);

    // Il turno continua solo se si imbuca una palla propria; altrimenti si cambia
    if (proprietario !== match.turnoCorrente) {
        match.turnoCorrente = isPlayer1Turn ? 2 : 1;
        console.log(`[GameEngine] Biliardo ${match.id}: Palla avversaria — turno passa a Giocatore ${match.turnoCorrente}`);
    }

    return match;
}

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

// Conclude la partita, calcola il vincitore e la sposta nel buffer definitivo SQLite
function terminaPartita(match) {
    match.stato = 'TERMINATA';
    match.dataFine = new Date().toISOString();

    if (match.giocoId === 'calciobalilla') {
        match.vincitore = match.punteggio1 > match.punteggio2 ? match.giocatore1.username : match.giocatore2.username;
    } else if (match.giocoId === 'freccette') {
        match.vincitore = match.punteggio1 === 0 ? match.giocatore1.username : match.giocatore2.username;
    } else if (match.giocoId === 'biliardo') {
        if (!match.vincitore) {
            match.vincitore = match.palleRimanenti1.length <= match.palleRimanenti2.length
                ? match.giocatore1.username
                : match.giocatore2.username;
        }
    }

    console.log(`[GameEngine ${LOCALE_ID}] Partita ${match.id} TERMINATA — Vincitore: ${match.vincitore}`);

    let punteggio1Finale, punteggio2Finale;
    if (match.giocoId === 'calciobalilla') {
        punteggio1Finale = match.punteggio1;
        punteggio2Finale = match.punteggio2;
    } else if (match.giocoId === 'freccette') {
        punteggio1Finale = 301 - match.punteggio1;
        punteggio2Finale = 301 - match.punteggio2;
    } else if (match.giocoId === 'biliardo') {
        // Punteggio finale = palle imbucate (7 - rimanenti)
        punteggio1Finale = 7 - match.palleRimanenti1.length;
        punteggio2Finale = 7 - match.palleRimanenti2.length;
    } else {
        punteggio1Finale = match.punteggio1;
        punteggio2Finale = match.punteggio2;
    }

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

    try {
        rimuoviPartitaAttiva(match.id);
    } catch (e) {
        console.error(`[GameEngine ${LOCALE_ID}] Errore rimozione partita attiva in SQLite:`, e.message);
    }

    return match;
}

// Invia l'evento sul broker MQTT sul topic specifico del gioco (locale/{ID}/{giocoId}/{tipoEvento})
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

    // Pubblica sul topic specifico: locale/{ID}/{giocoId}/{tipoEvento}
    return publishEvent(mqttPayload, match.giocoId, evento.tipo);
}

function getMatch(matchId) {
    return activeMatches.get(matchId) || null;
}

function getActiveMatches() {
    return Array.from(activeMatches.values()).filter(m => m.stato === 'IN_CORSO');
}

function removeMatch(matchId) {
    activeMatches.delete(matchId);
    try {
        rimuoviPartitaAttiva(matchId);
    } catch (e) { }
}

// Ripristina le partite in corso all'avvio dell'Edge dopo una ripartenza
function caricaPartiteAttiveDaDb() {
    try {
        const matches = getPartiteAttiveSalvate();
        for (const m of matches) {
            if (m && m.id && m.stato === 'IN_CORSO') {
                activeMatches.set(m.id, m);
            }
        }
        if (activeMatches.size > 0) {
            console.log(`[GameEngine ${LOCALE_ID}] Ripristinate ${activeMatches.size} partite attive da SQLite`);
        }
    } catch (err) {
        console.error(`[GameEngine ${LOCALE_ID}] Errore ripristino partite attive da SQLite:`, err.message);
    }
}

// Pulizia periodica per partite rimaste inattive per oltre 2 ore
function avviaTimeoutPartiteAbbandonate() {
    setInterval(() => {
        const now = Date.now();
        const MAX_INACTIVE_MS = 2 * 60 * 60 * 1000;

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

avviaTimeoutPartiteAbbandonate();

// Gestione messaggi ricevuti dai sensori fisici via broker Mosquitto
// Il payload è arricchito con giocoId e tipoEvento estratti dal topic strutturato
getMqttEvents().on('evento', ({ topic, payload, giocoId, tipoEvento }) => {
    try {
        if (payload && payload.matchId && payload.tipo) {
            console.log(`[GameEngine ${LOCALE_ID}] Elaborazione evento MQTT reale: topic=${topic} match=${payload.matchId}`);
            processaEvento(payload.matchId, payload);
        }
    } catch (err) {
        console.error(`[GameEngine ${LOCALE_ID}] Errore elaborazione evento MQTT:`, err.message);
    }
});

module.exports = {
    initInstallazioni,
    getInstallazioni,
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
