// Test di Integrazione e Raggiungibilità per il servizio Edge
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const PORT = process.env.PORT || 3001;
const CENTRAL_SERVER_URL = process.env.CENTRAL_SERVER_URL || 'http://service-gateway:8081';
const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080/realms/pissir-realm';

function richiestaHttp(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: 3000 }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
    });
}

test('Test 1: Verifica stato di salute locale Edge (/health)', async () => {
    const res = await richiestaHttp(`http://127.0.0.1:${PORT}/health`);
    assert.equal(res.status, 200, 'L\'endpoint /health deve rispondere 200 OK');
    const json = JSON.parse(res.body);
    assert.equal(json.status, 'UP', 'Lo stato del servizio deve essere UP');
});

test('Test 2: Verifica funzionamento DB SQLite locale', () => {
    const { initDatabase } = require('../services/sqlite-db');
    const db = initDatabase();
    assert.ok(db, 'Il DB SQLite deve essere inizializzato');
    const risultato = db.prepare('SELECT 1 AS ok').get();
    assert.equal(risultato.ok, 1, 'La query sul DB locale deve restituire 1');
});

test('Test 3: Verifica raggiungibilità del Gateway Centrale', async () => {
    const res = await richiestaHttp(`${CENTRAL_SERVER_URL}/actuator/health`);
    assert.ok(res.status === 200 || res.status === 401, 'Il Gateway Centrale deve essere raggiungibile');
});

test('Test 4: Verifica raggiungibilità del servizio Keycloak', async () => {
    const res = await richiestaHttp(KEYCLOAK_INTERNAL_URL);
    assert.equal(res.status, 200, 'Keycloak deve essere raggiungibile e rispondere 200 OK');
});
