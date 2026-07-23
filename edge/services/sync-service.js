// ============================================================
// services/sync-service.js — Sincronizzazione Edge → Cloud
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Gestisce la sincronizzazione delle partite dal buffer SQLite
// locale verso il Server Centrale (Spring Boot) via REST.
// Implementa:
//   - Semaforo in-memory anti race-condition
//   - Cron-job automatico ogni 2 minuti
//   - Trigger manuale via API
// ============================================================

const { getPartiteNonSincronizzate, segnaComeSincronizzate } = require('./sqlite-db');
const { directPasswordAuth } = require('./oidc-client');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';
const CENTRAL_SERVER_URL = process.env.CENTRAL_SERVER_URL || 'http://service-gateway:8081';
const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minuti

// Semaforo booleano in-memory per evitare sync simultanee
let isSyncing = false;
let lastSyncTime = null;
let lastSyncResult = null;
let cronTimer = null;

/**
 * Esegue la sincronizzazione delle partite verso il Server Centrale.
 * Acquisisce il semaforo, invia un bulk POST, processa la risposta.
 * 
 * @param {string|null} accessToken - JWT access token per autenticare la richiesta
 * @returns {Object} Risultato della sincronizzazione
 */
async function sincronizzaAdesso(accessToken) {
    // Controlla il semaforo
    if (isSyncing) {
        console.log(`[Sync ${LOCALE_ID}] Sincronizzazione già in corso, richiesta posticipata`);
        return {
            success: false,
            error: 'Sincronizzazione già in corso. Riprova tra qualche secondo.',
            inProgress: true
        };
    }

    // Acquisisce il semaforo
    isSyncing = true;
    console.log(`[Sync ${LOCALE_ID}] Semaforo acquisito — inizio sincronizzazione`);

    try {
        // 1. Leggi partite non sincronizzate dal buffer SQLite
        const partiteDaSyncronizzare = getPartiteNonSincronizzate();

        if (partiteDaSyncronizzare.length === 0) {
            console.log(`[Sync ${LOCALE_ID}] Nessuna partita da sincronizzare`);
            lastSyncTime = new Date().toISOString();
            lastSyncResult = { salvate: 0, fallite: 0, message: 'Nessuna partita in coda' };
            return { success: true, salvate: 0, fallite: 0, message: 'Nessuna partita in coda' };
        }

        console.log(`[Sync ${LOCALE_ID}] ${partiteDaSyncronizzare.length} partite da sincronizzare`);

        // 2. Formatta i dati per l'API bulk del Server Centrale
        const payload = partiteDaSyncronizzare.map(p => ({
            id: p.id,
            installazioneId: p.installazione_id,
            localeId: p.locale_id,
            giocatore1Id: p.giocatore_1_id || null,
            giocatore1Username: p.giocatore_1_username || null,
            giocatore2Id: p.giocatore_2_id || null,
            giocatore2Username: p.giocatore_2_username || null,
            punteggio1: p.punteggio_1,
            punteggio2: p.punteggio_2,
            dataInizio: p.data_inizio,
            dataFine: p.data_fine,
            torneoId: p.torneo_id || null
        }));

        // 3. POST bulk verso il Server Centrale
        const url = `${CENTRAL_SERVER_URL}/api/v1/locali/${LOCALE_ID}/partite/sincronizza`;
        console.log(`[Sync ${LOCALE_ID}] POST ${url} — ${payload.length} partite`);

        const headers = {
            'Content-Type': 'application/json'
        };

        let tokenToUse = accessToken;

        // Se chiamato dal cron (accessToken null), otteniamo un token per il sync service
        if (!tokenToUse) {
            console.log(`[Sync ${LOCALE_ID}] Richiesta token per edge_sync_service...`);
            try {
                const serviceUser = await directPasswordAuth('edge_sync_service', 'syncpassword');
                tokenToUse = serviceUser.accessToken;
            } catch (authErr) {
                console.error(`[Sync ${LOCALE_ID}] Fallita autenticazione service user:`, authErr.message);
                throw new Error('Impossibile ottenere token per la sincronizzazione');
            }
        }

        // Aggiungi il token JWT
        if (tokenToUse) {
            headers['Authorization'] = `Bearer ${tokenToUse}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000) // Timeout 30 secondi
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server ha risposto con ${response.status}: ${errText}`);
        }

        // 4. Processa la risposta: { salvate: [...uuids], fallite: [...] }
        const result = await response.json();
        const salvateIds = result.salvate || [];
        const fallite = result.fallite || [];

        console.log(`[Sync ${LOCALE_ID}] Risultato: ${salvateIds.length} salvate, ${fallite.length} fallite`);

        // 5. Segna come sincronizzate gli ID confermati dal server
        if (salvateIds.length > 0) {
            segnaComeSincronizzate(salvateIds);
        }

        // Logga le partite fallite
        if (fallite.length > 0) {
            fallite.forEach(f => {
                console.warn(`[Sync ${LOCALE_ID}] Partita ${f.id} fallita: ${f.errore}`);
            });
        }

        lastSyncTime = new Date().toISOString();
        lastSyncResult = {
            salvate: salvateIds.length,
            fallite: fallite.length,
            dettagliFallite: fallite
        };

        return {
            success: true,
            salvate: salvateIds.length,
            fallite: fallite.length,
            dettagliFallite: fallite
        };

    } catch (err) {
        console.error(`[Sync ${LOCALE_ID}] Errore sincronizzazione:`, err.message);
        lastSyncTime = new Date().toISOString();
        lastSyncResult = { error: err.message };

        return {
            success: false,
            error: err.message
        };
    } finally {
        // Rilascia SEMPRE il semaforo
        isSyncing = false;
        console.log(`[Sync ${LOCALE_ID}] Semaforo rilasciato`);
    }
}

/**
 * Avvia il cron-job automatico di sincronizzazione.
 * Esegue ogni 5 minuti. Non usa un access token (le richieste
 * dal cron passano via rete Docker interna; in produzione
 * servirebbero credenziali service-to-service).
 */
function avviaCronSync() {
    if (cronTimer) {
        console.warn(`[Sync ${LOCALE_ID}] Cron-job già attivo, skip`);
        return;
    }

    console.log(`[Sync ${LOCALE_ID}] Cron-job avviato: sincronizzazione ogni ${SYNC_INTERVAL_MS / 1000}s`);

    cronTimer = setInterval(async () => {
        console.log(`[Sync ${LOCALE_ID}] Cron-job: esecuzione automatica`);
        try {
            await sincronizzaAdesso(null);
        } catch (err) {
            console.error(`[Sync ${LOCALE_ID}] Cron-job errore:`, err.message);
        }
    }, SYNC_INTERVAL_MS);

    // Non impedisce al processo Node.js di terminare
    cronTimer.unref();
}

/**
 * Ferma il cron-job di sincronizzazione.
 */
function fermaCronSync() {
    if (cronTimer) {
        clearInterval(cronTimer);
        cronTimer = null;
        console.log(`[Sync ${LOCALE_ID}] Cron-job fermato`);
    }
}

/**
 * Restituisce lo stato corrente della sincronizzazione.
 */
function getSyncStatus() {
    return {
        isSyncing,
        lastSyncTime,
        lastSyncResult,
        cronAttivo: !!cronTimer,
        intervalloMinuti: SYNC_INTERVAL_MS / 60000,
        serverUrl: CENTRAL_SERVER_URL
    };
}

module.exports = {
    sincronizzaAdesso,
    avviaCronSync,
    fermaCronSync,
    getSyncStatus
};
