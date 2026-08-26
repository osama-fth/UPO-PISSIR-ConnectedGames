// Entry point dell'Edge Node Gateway (Express, OIDC Keycloak, MQTT, SQLite e Sync).

const express = require('express');
const session = require('express-session');
const path = require('path');

const { initOidcClient } = require('./services/oidc-client');
const { connectMqtt, getMqttStatus } = require('./services/mqtt-client');
const { initDatabase } = require('./services/sqlite-db');
const { avviaCronSync, checkCloudStatus, getCloudStatus } = require('./services/sync-service');
const { caricaPartiteAttiveDaDb, initInstallazioni } = require('./services/game-engine');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const gameRoutes = require('./routes/game');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3001;
const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    name: `edge.${LOCALE_ID.toLowerCase()}.sid`,
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 3600000,
        httpOnly: true
    }
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.localeId = LOCALE_ID;
    res.locals.mqttStatus = getMqttStatus();
    res.locals.cloudStatus = getCloudStatus();
    next();
});

// Endpoint per verificare lo stato di salute del container
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        localeId: LOCALE_ID,
        mqtt: getMqttStatus(),
        timestamp: new Date().toISOString()
    });
});

app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/sync', syncRoutes);
app.use('/', dashboardRoutes);

app.use((err, req, res, _next) => {
    console.error(`[Edge ${LOCALE_ID}] Errore:`, err.message);
    res.status(500).render('error', {
        title: 'Errore',
        message: err.message || 'Errore interno del server'
    });
});

// Inizializza SQLite, OIDC Keycloak, la connessione MQTT ed avvia il cron sync
async function start() {
    console.log(`[Edge ${LOCALE_ID}] Avvio in corso...`);

    try {
        initDatabase();
        console.log(`[Edge ${LOCALE_ID}] Database SQLite inizializzato`);
        caricaPartiteAttiveDaDb();
        await initInstallazioni();
    } catch (err) {
        console.error(`[Edge ${LOCALE_ID}] Errore inizializzazione SQLite / installazioni:`, err.message);
    }

    try {
        await initOidcClient();
        console.log(`[Edge ${LOCALE_ID}] Client OIDC inizializzato`);
    } catch (err) {
        console.warn(`[Edge ${LOCALE_ID}] OIDC non disponibile: ${err.message}`);
        console.warn(`[Edge ${LOCALE_ID}] L'autenticazione Keycloak sarà tentata al primo login`);
    }

    try {
        connectMqtt();
        console.log(`[Edge ${LOCALE_ID}] Connessione MQTT avviata`);
    } catch (err) {
        console.warn(`[Edge ${LOCALE_ID}] MQTT non disponibile: ${err.message}`);
    }

    avviaCronSync();
    console.log(`[Edge ${LOCALE_ID}] Cron-job sincronizzazione avviato`);

    // Check iniziale e periodico dello stato del cloud centrale
    checkCloudStatus();
    setInterval(() => checkCloudStatus(), 30000);

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Edge ${LOCALE_ID}] Server avviato su http://0.0.0.0:${PORT}`);
        console.log(`[Edge ${LOCALE_ID}] Dashboard: http://localhost:${PORT}`);
    });
}

start().catch(err => {
    console.error(`[Edge ${LOCALE_ID}] Errore fatale all'avvio:`, err);
    process.exit(1);
});
