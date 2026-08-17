-- Script di popolamento iniziale con ampio set di partite e risultati di esempio.
-- UUID Giocatori:
-- SuperMario:     f47ac10b-58cc-4372-a567-0e02b2c3d479
-- Gigio:          8c1c4e92-3d71-4b82-95f3-11a2f64d08b2
-- SantAnna:       5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a
-- Paul:           9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61
-- LukeSkywalker:  7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b
-- Saretta:        1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e

\connect platform_db;

-- =========================================================================
-- 1. Torneo Estivo Calciobalilla 2026 (ATTIVO)
-- UUID: b0000000-0000-0000-0000-000000000001
-- =========================================================================
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

-- =========================================================================
-- 2. Torneo Freccette Primavera 2026 (CONCLUSO)
-- UUID: b0000000-0000-0000-0000-000000000002
-- =========================================================================
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

-- =========================================================================
-- 3. Campionato Invernale Calciobalilla 2025 (CONCLUSO)
-- UUID: b0000000-0000-0000-0000-000000000003
-- =========================================================================
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 10, 9, '2025-11-10 18:00:00+00', '2025-11-10 18:15:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 7, '2025-11-15 16:00:00+00', '2025-11-15 16:12:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 10, 5, '2025-12-01 21:00:00+00', '2025-12-01 21:18:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 8, '2025-12-15 19:00:00+00', '2025-12-15 19:14:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 10, 6, '2026-01-10 17:00:00+00', '2026-01-10 17:15:00+00', 'b0000000-0000-0000-0000-000000000003'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 10, 8, '2026-01-25 20:30:00+00', '2026-01-25 20:45:00+00', 'b0000000-0000-0000-0000-000000000003');

-- =========================================================================
-- 4. Torneo Freccette Autunno 2025 (CONCLUSO)
-- UUID: b0000000-0000-0000-0000-000000000004
-- =========================================================================
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 301, 290, '2025-09-15 15:00:00+00', '2025-09-15 15:25:00+00', 'b0000000-0000-0000-0000-000000000004'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 301, 240, '2025-10-02 18:00:00+00', '2025-10-02 18:30:00+00', 'b0000000-0000-0000-0000-000000000004'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 301, 285, '2025-10-20 16:30:00+00', '2025-10-20 17:00:00+00', 'b0000000-0000-0000-0000-000000000004'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 301, 210, '2025-11-12 21:00:00+00', '2025-11-12 21:30:00+00', 'b0000000-0000-0000-0000-000000000004');

-- =========================================================================
-- 5. Trofeo Bar Belvedere Calciobalilla 2026 (CONCLUSO)
-- UUID: b0000000-0000-0000-0000-000000000005
-- =========================================================================
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 5, '2026-02-10 18:00:00+00', '2026-02-10 18:12:00+00', 'b0000000-0000-0000-0000-000000000005'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 10, 7, '2026-02-25 19:30:00+00', '2026-02-25 19:45:00+00', 'b0000000-0000-0000-0000-000000000005'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 10, 9, '2026-03-15 17:00:00+00', '2026-03-15 17:16:00+00', 'b0000000-0000-0000-0000-000000000005'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 6, '2026-04-02 21:15:00+00', '2026-04-02 21:28:00+00', 'b0000000-0000-0000-0000-000000000005');

-- =========================================================================
-- 6. Torneo Estivo Freccette 2026 (ATTIVO)
-- UUID: b0000000-0000-0000-0000-000000000006
-- =========================================================================
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 301, 275, CURRENT_TIMESTAMP - INTERVAL '18 days', CURRENT_TIMESTAMP - INTERVAL '18 days' + INTERVAL '20 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 301, 290, CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days' + INTERVAL '25 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 301, 260, CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '11 days' + INTERVAL '22 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 301, 250, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '18 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 301, 295, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '21 minutes', 'b0000000-0000-0000-0000-000000000006'),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 301, 220, CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP - INTERVAL '1 days' + INTERVAL '24 minutes', 'b0000000-0000-0000-0000-000000000006');

-- =========================================================================
-- 7. Torneo Biliardo 8-Ball 2026 (ATTIVO)
-- UUID: b0000000-0000-0000-0000-000000000007
-- =========================================================================
INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'biliardo-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 7, 5, CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days' + INTERVAL '25 minutes', 'b0000000-0000-0000-0000-000000000007'),
(platform_db.uuid_generate_v4(), 'biliardo-2', 'SALA_GIOCHI_ROMA', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 7, 4, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '30 minutes', 'b0000000-0000-0000-0000-000000000007'),
(platform_db.uuid_generate_v4(), 'biliardo-1', 'BAR_BELVEDERE', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 7, 6, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '28 minutes', 'b0000000-0000-0000-0000-000000000007');

-- =========================================================================
-- 8. Partite Amichevoli (Nessun Torneo)
-- =========================================================================
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
