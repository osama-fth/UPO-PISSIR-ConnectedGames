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

-- 2. Creazione utenze segregate con privilegio minimo (Fix M6)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'platform_user') THEN
        CREATE USER platform_user WITH PASSWORD 'platform_pass123';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'keycloak_user') THEN
        CREATE USER keycloak_user WITH PASSWORD 'keycloak_pass123';
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE platform_db TO platform_user;
GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO keycloak_user;

-- 3. Connessione al database platform_db per creare schema e tabelle
\connect platform_db;

-- 4. Creazione dello schema 'platform_db' dentro il database 'platform_db'
-- Le entities JPA usano @Table(schema = "platform_db"), quindi serve
-- uno schema con questo nome all'interno del database.
CREATE SCHEMA IF NOT EXISTS platform_db;

GRANT ALL PRIVILEGES ON SCHEMA platform_db TO platform_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform_db TO platform_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform_db TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_db GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_db GRANT ALL ON SEQUENCES TO platform_user;

-- 5. Abilita l'estensione UUID nello schema platform_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA platform_db;

-- Permessi per keycloak_db
\connect keycloak_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO keycloak_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO keycloak_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO keycloak_user;

-- Ritorno a platform_db per DDL e SEED
\connect platform_db;

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
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'SuperMario', 'mario.rossi@example.com'),
    ('8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'Gigio', 'luigi.bianchi@example.com'),
    ('3e7d9b14-8a5f-4c2d-9610-4f51e8a93c71', 'admin_belvedere', 'admin.belvedere@example.com'),
    ('6b9e2c4f-1d8a-4f53-b290-7c4819e6d035', 'admin_roma', 'admin.roma@example.com'),
    ('d19f8e32-7c6a-4d10-8b45-2e6f91d84a0c', 'admin_piattaforma', 'admin.platform@example.com'),
    ('e28a4c10-9b3f-4e61-a572-8d9e03f1b4c7', 'edge_sync_service', 'sync.service@example.com'),
    ('5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'SantAnna', 'anna.verdi@example.com'),
    ('9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 'Paul', 'paolo.neri@example.com'),
    ('7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 'LukeSkywalker', 'luca.gialli@example.com'),
    ('1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 'Saretta', 'sara.viola@example.com');

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
    ('b0000000-0000-0000-0000-000000000001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'),
    ('b0000000-0000-0000-0000-000000000001', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2'),
    ('b0000000-0000-0000-0000-000000000001', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a'),
    ('b0000000-0000-0000-0000-000000000001', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61'),
    ('b0000000-0000-0000-0000-000000000001', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b'),
    ('b0000000-0000-0000-0000-000000000001', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e'),
    ('b0000000-0000-0000-0000-000000000002', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'),
    ('b0000000-0000-0000-0000-000000000002', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2'),
    ('b0000000-0000-0000-0000-000000000002', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a'),
    ('b0000000-0000-0000-0000-000000000002', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61'),
    ('b0000000-0000-0000-0000-000000000002', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b'),
    ('b0000000-0000-0000-0000-000000000002', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e');
