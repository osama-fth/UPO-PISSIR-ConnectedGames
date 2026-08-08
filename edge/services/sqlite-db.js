// ============================================================
// services/sqlite-db.js — Database SQLite Locale (Buffer Offline)
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Gestisce il database SQLite locale usato come buffer offline
// per le partite giocate sull'Edge. Le partite vengono salvate
// qui e successivamente sincronizzate con il Server Centrale.
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';
const DB_PATH = path.join(__dirname, '..', 'data', 'edge.sqlite3');

let db = null;

/**
 * Inizializza il database SQLite e crea le tabelle necessarie.
 * Chiamato una volta all'avvio del server Edge.
 */
function initDatabase() {
    db = new Database(DB_PATH);

    // Abilita WAL mode per migliori performance in lettura/scrittura concorrente
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Tabella partite_attive: persistenza in-memory per resilienza a riavvii container (Fix C1)
    db.exec(`
        CREATE TABLE IF NOT EXISTS partite_attive (
            id TEXT PRIMARY KEY,
            state_json TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    // Tabella partite_buffer: buffer locale prima della sincronizzazione
    db.exec(`
        CREATE TABLE IF NOT EXISTS partite_buffer (
            id TEXT PRIMARY KEY,
            installazione_id TEXT NOT NULL,
            locale_id TEXT NOT NULL,
            gioco_id TEXT NOT NULL,
            giocatore_1_id TEXT,
            giocatore_1_username TEXT,
            giocatore_2_id TEXT,
            giocatore_2_username TEXT,
            punteggio_1 INTEGER NOT NULL DEFAULT 0,
            punteggio_2 INTEGER NOT NULL DEFAULT 0,
            data_inizio TEXT NOT NULL,
            data_fine TEXT NOT NULL,
            torneo_id TEXT,
            sincronizzata INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    // Indice per query di sincronizzazione
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_partite_sync 
        ON partite_buffer(sincronizzata) WHERE sincronizzata = 0
    `);

    console.log(`[SQLite ${LOCALE_ID}] Database inizializzato: ${DB_PATH}`);
    return db;
}

/**
 * Salva o aggiorna lo stato di una partita attiva nel DB SQLite (Fix C1).
 */
function salvaPartitaAttiva(match) {
    const stmt = db.prepare(`
        INSERT INTO partite_attive (id, state_json, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = datetime('now')
    `);
    stmt.run(match.id, JSON.stringify(match));
}

/**
 * Rimuove una partita attiva terminata dal DB SQLite (Fix C1).
 */
function rimuoviPartitaAttiva(matchId) {
    const stmt = db.prepare(`DELETE FROM partite_attive WHERE id = ?`);
    stmt.run(matchId);
}

/**
 * Recupera tutte le partite attive salvate nel DB SQLite (Fix C1).
 */
function getPartiteAttiveSalvate() {
    const stmt = db.prepare(`SELECT state_json FROM partite_attive`);
    const rows = stmt.all();
    return rows.map(r => JSON.parse(r.state_json));
}

/**
 * Salva una partita completata nel buffer locale.
 * @param {Object} partita - Dati della partita
 * @returns {Object} La partita salvata
 */
function salvaPartita(partita) {
    const stmt = db.prepare(`
        INSERT INTO partite_buffer 
            (id, installazione_id, locale_id, gioco_id, 
             giocatore_1_id, giocatore_1_username, giocatore_2_id, giocatore_2_username, 
             punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        partita.id,
        partita.installazioneId,
        partita.localeId,
        partita.giocoId,
        partita.giocatore1Id || null,
        partita.giocatore1Username || null,
        partita.giocatore2Id || null,
        partita.giocatore2Username || null,
        partita.punteggio1,
        partita.punteggio2,
        partita.dataInizio,
        partita.dataFine,
        partita.torneoId || null
    );

    console.log(`[SQLite ${LOCALE_ID}] Partita ${partita.id} salvata nel buffer`);
    return partita;
}

/**
 * Recupera tutte le partite non ancora sincronizzate.
 * @returns {Array} Lista di partite da sincronizzare
 */
function getPartiteNonSincronizzate() {
    const stmt = db.prepare(`
        SELECT * FROM partite_buffer WHERE sincronizzata = 0 ORDER BY created_at ASC
    `);
    return stmt.all();
}

/**
 * Segna le partite come sincronizzate dopo conferma dal Server Centrale.
 * @param {Array<string>} ids - Lista di UUID delle partite sincronizzate
 * @returns {number} Numero di partite aggiornate
 */
function segnaComeSincronizzate(ids) {
    if (!ids || ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
        UPDATE partite_buffer SET sincronizzata = 1 WHERE id IN (${placeholders})
    `);

    const result = stmt.run(...ids);
    console.log(`[SQLite ${LOCALE_ID}] ${result.changes} partite segnate come sincronizzate`);
    return result.changes;
}

/**
 * Statistiche locali: conteggi e aggregazioni dal buffer SQLite.
 * @returns {Object} Statistiche aggregate
 */
function getStatsLocale() {
    const totale = db.prepare(`SELECT COUNT(*) as count FROM partite_buffer`).get();
    const nonSync = db.prepare(`SELECT COUNT(*) as count FROM partite_buffer WHERE sincronizzata = 0`).get();
    const sincronizzate = db.prepare(`SELECT COUNT(*) as count FROM partite_buffer WHERE sincronizzata = 1`).get();

    const perGioco = db.prepare(`
        SELECT gioco_id, COUNT(*) as count, 
               AVG(punteggio_1) as avg_p1, AVG(punteggio_2) as avg_p2
        FROM partite_buffer GROUP BY gioco_id
    `).all();

    const ultime = db.prepare(`
        SELECT * FROM partite_buffer ORDER BY data_fine DESC LIMIT 10
    `).all();

    return {
        totalePartite: totale.count,
        inAttesaDiSync: nonSync.count,
        sincronizzate: sincronizzate.count,
        perGioco,
        ultimePartite: ultime
    };
}

/**
 * Statistiche per un giocatore specifico.
 * @param {string} giocatoreId - UUID del giocatore
 * @returns {Object} Statistiche del giocatore
 */
function getStatsGiocatore(giocatoreId) {
    const partite = db.prepare(`
        SELECT * FROM partite_buffer 
        WHERE giocatore_1_id = ? OR giocatore_2_id = ?
        ORDER BY data_fine DESC
    `).all(giocatoreId, giocatoreId);

    let vittorie = 0;
    let sconfitte = 0;

    for (const p of partite) {
        const isPlayer1 = p.giocatore_1_id === giocatoreId;
        if (isPlayer1) {
            if (p.punteggio_1 > p.punteggio_2) vittorie++;
            else sconfitte++;
        } else {
            if (p.punteggio_2 > p.punteggio_1) vittorie++;
            else sconfitte++;
        }
    }

    return {
        totalePartite: partite.length,
        vittorie,
        sconfitte,
        percentualeVittorie: partite.length > 0 ? Math.round((vittorie / partite.length) * 100) : 0,
        ultimePartite: partite.slice(0, 5)
    };
}

/**
 * Restituisce l'istanza del database (per uso avanzato).
 */
function getDb() {
    return db;
}

module.exports = {
    initDatabase,
    salvaPartita,
    salvaPartitaAttiva,
    rimuoviPartitaAttiva,
    getPartiteAttiveSalvate,
    getPartiteNonSincronizzate,
    segnaComeSincronizzate,
    getStatsLocale,
    getStatsGiocatore,
    getDb
};
