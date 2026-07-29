-- ============================================================
-- init-db.sql — Inizializzazione PostgreSQL
-- Connected Games Platform (PISSIR A.A. 2025/2026)
-- ============================================================
-- Questo script viene eseguito automaticamente da PostgreSQL
-- al primo avvio del container tramite il volume mount in
-- /docker-entrypoint-initdb.d/
-- ============================================================

-- 1. Creazione database separati per la piattaforma e Keycloak
CREATE DATABASE platform_db;
CREATE DATABASE keycloak_db;

-- 2. Connessione al database platform_db per creare schema e tabelle
\connect platform_db;

-- 3. Creazione dello schema 'platform_db' dentro il database 'platform_db'
-- Le entities JPA usano @Table(schema = "platform_db"), quindi serve
-- uno schema con questo nome all'interno del database.
CREATE SCHEMA IF NOT EXISTS platform_db;

-- 4. Abilita l'estensione UUID nello schema platform_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA platform_db;

-- ============================================================
-- TABELLE DDL (coerenti con doc/schema-database.sql)
-- ============================================================

-- Tabella LOCALE
CREATE TABLE IF NOT EXISTS platform_db.locale (
    id VARCHAR(100) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    indirizzo VARCHAR(255) NOT NULL,
    data_creazione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabella UTENTE (anagrafica di business, nessuna password)
-- L'email è nullable: gli utenti vengono auto-registrati al primo sync
-- con solo keycloak_sub (id) e username. L'email resta in Keycloak.
CREATE TABLE IF NOT EXISTS platform_db.utente (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    data_registrazione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabella GIOCO
CREATE TABLE IF NOT EXISTS platform_db.gioco (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT NOT NULL
);

-- Tabella SENSORE_GIOCO
CREATE TABLE IF NOT EXISTS platform_db.sensore_gioco (
    id VARCHAR(100) PRIMARY KEY,
    gioco_id VARCHAR(50) REFERENCES platform_db.gioco(id) ON DELETE CASCADE NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    descrizione VARCHAR(255)
);

-- Tabella INSTALLAZIONE_GIOCO
CREATE TABLE IF NOT EXISTS platform_db.installazione_gioco (
    id VARCHAR(100) PRIMARY KEY,
    gioco_id VARCHAR(50) REFERENCES platform_db.gioco(id) ON DELETE RESTRICT NOT NULL,
    locale_id VARCHAR(100) REFERENCES platform_db.locale(id) ON DELETE CASCADE NOT NULL,
    stato_attivita VARCHAR(50) DEFAULT 'ATTIVO' NOT NULL
);

-- Tabella TORNEO
CREATE TABLE IF NOT EXISTS platform_db.torneo (
    id UUID PRIMARY KEY DEFAULT platform_db.uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL,
    gioco_id VARCHAR(50) REFERENCES platform_db.gioco(id) ON DELETE RESTRICT NOT NULL,
    stato VARCHAR(50) DEFAULT 'ATTIVO' NOT NULL,
    data_inizio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fine TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Tabella TORNEO_LOCALE (associazione M:N)
CREATE TABLE IF NOT EXISTS platform_db.torneo_locale (
    torneo_id UUID REFERENCES platform_db.torneo(id) ON DELETE CASCADE NOT NULL,
    locale_id VARCHAR(100) REFERENCES platform_db.locale(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (torneo_id, locale_id)
);

-- Tabella ISCRIZIONE_TORNEO (iscrizione esplicita giocatore a torneo)
CREATE TABLE IF NOT EXISTS platform_db.iscrizione_torneo (
    torneo_id UUID REFERENCES platform_db.torneo(id) ON DELETE CASCADE NOT NULL,
    utente_id UUID REFERENCES platform_db.utente(id) ON DELETE CASCADE NOT NULL,
    data_iscrizione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (torneo_id, utente_id)
);

-- Tabella PARTITA
CREATE TABLE IF NOT EXISTS platform_db.partita (
    id UUID PRIMARY KEY,
    installazione_id VARCHAR(100) REFERENCES platform_db.installazione_gioco(id) ON DELETE RESTRICT NOT NULL,
    locale_id VARCHAR(100) REFERENCES platform_db.locale(id) ON DELETE RESTRICT NOT NULL,
    giocatore_1_id UUID REFERENCES platform_db.utente(id) ON DELETE SET NULL,
    giocatore_2_id UUID REFERENCES platform_db.utente(id) ON DELETE SET NULL,
    punteggio_1 INTEGER NOT NULL,
    punteggio_2 INTEGER NOT NULL,
    data_inizio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fine TIMESTAMP WITH TIME ZONE NOT NULL,
    torneo_id UUID REFERENCES platform_db.torneo(id) ON DELETE SET NULL,
    data_sincronizzazione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_partita_torneo ON platform_db.partita(torneo_id) WHERE torneo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partita_locale ON platform_db.partita(locale_id);
CREATE INDEX IF NOT EXISTS idx_partita_giocatori ON platform_db.partita(giocatore_1_id, giocatore_2_id);

-- Tabella EVENTO_PARTITA (opzionale, per tracciamento dettagliato)
CREATE TABLE IF NOT EXISTS platform_db.evento_partita (
    id BIGSERIAL PRIMARY KEY,
    partita_id UUID REFERENCES platform_db.partita(id) ON DELETE CASCADE NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    valore VARCHAR(50),
    timestamp_evento TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ============================================================
-- DATI SEED (popolamento iniziale per demo e test)
-- ============================================================

-- Locali
INSERT INTO platform_db.locale (id, nome, tipo, indirizzo) VALUES
    ('BAR_BELVEDERE', 'Bar Belvedere', 'PUBBLICO', 'Via Roma 42, Alessandria'),
    ('SALA_GIOCHI_ROMA', 'Sala Giochi Roma', 'PUBBLICO', 'Via Nazionale 15, Roma');

-- Utenti (Mappati da Keycloak)
INSERT INTO platform_db.utente (id, username, email) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'SuperMario', 'mario.rossi@example.com'),
    ('a0000000-0000-0000-0000-000000000002', 'Gigio', 'luigi.bianchi@example.com'),
    ('a0000000-0000-0000-0000-000000000003', 'admin_belvedere', 'admin.belvedere@example.com'),
    ('a0000000-0000-0000-0000-000000000004', 'admin_roma', 'admin.roma@example.com'),
    ('a0000000-0000-0000-0000-000000000005', 'admin_piattaforma', 'admin.platform@example.com'),
    ('a0000000-0000-0000-0000-000000000006', 'edge_sync_service', 'sync.service@example.com'),
    ('a0000000-0000-0000-0000-000000000007', 'SantAnna', 'anna.verdi@example.com'),
    ('a0000000-0000-0000-0000-000000000008', 'Paul', 'paolo.neri@example.com'),
    ('a0000000-0000-0000-0000-000000000009', 'LukeSkywalker', 'luca.gialli@example.com'),
    ('a0000000-0000-0000-0000-000000000010', 'Saretta', 'sara.viola@example.com');

-- Giochi
INSERT INTO platform_db.gioco (id, nome, descrizione) VALUES
    ('calciobalilla', 'Calciobalilla', 'Classico calciobalilla a 4 stecche. Partita a 10 gol.'),
    ('freccette', 'Freccette', 'Gioco di freccette con regola 301/501. Vince chi raggiunge esattamente 0.');

-- Sensori
INSERT INTO platform_db.sensore_gioco (id, gioco_id, tipo_evento, descrizione) VALUES
    ('calciobalilla_porta_a', 'calciobalilla', 'GOAL', 'Sensore IR break-beam porta Team A'),
    ('calciobalilla_porta_b', 'calciobalilla', 'GOAL', 'Sensore IR break-beam porta Team B'),
    ('freccette_tabellone', 'freccette', 'TIRO', 'Sensore SVG click sul tabellone interattivo');

-- Installazioni gioco (2 per locale)
INSERT INTO platform_db.installazione_gioco (id, gioco_id, locale_id, stato_attivita) VALUES
    ('calciobalilla-1', 'calciobalilla', 'BAR_BELVEDERE', 'ATTIVO'),
    ('freccette-1', 'freccette', 'BAR_BELVEDERE', 'ATTIVO'),
    ('calciobalilla-2', 'calciobalilla', 'SALA_GIOCHI_ROMA', 'ATTIVO'),
    ('freccette-2', 'freccette', 'SALA_GIOCHI_ROMA', 'ATTIVO');

-- Tornei di esempio
INSERT INTO platform_db.torneo (id, nome, gioco_id, stato, data_inizio, data_fine) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Torneo Estivo Calciobalilla 2026', 'calciobalilla', 'ATTIVO',
     '2026-07-01T00:00:00Z', '2026-08-31T23:59:59Z'),
    ('b0000000-0000-0000-0000-000000000002', 'Torneo Freccette Primavera 2026', 'freccette', 'CONCLUSO',
     '2026-04-01T00:00:00Z', '2026-06-30T23:59:59Z');

-- Associazioni torneo-locale
INSERT INTO platform_db.torneo_locale (torneo_id, locale_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000001', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000002', 'BAR_BELVEDERE');

-- Iscrizioni torneo (giocatori iscritti ai tornei)
INSERT INTO platform_db.iscrizione_torneo (torneo_id, utente_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000009'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000010');
