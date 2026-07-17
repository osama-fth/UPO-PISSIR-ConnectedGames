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
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

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
    name: 'platform.sid',
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
    next();
});

// ============================================================
// HEALTH CHECK (per Docker healthcheck)
// ============================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// ROUTES
// ============================================================
app.use('/auth', authRoutes);
app.use('/', dashboardRoutes);

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, _next) => {
    console.error(`[Platform Dashboard] Errore:`, err.message);
    res.status(500).render('error', {
        title: 'Errore',
        message: err.message || 'Errore interno del server'
    });
});

// ============================================================
// AVVIO
// ============================================================
async function start() {
    console.log(`[Platform Dashboard] Avvio in corso...`);

    // Inizializza il client OIDC (Keycloak)
    try {
        await initOidcClient();
        console.log(`[Platform Dashboard] Client OIDC inizializzato`);
    } catch (err) {
        console.warn(`[Platform Dashboard] OIDC non disponibile: ${err.message}`);
        console.warn(`[Platform Dashboard] L'autenticazione Keycloak sarà tentata al primo login`);
    }

    // Avvia il server HTTP
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Platform Dashboard] Server avviato su http://0.0.0.0:${PORT}`);
    });
}

start().catch(err => {
    console.error(`[Platform Dashboard] Errore fatale all'avvio:`, err);
    process.exit(1);
});
