const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LOCALE_ID = process.env.LOCALE_ID || 'BAR_BELVEDERE';

const { initDatabase, setStatoGioco, getStatoGioco } = require('../services/sqlite-db');
const { getInstallazioni, creaPartita } = require('../services/game-engine');
const { directPasswordAuth } = require('../services/oidc-client');

test('Feature Flag SQLite: gestione stato attivazione e disattivazione giochi', () => {
    initDatabase();

    // Imposta e verifica stato per un gioco
    setStatoGioco('freccette', 'DISATTIVATO');
    assert.equal(getStatoGioco('freccette'), 'DISATTIVATO');

    const installazioni = getInstallazioni();
    const instFreccette = installazioni.find(i => i.giocoId === 'freccette');
    assert.ok(instFreccette);
    assert.equal(instFreccette.stato, 'DISATTIVATO');

    // Tenta di creare partita con gioco disattivato -> deve sollevare un errore
    const g1 = { id: '00000000-0000-0000-0000-000000000001', username: 'PlayerA' };
    const g2 = { id: '00000000-0000-0000-0000-000000000002', username: 'PlayerB' };

    assert.throws(() => {
        creaPartita('freccette', g1, g2);
    }, /disattivato/i);

    // Riattiva il gioco e riprova
    setStatoGioco('freccette', 'ATTIVO');
    assert.equal(getStatoGioco('freccette'), 'ATTIVO');
    const match = creaPartita('freccette', g1, g2);
    assert.ok(match);
    assert.equal(match.giocoId, 'freccette');
});

test('OIDC Client: gestione errore Keycloak irraggiungibile', async () => {
    // Se si tenta l'autenticazione con URL non valida o Keycloak spento, deve restituire l'errore KEYCLOAK_UNREACHABLE
    await assert.rejects(
        async () => {
            await directPasswordAuth('invalid_user', 'invalid_pass');
        },
        (err) => {
            return err.message === 'KEYCLOAK_UNREACHABLE' || err.message.includes('Credenziali non valide');
        }
    );
});
