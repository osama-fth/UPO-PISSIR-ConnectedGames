const test = require('node:test');
const assert = require('node:assert/strict');

// Set default env if missing for test isolation
process.env.LOCALE_ID = process.env.LOCALE_ID || 'BAR_BELVEDERE';

const {
    creaPartita,
    processaEvento,
    calcolaValoreTiro,
    getMatch
} = require('../services/game-engine');

test('Calcola valore tiro Freccette correttamente', () => {
    assert.equal(calcolaValoreTiro('BULL', 1), 25);
    assert.equal(calcolaValoreTiro('DBULL', 1), 50);
    assert.equal(calcolaValoreTiro('20', 3), 60); // Triplo 20
    assert.equal(calcolaValoreTiro('19', 2), 38); // Doppio 19
    assert.equal(calcolaValoreTiro('OUT', 1), 0);
});

test('Creazione partita Calciobalilla e avanzamento punteggio fino a fine partita (10 gol)', () => {
    const g1 = { id: '00000000-0000-0000-0000-000000000001', username: 'PlayerA' };
    const g2 = { id: '00000000-0000-0000-0000-000000000002', username: 'PlayerB' };

    const match = creaPartita('calciobalilla', g1, g2);
    assert.equal(match.giocoId, 'calciobalilla');
    assert.equal(match.punteggio1, 0);
    assert.equal(match.punteggio2, 0);
    assert.equal(match.stato, 'IN_CORSO');

    // Segna 9 gol per il Team A
    for (let i = 0; i < 9; i++) {
        processaEvento(match.id, { tipo: 'GOAL', team: 'A' });
    }
    assert.equal(match.punteggio1, 9);
    assert.equal(match.stato, 'IN_CORSO');

    // 10° gol per il Team A -> partita termina
    processaEvento(match.id, { tipo: 'GOAL', team: 'A' });
    assert.equal(match.punteggio1, 10);
    assert.equal(match.stato, 'TERMINATA');
    assert.ok(match.dataFine, 'La data di fine dev\'essere valorizzata');
});

test('Regole Freccette 301: cambio turno ogni 3 tiri e gestione sballo (BUST)', () => {
    const g1 = { id: '00000000-0000-0000-0000-000000000001', username: 'PlayerA' };
    const g2 = { id: '00000000-0000-0000-0000-000000000002', username: 'PlayerB' };

    const match = creaPartita('freccette', g1, g2);
    assert.equal(match.punteggio1, 301);
    assert.equal(match.punteggio2, 301);
    assert.equal(match.turnoCorrente, 1);

    // Turno 1 (Giocatore 1): 3 tiri da 60 punti (Triplo 20) -> 180 punti scalati
    processaEvento(match.id, { tipo: 'TIRO', settore: '20', moltiplicatore: 3 });
    processaEvento(match.id, { tipo: 'TIRO', settore: '20', moltiplicatore: 3 });
    processaEvento(match.id, { tipo: 'TIRO', settore: '20', moltiplicatore: 3 });

    assert.equal(match.punteggio1, 121); // 301 - 180 = 121
    assert.equal(match.turnoCorrente, 2, 'Il turno deve passare a Giocatore 2 dopo 3 tiri');

    // Manovra per portare il punteggio1 a 10 punti (imposta manualmente per il test di BUST)
    match.punteggio1 = 10;
    match.turnoCorrente = 1;

    // Giocatore 1 tira un DBULL (50 punti) quando ne servono solo 10 -> BUST!
    processaEvento(match.id, { tipo: 'TIRO', settore: 'DBULL', moltiplicatore: 1 });
    assert.equal(match.turnoCorrente, 2, 'In caso di BUST il turno passa subito all\'altro giocatore');
});

test('Biliardo 8-Ball: creazione, tracciamento palle, falli e installazioneId corretta', () => {
    const g1 = { id: '00000000-0000-0000-0000-000000000001', username: 'PlayerA' };
    const g2 = { id: '00000000-0000-0000-0000-000000000002', username: 'PlayerB' };

    const match = creaPartita('biliardo', g1, g2);
    assert.equal(match.giocoId, 'biliardo');
    assert.equal(match.installazioneId, 'biliardo-1');
    assert.equal(match.palleRimanenti1.length, 7);
    assert.equal(match.palleRimanenti2.length, 7);
    assert.equal(match.palla8InGioco, true);
    assert.equal(match.turnoCorrente, 1);

    // Imbuca palla 1 (solida, G1)
    processaEvento(match.id, { tipo: 'IMBUCATA', palla: 1 });
    assert.equal(match.palleRimanenti1.length, 6);

    // Fallo -> cambio turno a G2
    processaEvento(match.id, { tipo: 'FALLO' });
    assert.equal(match.turnoCorrente, 2);
});
