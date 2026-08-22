\connect platform_db;

-- Tabella LOCALE
CREATE TABLE IF NOT EXISTS platform_db.locale (
    id VARCHAR(100) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    indirizzo VARCHAR(255) NOT NULL,
    data_creazione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabella UTENTE
CREATE TABLE IF NOT EXISTS platform_db.utente (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    ruolo VARCHAR(30) DEFAULT 'giocatore' NOT NULL,
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

-- Tabella TORNEO_LOCALE
CREATE TABLE IF NOT EXISTS platform_db.torneo_locale (
    torneo_id UUID REFERENCES platform_db.torneo(id) ON DELETE CASCADE NOT NULL,
    locale_id VARCHAR(100) REFERENCES platform_db.locale(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (torneo_id, locale_id)
);

-- Tabella ISCRIZIONE_TORNEO
CREATE TABLE IF NOT EXISTS platform_db.iscrizione_torneo (
    torneo_id UUID REFERENCES platform_db.torneo(id) ON DELETE CASCADE NOT NULL,
    utente_id UUID REFERENCES platform_db.utente(id) ON DELETE CASCADE NOT NULL,
    locale_id VARCHAR(100) REFERENCES platform_db.locale(id) ON DELETE CASCADE NOT NULL,
    data_iscrizione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (torneo_id, utente_id)
);
CREATE INDEX IF NOT EXISTS idx_iscrizione_locale ON platform_db.iscrizione_torneo(locale_id);

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

CREATE INDEX IF NOT EXISTS idx_partita_torneo ON platform_db.partita(torneo_id) WHERE torneo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partita_locale ON platform_db.partita(locale_id);
CREATE INDEX IF NOT EXISTS idx_partita_giocatori ON platform_db.partita(giocatore_1_id, giocatore_2_id);

-- Tabella EVENTO_PARTITA
CREATE TABLE IF NOT EXISTS platform_db.evento_partita (
    id BIGSERIAL PRIMARY KEY,
    partita_id UUID REFERENCES platform_db.partita(id) ON DELETE CASCADE NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    valore VARCHAR(50),
    timestamp_evento TIMESTAMP WITH TIME ZONE NOT NULL
);
