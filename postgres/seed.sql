-- ============================================================
-- seed.sql — Popolamento Partite per Demo Dashboard
-- Connected Games Platform (PISSIR A.A. 2025/2026)
-- ============================================================
-- Questo script inserisce partite di esempio per popolare le
-- dashboard e le classifiche dei tornei.

\connect platform_db;

-- 1. Partite per il Torneo Estivo Calciobalilla 2026 (Torneo ATTIVO)
-- UUID Torneo: b0000000-0000-0000-0000-000000000001
-- Giocatori iscritti: SuperMario (a00...1), Gigio (a00...2), SantAnna (a00...7), Paul (a00...8), LukeSkywalker (a00...9), Saretta (a00...10)

INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 10, 8, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '15 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 10, 7, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '12 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 10, 6, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '18 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 10, 4, CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP - INTERVAL '1 days' + INTERVAL '10 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 10, 8, CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP - INTERVAL '1 days' + INTERVAL '14 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 10, 9, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours', 'b0000000-0000-0000-0000-000000000001');

-- 2. Partite per il Torneo Freccette Primavera 2026 (Torneo CONCLUSO)
-- UUID Torneo: b0000000-0000-0000-0000-000000000002
-- Giocatori iscritti: tutti i 6 giocatori

INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', 501, 480, '2026-05-15 14:00:00+00', '2026-05-15 14:30:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', 501, 420, '2026-05-16 10:00:00+00', '2026-05-16 10:35:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 501, 380, '2026-05-16 16:00:00+00', '2026-05-16 16:45:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '8c1c4e92-3d71-4b82-95f3-11a2f64d08b2', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 501, 450, '2026-05-18 17:00:00+00', '2026-05-18 17:40:00+00', 'b0000000-0000-0000-0000-000000000002');

-- 3. Partite Amichevoli (Nessun Torneo)
-- Includiamo partite tra tutti i 6 giocatori e giocatori Ospiti (NULL)

INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 10, 8, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '15 minutes', NULL),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', '7b8c9d01-4e2f-4a63-b581-0d3c4e9f7a2b', NULL, 301, 250, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '25 minutes', NULL),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', '9d2e4f10-6c8a-4b53-a719-3f0b2e8c5d61', 10, 7, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '20 minutes', NULL),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', NULL, NULL, 10, 9, CURRENT_TIMESTAMP - INTERVAL '10 hours', CURRENT_TIMESTAMP - INTERVAL '9 hours', NULL),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', '5a3b7c89-2e1f-4d60-9842-6e71d09f3b5a', '1f4e5d60-3c2b-4a81-9b70-8e9f0a1c2d3e', 501, 490, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP, NULL);

