-- schema-database.sql
-- Schema DDL per platform_db (Database Centrale di Business)
-- Progetto Connected Games Platform - Laboratorio PISSIR (A.A. 2025/2026)

-- Abilita l'estensione UUID se non presente (utile per generare ID se necessario)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabella LOCALE
-- Censisce i luoghi fisici (pubblici o privati) in cui vengono installati i giochi.
CREATE TABLE IF NOT EXISTS locale (
    id VARCHAR(100) PRIMARY KEY, -- es. 'bar-belvedere', 'casa-mario'
    nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- es. 'PUBBLICO' (bar, sala giochi), 'PRIVATO' (abitazione)
    indirizzo VARCHAR(255) NOT NULL,
    data_creazione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Tabella UTENTE (Anagrafica di Business)
-- NOTA: Non memorizza password o dati di sicurezza (gestiti interamente da Keycloak).
-- L'ID coincide esattamente con il campo 'sub' (Subject) del token JWT generato da Keycloak.
CREATE TABLE IF NOT EXISTS utente (
    id UUID PRIMARY KEY, -- ID immutabile mappato da Keycloak
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    data_registrazione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Tabella GIOCO
-- Modella le tipologie astratte di gioco supportate dal sistema (calciobalilla, freccette).
CREATE TABLE IF NOT EXISTS gioco (
    id VARCHAR(50) PRIMARY KEY, -- es. 'calciobalilla', 'freccette'
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT NOT NULL
);

-- 4. Tabella SENSORE_GIOCO (Livello minimo di astrazione per Amministratore del Gioco)
-- Associa ad ogni tipo di gioco i relativi sensori o eventi generabili.
CREATE TABLE IF NOT EXISTS sensore_gioco (
    id VARCHAR(100) PRIMARY KEY, -- es. 'calciobalilla_porta_a', 'freccette_tabellone'
    gioco_id VARCHAR(50) REFERENCES gioco(id) ON DELETE CASCADE NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL, -- es. 'GOAL', 'TIRO', 'INIZIO', 'FINE'
    descrizione VARCHAR(255)
);

-- 5. Tabella INSTALLAZIONE_GIOCO
-- Associa un gioco specifico a un locale fisico, identificandolo in modo univoco nel locale.
CREATE TABLE IF NOT EXISTS installazione_gioco (
    id VARCHAR(100) PRIMARY KEY, -- es. 'calciobalilla-verde' (univoco nel locale)
    gioco_id VARCHAR(50) REFERENCES gioco(id) ON DELETE RESTRICT NOT NULL,
    locale_id VARCHAR(50) REFERENCES locale(id) ON DELETE CASCADE NOT NULL,
    stato_attivita VARCHAR(50) DEFAULT 'ATTIVO' NOT NULL -- es. 'ATTIVO', 'MANUTENZIONE'
);

-- 6. Tabella TORNEO
-- Gestisce le competizioni multi-locale.
CREATE TABLE IF NOT EXISTS torneo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL,
    gioco_id VARCHAR(50) REFERENCES gioco(id) ON DELETE RESTRICT NOT NULL,
    stato VARCHAR(50) DEFAULT 'ATTIVO' NOT NULL, -- es. 'ATTIVO', 'CONCLUSO' (calcolato anche lazy)
    data_inizio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fine TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 7. Tabella di associazione TORNEO_LOCALE
-- Associa quali locali partecipano a quali tornei (torneo multi-locale).
CREATE TABLE IF NOT EXISTS torneo_locale (
    torneo_id UUID REFERENCES torneo(id) ON DELETE CASCADE NOT NULL,
    locale_id VARCHAR(100) REFERENCES locale(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (torneo_id, locale_id)
);

-- 8. Tabella PARTITA
-- Contiene i risultati finali delle partite sincronizzate dagli Edge.
-- NOTA: I campi giocatore_1_id e giocatore_2_id sono NULLABLE per supportare la 'Guest Mode'
-- e preservare l'integrità referenziale se un utente dovesse disiscriversi.
CREATE TABLE IF NOT EXISTS partita (
    id UUID PRIMARY KEY, -- Generato dall'Edge a monte (meccanismo fondamentale di IDEMPOTENZA)
    installazione_id VARCHAR(100) REFERENCES installazione_gioco(id) ON DELETE RESTRICT NOT NULL,
    locale_id VARCHAR(100) REFERENCES locale(id) ON DELETE RESTRICT NOT NULL,
    giocatore_1_id UUID REFERENCES utente(id) ON DELETE SET NULL, -- NULL indica utente 'Ospite'
    giocatore_2_id UUID REFERENCES utente(id) ON DELETE SET NULL, -- NULL indica utente 'Ospite'
    punteggio_1 INTEGER NOT NULL,
    punteggio_2 INTEGER NOT NULL,
    data_inizio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fine TIMESTAMP WITH TIME ZONE NOT NULL,
    torneo_id UUID REFERENCES torneo(id) ON DELETE SET NULL, -- NULL se è una partita amichevole fuori torneo
    data_sincronizzazione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indici per ottimizzare il calcolo delle statistiche e delle classifiche dei tornei
CREATE INDEX IF NOT EXISTS idx_partita_torneo ON partita(torneo_id) WHERE torneo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partita_locale ON partita(locale_id);
CREATE INDEX IF NOT EXISTS idx_partita_giocatori ON partita(giocatore_1_id, giocatore_2_id);

-- 9. Tabella EVENTO_PARTITA (Opzionale)
-- Traccia il dettaglio degli eventi intermedi ricevuti via MQTT (es. sequenza dei gol o singoli tiri).
CREATE TABLE IF NOT EXISTS evento_partita (
    id BIGSERIAL PRIMARY KEY,
    partita_id UUID REFERENCES partita(id) ON DELETE CASCADE NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL, -- es. 'GOAL', 'TIRO'
    valore VARCHAR(50), -- es. 'T20', 'D15', 'A' (per team A)
    timestamp_evento TIMESTAMP WITH TIME ZONE NOT NULL
);
