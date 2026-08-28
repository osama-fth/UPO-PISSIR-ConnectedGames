// Inizializzazione e gestione del database SQLite locale per la persistenza offline di partite e stati in corso.

const Database = require('better-sqlite3');
const path = require('path');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';
const DB_PATH = path.join(__dirname, '..', 'data', 'edge.sqlite3');

let db = null;

// Inizializza le tabelle SQLite (partite_attive e partite_buffer) abilitando la modalità WAL
function initDatabase() {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS partite_attive (
            id TEXT PRIMARY KEY,
            state_json TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

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

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_partite_sync 
        ON partite_buffer(sincronizzata) WHERE sincronizzata = 0
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS installazioni_cache (
            id TEXT PRIMARY KEY,
            gioco_id TEXT NOT NULL,
            nome TEXT NOT NULL,
            stato TEXT NOT NULL DEFAULT 'ATTIVO'
        )
    `);

    console.log(`[SQLite ${LOCALE_ID}] Database inizializzato: ${DB_PATH}`);
    return db;
}

function salvaPartitaAttiva(match) {
    if (!db) return;
    const stmt = db.prepare(`
        INSERT INTO partite_attive (id, state_json, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = datetime('now')
    `);
    stmt.run(match.id, JSON.stringify(match));
}

function rimuoviPartitaAttiva(matchId) {
    if (!db) return;
    const stmt = db.prepare(`DELETE FROM partite_attive WHERE id = ?`);
    stmt.run(matchId);
}

function getPartiteAttiveSalvate() {
    if (!db) return [];
    const stmt = db.prepare(`SELECT state_json FROM partite_attive`);
    const rows = stmt.all();
    return rows.map(r => JSON.parse(r.state_json));
}

// Inserisce una partita terminata nel buffer offline SQLite
function salvaPartita(partita) {
    if (!db) return partita;
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

function getPartiteNonSincronizzate() {
    if (!db) return [];
    const stmt = db.prepare(`
        SELECT * FROM partite_buffer WHERE sincronizzata = 0 ORDER BY created_at ASC
    `);
    return stmt.all();
}

function segnaComeSincronizzate(ids) {
    if (!db || !ids || ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
        UPDATE partite_buffer SET sincronizzata = 1 WHERE id IN (${placeholders})
    `);

    const result = stmt.run(...ids);
    console.log(`[SQLite ${LOCALE_ID}] ${result.changes} partite segnate come sincronizzate`);
    return result.changes;
}

function getStatsLocale() {
    if (!db) {
        return { totalePartite: 0, inAttesaDiSync: 0, sincronizzate: 0, perGioco: [], ultimePartite: [] };
    }
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

function salvaInstallazioniCache(list) {
    if (!db || !list) return;
    try {
        const attuali = db.prepare(`SELECT id, gioco_id, stato FROM installazioni_cache`).all();
        const statiMap = new Map();
        attuali.forEach(r => {
            if (r.id) statiMap.set(r.id, r.stato);
            if (r.gioco_id) statiMap.set(r.gioco_id, r.stato);
        });

        const deleteStmt = db.prepare(`DELETE FROM installazioni_cache`);
        deleteStmt.run();

        const insertStmt = db.prepare(`
            INSERT INTO installazioni_cache (id, gioco_id, nome, stato) VALUES (?, ?, ?, ?)
        `);
        const transaction = db.transaction((items) => {
            for (const item of items) {
                const id = item.id;
                const giocoId = item.giocoId || item.tipoGioco.toLowerCase();
                const nome = item.nome || item.tipoGioco;
                const stato = item.stato || statiMap.get(id) || statiMap.get(giocoId) || 'ATTIVO';
                insertStmt.run(id, giocoId, nome, stato);
            }
        });
        transaction(list);
        console.log(`[SQLite ${LOCALE_ID}] Cache installazioni aggiornata (${list.length} giochi)`);
    } catch (err) {
        console.error(`[SQLite ${LOCALE_ID}] Errore salvataggio installazioni cache:`, err.message);
    }
}

function getInstallazioniCache() {
    if (!db) return [];
    try {
        const stmt = db.prepare(`SELECT id, gioco_id as giocoId, nome, stato FROM installazioni_cache`);
        return stmt.all();
    } catch {
        return [];
    }
}

function getStatoGioco(giocoId) {
    if (!db || !giocoId) return 'ATTIVO';
    try {
        const row = db.prepare(`SELECT stato FROM installazioni_cache WHERE id = ? OR gioco_id = ?`).get(giocoId, giocoId);
        return row ? row.stato : 'ATTIVO';
    } catch {
        return 'ATTIVO';
    }
}

function setStatoGioco(giocoId, nuovoStato) {
    if (!db || !giocoId) return false;
    const statoNorm = (nuovoStato === 'DISATTIVATO') ? 'DISATTIVATO' : 'ATTIVO';
    try {
        const count = db.prepare(`SELECT COUNT(*) as cnt FROM installazioni_cache WHERE id = ? OR gioco_id = ?`).get(giocoId, giocoId).cnt;
        if (count > 0) {
            db.prepare(`UPDATE installazioni_cache SET stato = ? WHERE id = ? OR gioco_id = ?`).run(statoNorm, giocoId, giocoId);
        } else {
            db.prepare(`INSERT INTO installazioni_cache (id, gioco_id, nome, stato) VALUES (?, ?, ?, ?)`).run(giocoId, giocoId, giocoId, statoNorm);
        }
        console.log(`[SQLite ${LOCALE_ID}] Stato gioco '${giocoId}' aggiornato a '${statoNorm}'`);
        return true;
    } catch (err) {
        console.error(`[SQLite ${LOCALE_ID}] Errore aggiornamento stato gioco:`, err.message);
        return false;
    }
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
    salvaInstallazioniCache,
    getInstallazioniCache,
    getStatoGioco,
    setStatoGioco
};
