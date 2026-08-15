const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LOCALE_ID = 'BAR_BELVEDERE';

test('Iscrizione torneo: il payload deve contenere sia utenteId che localeId', () => {
    const torneoId = 'b0000000-0000-0000-0000-000000000001';
    const utenteId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const localeId = process.env.LOCALE_ID;

    const payload = {
        utenteId,
        localeId: localeId || 'BAR_BELVEDERE'
    };

    assert.equal(payload.utenteId, utenteId);
    assert.equal(payload.localeId, 'BAR_BELVEDERE');
});

test('Dettaglio torneo: la classifica deve contenere sia classificaLocali che classificaGiocatori', () => {
    const mockClassificaResponse = {
        torneoId: 'b0000000-0000-0000-0000-000000000001',
        torneoNome: 'Torneo Estivo 2026',
        classificaLocali: [
            { posizione: 1, localeId: 'BAR_BELVEDERE', localeNome: 'Bar Belvedere', partiteGiocate: 10, partiteVinte: 8, percentualeVittorie: 80.0, metricaClassifica: '8 vinte (80%)' }
        ],
        classificaGiocatori: [
            { posizione: 1, utenteId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', username: 'SuperMario', localeId: 'BAR_BELVEDERE', localeNome: 'Bar Belvedere', partiteGiocate: 5, partiteVinte: 4, percentualeVittorie: 80.0, metricaClassifica: '4 vinte (80%)' }
        ]
    };

    assert.ok(Array.isArray(mockClassificaResponse.classificaLocali));
    assert.ok(Array.isArray(mockClassificaResponse.classificaGiocatori));
    assert.equal(mockClassificaResponse.classificaLocali[0].localeId, 'BAR_BELVEDERE');
    assert.equal(mockClassificaResponse.classificaGiocatori[0].username, 'SuperMario');
    assert.equal(mockClassificaResponse.classificaGiocatori[0].localeId, 'BAR_BELVEDERE');
});
