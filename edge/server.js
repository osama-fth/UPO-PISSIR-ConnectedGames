// ============================================================
// server.js — Edge Gateway (Node.js / Express)
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Punto di ingresso dell'Edge Node. Gestisce:
// - Autenticazione OIDC (Keycloak Authorization Code Flow)
// - Guest Mode (fallback offline)
// - Connessione MQTT al broker Mosquitto locale
// - Database SQLite locale (buffer offline)
// - Logica giochi (Calciobalilla + Freccette)
// - Sincronizzazione partite verso il Server Centrale
// - Interfaccia web per giocatori e admin locale
// ============================================================

const express = require('express');
const session = require('express-session');
const path = require('path');

const { initOidcClient } = require('./services/oidc-client');
const { connectMqtt, getMqttStatus } = require('./services/mqtt-client');
const { initDatabase } = require('./services/sqlite-db');
const { avviaCronSync } = require('./services/sync-service');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const gameRoutes = require('./routes/game');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3001;
const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

// ============================================================
// VIEW ENGINE (EJS)
// ============================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Sessione in-memory (sufficiente per un prototipo single-instance)
app.use(session({
    name: `edge.${LOCALE_ID.toLowerCase()}.sid`,
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // HTTP in sviluppo (no HTTPS)
        maxAge: 3600000, // 1 ora, allineato con la scadenza JWT Keycloak
        httpOnly: true
    }
}));

// Rende disponibili variabili globali a tutte le views EJS
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.localeId = LOCALE_ID;
    res.locals.mqttStatus = getMqttStatus();
    next();
});

// ============================================================
// HEALTH CHECK (per Docker healthcheck)
// ============================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        localeId: LOCALE_ID,
        mqtt: getMqttStatus(),
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// ROUTES
// ============================================================
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/sync', syncRoutes);
app.use('/', dashboardRoutes);

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, _next) => {
    console.error(`[Edge ${LOCALE_ID}] Errore:`, err.message);
    res.status(500).render('error', {
        title: 'Errore',
        message: err.message || 'Errore interno del server'
    });
});

// ============================================================
// AVVIO
// ============================================================
async function start() {
    console.log(`[Edge ${LOCALE_ID}] Avvio in corso...`);

    // 1. Inizializza il database SQLite locale
    try {
        initDatabase();
        console.log(`[Edge ${LOCALE_ID}] Database SQLite inizializzato`);
    } catch (err) {
        console.error(`[Edge ${LOCALE_ID}] Errore inizializzazione SQLite:`, err.message);
        process.exit(1); // Critico: senza DB non possiamo salvare partite
    }

    // 2. Inizializza il client OIDC (Keycloak)
    try {
        await initOidcClient();
        console.log(`[Edge ${LOCALE_ID}] Client OIDC inizializzato`);
    } catch (err) {
        console.warn(`[Edge ${LOCALE_ID}] OIDC non disponibile: ${err.message}`);
        console.warn(`[Edge ${LOCALE_ID}] L'autenticazione Keycloak sarà tentata al primo login`);
    }

    // 3. Connetti al broker MQTT
    try {
        connectMqtt();
        console.log(`[Edge ${LOCALE_ID}] Connessione MQTT avviata`);
    } catch (err) {
        console.warn(`[Edge ${LOCALE_ID}] MQTT non disponibile: ${err.message}`);
    }

    // 4. Avvia il cron-job di sincronizzazione (ogni 5 minuti)
    avviaCronSync();
    console.log(`[Edge ${LOCALE_ID}] Cron-job sincronizzazione avviato`);

    // 5. Avvia il server HTTP
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Edge ${LOCALE_ID}] Server avviato su http://0.0.0.0:${PORT}`);
        console.log(`[Edge ${LOCALE_ID}] Dashboard: http://localhost:${PORT}`);
    });
}

start().catch(err => {
    console.error(`[Edge ${LOCALE_ID}] Errore fatale all'avvio:`, err);
    process.exit(1);
});
