const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LOCALE_ID = 'BAR_BELVEDERE';

const { canAdminCurrentLocale } = require('../middleware/auth');

test('canAdminCurrentLocale: admin_piattaforma ha sempre accesso ad amministrare qualsiasi locale', () => {
    const userAdminPiattaforma = {
        username: 'superadmin',
        roles: ['admin_piattaforma']
    };
    assert.equal(canAdminCurrentLocale(userAdminPiattaforma), true);
});

test('canAdminCurrentLocale: admin_locale ha accesso solo se il suo localeId corrisponde al LOCALE_ID corrente', () => {
    const userLocaleOk = {
        username: 'gestore_belvedere',
        roles: ['admin_locale'],
        localeId: 'BAR_BELVEDERE'
    };
    const userLocaleErr = {
        username: 'gestore_roma',
        roles: ['admin_locale'],
        localeId: 'SALA_GIOCHI_ROMA'
    };

    assert.equal(canAdminCurrentLocale(userLocaleOk), true);
    assert.equal(canAdminCurrentLocale(userLocaleErr), false);
});

test('canAdminCurrentLocale: utente senza ruoli o utente non autenticato -> accesso negato', () => {
    const userGiocatore = {
        username: 'player1',
        roles: ['giocatore']
    };
    assert.equal(canAdminCurrentLocale(userGiocatore), false);
    assert.equal(canAdminCurrentLocale(null), false);
});
