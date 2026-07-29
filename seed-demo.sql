-- ============================================================
-- seed-demo.sql — Popolamento Partite per Demo Dashboard
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
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 10, 8, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '15 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008', 10, 7, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '12 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', 'a0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000010', 10, 6, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '18 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 10, 4, CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP - INTERVAL '1 days' + INTERVAL '10 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000009', 10, 8, CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP - INTERVAL '1 days' + INTERVAL '14 minutes', 'b0000000-0000-0000-0000-000000000001'),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', 'a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000010', 10, 9, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours', 'b0000000-0000-0000-0000-000000000001');

-- 2. Partite per il Torneo Freccette Primavera 2026 (Torneo CONCLUSO)
-- UUID Torneo: b0000000-0000-0000-0000-000000000002
-- Giocatori iscritti: tutti i 6 giocatori

INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 501, 480, '2026-05-15 14:00:00+00', '2026-05-15 14:30:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000009', 501, 420, '2026-05-16 10:00:00+00', '2026-05-16 10:35:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000010', 501, 380, '2026-05-16 16:00:00+00', '2026-05-16 16:45:00+00', 'b0000000-0000-0000-0000-000000000002'),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 501, 450, '2026-05-18 17:00:00+00', '2026-05-18 17:40:00+00', 'b0000000-0000-0000-0000-000000000002');

-- 3. Partite Amichevoli (Nessun Torneo)
-- Includiamo partite tra tutti i 6 giocatori e giocatori Ospiti (NULL)

INSERT INTO platform_db.partita 
(id, installazione_id, locale_id, giocatore_1_id, giocatore_2_id, punteggio_1, punteggio_2, data_inizio, data_fine, torneo_id) 
VALUES
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 10, 8, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '15 minutes', NULL),
(platform_db.uuid_generate_v4(), 'freccette-2', 'SALA_GIOCHI_ROMA', 'a0000000-0000-0000-0000-000000000009', NULL, 301, 250, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '25 minutes', NULL),
(platform_db.uuid_generate_v4(), 'calciobalilla-2', 'SALA_GIOCHI_ROMA', 'a0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000008', 10, 7, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '20 minutes', NULL),
(platform_db.uuid_generate_v4(), 'calciobalilla-1', 'BAR_BELVEDERE', NULL, NULL, 10, 9, CURRENT_TIMESTAMP - INTERVAL '10 hours', CURRENT_TIMESTAMP - INTERVAL '9 hours', NULL),
(platform_db.uuid_generate_v4(), 'freccette-1', 'BAR_BELVEDERE', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000010', 501, 490, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP, NULL);

