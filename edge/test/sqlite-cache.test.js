const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LOCALE_ID = 'BAR_BELVEDERE';

const {
    initDatabase,
    salvaInstallazioniCache,
    getInstallazioniCache,
    getStatsLocale,
    salvaPartita,
    segnaComeSincronizzate
} = require('../services/sqlite-db');

test('SQLite: inizializzazione, salvataggio e recupero cache installazioni', () => {
    const db = initDatabase();
    assert.ok(db, 'Il database deve essere inizializzato');

    const listaMock = [
        { id: 'calciobalilla-1', giocoId: 'calciobalilla', nome: 'Calciobalilla' },
        { id: 'freccette-1', giocoId: 'freccette', nome: 'Freccette' },
        { id: 'biliardo-1', giocoId: 'biliardo', nome: 'Biliardo 8-Ball' }
    ];

    salvaInstallazioniCache(listaMock);
    const cached = getInstallazioniCache();

    assert.equal(cached.length, 3);
    assert.equal(cached[0].id, 'calciobalilla-1');
    assert.equal(cached[2].giocoId, 'biliardo');
});

test('SQLite: salvataggio partita nel buffer, calcolo stats locale e sincronizzazione', () => {
    const uniqueId = `test-partita-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const partitaMock = {
        id: uniqueId,
        installazioneId: 'calciobalilla-1',
        localeId: 'BAR_BELVEDERE',
        giocoId: 'calciobalilla',
        giocatore1Id: '00000000-0000-0000-0000-000000000001',
        giocatore1Username: 'Player1',
        giocatore2Id: '00000000-0000-0000-0000-000000000002',
        giocatore2Username: 'Player2',
        punteggio1: 10,
        punteggio2: 5,
        dataInizio: new Date().toISOString(),
        dataFine: new Date().toISOString(),
        torneoId: null
    };

    salvaPartita(partitaMock);

    const stats = getStatsLocale();
    assert.ok(stats.totalePartite >= 1);
    assert.ok(stats.inAttesaDiSync >= 1);

    const syncCount = segnaComeSincronizzate([partitaMock.id]);
    assert.equal(syncCount, 1);

    const statsAfterSync = getStatsLocale();
    assert.ok(statsAfterSync.sincronizzate >= 1);
});
