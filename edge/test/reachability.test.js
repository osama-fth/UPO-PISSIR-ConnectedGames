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

test('Verifica stato di salute locale Edge (/health)', async () => {
    const res = await richiestaHttp(`http://127.0.0.1:${PORT}/health`);
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.status, 'UP');
});

test('Verifica funzionamento DB SQLite locale', () => {
    const { initDatabase } = require('../services/sqlite-db');
    const db = initDatabase();
    assert.ok(db);
    const risultato = db.prepare('SELECT 1 AS ok').get();
    assert.equal(risultato.ok, 1);
});

test('Verifica raggiungibilità del Gateway Centrale', async () => {
    const res = await richiestaHttp(`${CENTRAL_SERVER_URL}/actuator/health`);
    assert.ok(res.status === 200 || res.status === 401);
});

test('Verifica raggiungibilità del servizio Keycloak', async () => {
    const res = await richiestaHttp(KEYCLOAK_INTERNAL_URL);
    assert.equal(res.status, 200);
});
