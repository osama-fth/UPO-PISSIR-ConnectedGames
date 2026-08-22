\connect platform_db;

-- Locali
INSERT INTO platform_db.locale (id, nome, tipo, indirizzo) VALUES
    ('BAR_BELVEDERE', 'Bar Belvedere', 'PUBBLICO', 'Via Roma 42, Alessandria'),
    ('SALA_GIOCHI_ROMA', 'Sala Giochi Roma', 'PUBBLICO', 'Via Nazionale 15, Roma');

-- Utenti
INSERT INTO platform_db.utente (id, username, email, ruolo) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'SuperMario', 'mario.rossi@example.com', 'giocatore'),
    ('8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'Gigio', 'luigi.bianchi@example.com', 'giocatore'),
    ('3e7d9b14-8a5f-4c2d-9610-4f51e8a93c71', 'admin_belvedere', 'admin.belvedere@example.com', 'admin_locale'),
    ('6b9e2c4f-1d8a-4f53-b290-7c4819e6d035', 'admin_roma', 'admin.roma@example.com', 'admin_locale'),
    ('d19f8e32-7c6a-4d10-8b45-2e6f91d84a0c', 'admin_piattaforma', 'admin.platform@example.com', 'admin_piattaforma'),
    ('e28a4c10-9b3f-4e61-a572-8d9e03f1b4c7', 'edge_sync_service', 'sync.service@example.com', 'servizio'),
    ('5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'SantAnna', 'anna.verdi@example.com', 'giocatore'),
    ('9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 'Paul', 'paolo.neri@example.com', 'giocatore'),
    ('7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 'LukeSkywalker', 'luca.gialli@example.com', 'giocatore'),
    ('1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 'Saretta', 'sara.viola@example.com', 'giocatore');

-- Giochi
INSERT INTO platform_db.gioco (id, nome, descrizione) VALUES
    ('calciobalilla', 'Calciobalilla', 'Classico calciobalilla a 4 stecche. Partita a 10 gol.'),
    ('freccette', 'Freccette', 'Gioco di freccette con regola 301/501. Vince chi raggiunge esattamente 0.'),
    ('biliardo', 'Biliardo 8-Ball', 'Partita a biliardo 8-Ball con 15 palle. Vince chi imbuca le sue 7 palle e la palla 8.');

-- Sensori
INSERT INTO platform_db.sensore_gioco (id, gioco_id, tipo_evento, descrizione) VALUES
    ('calciobalilla_porta_a', 'calciobalilla', 'GOAL', 'Sensore IR break-beam porta Team A'),
    ('calciobalilla_porta_b', 'calciobalilla', 'GOAL', 'Sensore IR break-beam porta Team B'),
    ('freccette_tabellone', 'freccette', 'TIRO', 'Sensore SVG click sul tabellone interattivo'),
    ('biliardo_buca', 'biliardo', 'IMBUCATA', 'Sensore ottico buche biliardo'),
    ('biliardo_fallo', 'biliardo', 'FALLO', 'Sensore fallo stecca/sposta palla');

-- Installazioni gioco
INSERT INTO platform_db.installazione_gioco (id, gioco_id, locale_id, stato_attivita) VALUES
    ('calciobalilla-1', 'calciobalilla', 'BAR_BELVEDERE', 'ATTIVO'),
    ('freccette-1', 'freccette', 'BAR_BELVEDERE', 'ATTIVO'),
    ('biliardo-1', 'biliardo', 'BAR_BELVEDERE', 'ATTIVO'),
    ('calciobalilla-2', 'calciobalilla', 'SALA_GIOCHI_ROMA', 'ATTIVO'),
    ('freccette-2', 'freccette', 'SALA_GIOCHI_ROMA', 'ATTIVO'),
    ('biliardo-2', 'biliardo', 'SALA_GIOCHI_ROMA', 'ATTIVO');

-- Tornei
INSERT INTO platform_db.torneo (id, nome, gioco_id, stato, data_inizio, data_fine) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Torneo Estivo Calciobalilla 2026', 'calciobalilla', 'ATTIVO',
     '2026-07-01T00:00:00Z', '2026-08-31T23:59:59Z'),
    ('b0000000-0000-0000-0000-000000000002', 'Torneo Freccette Primavera 2026', 'freccette', 'CONCLUSO',
     '2026-04-01T00:00:00Z', '2026-06-30T23:59:59Z'),
    ('b0000000-0000-0000-0000-000000000003', 'Campionato Invernale Calciobalilla 2025', 'calciobalilla', 'CONCLUSO',
     '2025-11-01T00:00:00Z', '2026-01-31T23:59:59Z'),
    ('b0000000-0000-0000-0000-000000000004', 'Torneo Freccette Autunno 2025', 'freccette', 'CONCLUSO',
     '2025-09-01T00:00:00Z', '2025-11-30T23:59:59Z'),
    ('b0000000-0000-0000-0000-000000000005', 'Trofeo Bar Belvedere Calciobalilla 2026', 'calciobalilla', 'CONCLUSO',
     '2026-02-01T00:00:00Z', '2026-04-15T23:59:59Z'),
    ('b0000000-0000-0000-0000-000000000006', 'Torneo Estivo Freccette 2026', 'freccette', 'ATTIVO',
     '2026-07-01T00:00:00Z', '2026-08-31T23:59:59Z'),
    ('b0000000-0000-0000-0000-000000000007', 'Torneo Biliardo 8-Ball 2026', 'biliardo', 'ATTIVO',
     '2026-07-01T00:00:00Z', '2026-08-31T23:59:59Z');

-- Associazioni Torneo-Locale
INSERT INTO platform_db.torneo_locale (torneo_id, locale_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000001', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000002', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000002', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000003', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000003', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000004', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000005', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000006', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000006', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000007', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000007', 'SALA_GIOCHI_ROMA');

-- Iscrizioni Torneo
INSERT INTO platform_db.iscrizione_torneo (torneo_id, utente_id, locale_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000001', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000001', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000001', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000001', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000001', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000002', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000002', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000002', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000002', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000002', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000002', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000003', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000003', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000003', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000003', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000003', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000004', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000004', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000004', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000004', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000005', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000005', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000005', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000005', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000006', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000006', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000006', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'BAR_BELVEDERE'),
    ('b0000000-0000-0000-0000-000000000006', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000006', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 'SALA_GIOCHI_ROMA'),
    ('b0000000-0000-0000-0000-000000000006', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 'SALA_GIOCHI_ROMA');

-- Partite Torneo 1 (Calciobalilla Estivo 2026)
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 10, 8, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days' + INTERVAL '15 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 10, 7, CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days' + INTERVAL '12 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 10, 6, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '18 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 10, 4, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '10 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 8, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days' + INTERVAL '14 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 10, 9, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '20 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 7, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '15 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 10, 8, CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP - INTERVAL '1 days' + INTERVAL '12 minutes', 'b0000000-0000-0000-0000-000000000001');

-- Partite Torneo 2 (Freccette Primavera 2026)
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 501, 480, '2026-05-15 14:00:00+00', '2026-05-15 14:30:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 501, 420, '2026-05-16 10:00:00+00', '2026-05-16 10:35:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 501, 380, '2026-05-16 16:00:00+00', '2026-05-16 16:45:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 501, 450, '2026-05-18 17:00:00+00', '2026-05-18 17:40:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 501, 490, '2026-05-25 18:00:00+00', '2026-05-25 18:40:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 501, 410, '2026-06-01 15:00:00+00', '2026-06-01 15:35:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 501, 470, '2026-06-20 20:00:00+00', '2026-06-20 20:45:00+00', 'b0000000-0000-0000-0000-000000000002');

-- Partite Torneo 3 (Calciobalilla Inverno 2025)
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 10, 9, '2025-11-10 18:00:00+00', '2025-11-10 18:15:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 7, '2025-11-15 16:00:00+00', '2025-11-15 16:12:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 10, 5, '2025-12-01 21:00:00+00', '2025-12-01 21:18:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 8, '2025-12-15 19:00:00+00', '2025-12-15 19:14:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 10, 6, '2026-01-10 17:00:00+00', '2026-01-10 17:15:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 10, 8, '2026-01-25 20:30:00+00', '2026-01-25 20:45:00+00', 'b0000000-0000-0000-0000-000000000003');

-- Partite Torneo 4 (Freccette Autunno 2025)
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 301, 290, '2025-09-15 15:00:00+00', '2025-09-15 15:25:00+00', 'b0000000-0000-0000-0000-000000000004'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 301, 240, '2025-10-02 18:00:00+00', '2025-10-02 18:30:00+00', 'b0000000-0000-0000-0000-000000000004'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 301, 285, '2025-10-20 16:30:00+00', '2025-10-20 17:00:00+00', 'b0000000-0000-0000-0000-000000000004'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 301, 210, '2025-11-12 21:00:00+00', '2025-11-12 21:30:00+00', 'b0000000-0000-0000-0000-000000000004');

-- Partite Torneo 5 (Trofeo Belvedere Calciobalilla 2026)
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 5, '2026-02-10 18:00:00+00', '2026-02-10 18:12:00+00', 'b0000000-0000-0000-0000-000000000005'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 10, 7, '2026-02-25 19:30:00+00', '2026-02-25 19:45:00+00', 'b0000000-0000-0000-0000-000000000005'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 10, 9, '2026-03-15 17:00:00+00', '2026-03-15 17:16:00+00', 'b0000000-0000-0000-0000-000000000005'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 6, '2026-04-02 21:15:00+00', '2026-04-02 21:28:00+00', 'b0000000-0000-0000-0000-000000000005');

-- Partite Torneo 6 (Freccette Estivo 2026)
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 301, 275, CURRENT_TIMESTAMP - INTERVAL '18 days', CURRENT_TIMESTAMP - INTERVAL '18 days' + INTERVAL '20 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 301, 290, CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days' + INTERVAL '25 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 301, 260, CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '11 days' + INTERVAL '22 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 301, 250, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '18 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 301, 295, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '21 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 301, 220, CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP - INTERVAL '1 days' + INTERVAL '24 minutes', 'b0000000-0000-0000-0000-000000000006');

-- Partite Torneo 7 (Biliardo 8-Ball 2026)
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'biliardo-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 7, 5, CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days' + INTERVAL '25 minutes', 'b0000000-0000-0000-0000-000000000007'),
(platform_db.uuid_generate_v4(), 'biliardo-2', 'SALA_GIOCHI_ROMA', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 7, 4, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '30 minutes', 'b0000000-0000-0000-0000-000000000007'),
(platform_db.uuid_generate_v4(), 'biliardo-1', 'BAR_BELVEDERE', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 7, 6, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '28 minutes', 'b0000000-0000-0000-0000-000000000007');

-- Partite Amichevoli
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 10, 8, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days' + INTERVAL '15 minutes', NULL),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', NULL, 301, 250, CURRENT_TIMESTAMP - INTERVAL '16 days', CURRENT_TIMESTAMP - INTERVAL '16 days' + INTERVAL '25 minutes', NULL),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 10, 7, CURRENT_TIMESTAMP - INTERVAL '13 days', CURRENT_TIMESTAMP - INTERVAL '13 days' + INTERVAL '20 minutes', NULL),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', NULL, NULL, 10, 9, CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '9 days' + INTERVAL '15 minutes', NULL),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 501, 490, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '30 minutes', NULL),
(platform_db.uuid_generate_v4(), 'biliardo-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 7, 3, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '22 minutes', NULL),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 10, 6, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '11 minutes', NULL),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 301, 280, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP - INTERVAL '7 hours', NULL),
(platform_db.uuid_generate_v4(), 'biliardo-2', 'SALA_GIOCHI_ROMA', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 7, 5, CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL);
