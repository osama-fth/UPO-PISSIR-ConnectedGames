package com.connectedgames.statistiche.repository;

import com.connectedgames.statistiche.dto.GiocatoreVittorieStat;
import com.connectedgames.statistiche.dto.GiocoStat;
import com.connectedgames.statistiche.dto.LocaleStat;
import com.connectedgames.statistiche.dto.PartiteTempoStat;
import com.connectedgames.statistiche.dto.StatisticheLocaleResponse;
import com.connectedgames.statistiche.dto.StatisticheUtenteResponse;
import com.connectedgames.statistiche.dto.TorneoStat;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class StatisticheRepository {

    private final JdbcTemplate jdbcTemplate;

    public StatisticheRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long countTotalePartite(Integer giorni, String giocoId) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(p.id) FROM platform_db.partita p
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }
        if (giocoId != null && !giocoId.isBlank()) {
            sql.append(" AND ig.gioco_id = ?");
            params.add(giocoId);
        }

        Long count = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null ? count : 0;
    }

    public long countTotaleGiocatoriAttivi(Integer giorni, String giocoId) {
        // Conta tassativamente SOLO i giocatori con ruolo 'giocatore'
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(DISTINCT player_id) FROM (
                SELECT p.giocatore_1_id as player_id 
                FROM platform_db.partita p 
                JOIN platform_db.utente u ON p.giocatore_1_id = u.id 
                JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
                WHERE u.ruolo = 'giocatore'
        """);
        List<Object> params = new ArrayList<>();

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }
        if (giocoId != null && !giocoId.isBlank()) {
            sql.append(" AND ig.gioco_id = ?");
            params.add(giocoId);
        }

        sql.append("""
                UNION
                SELECT p.giocatore_2_id as player_id 
                FROM platform_db.partita p 
                JOIN platform_db.utente u ON p.giocatore_2_id = u.id 
                JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
                WHERE u.ruolo = 'giocatore'
        """);

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }
        if (giocoId != null && !giocoId.isBlank()) {
            sql.append(" AND ig.gioco_id = ?");
            params.add(giocoId);
        }

        sql.append(") as players");

        Long count = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null ? count : 0;
    }

    public long countTorneiAttivi() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM platform_db.torneo WHERE stato = 'ATTIVO'", Long.class);
        return count != null ? count : 0;
    }

    public long countTorneiConclusi() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM platform_db.torneo WHERE stato = 'CONCLUSO'", Long.class);
        return count != null ? count : 0;
    }

    public long getTotalePuntiSegnati(Integer giorni, String giocoId) {
        StringBuilder sql = new StringBuilder("""
            SELECT SUM(p.punteggio_1 + p.punteggio_2) 
            FROM platform_db.partita p
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }
        if (giocoId != null && !giocoId.isBlank()) {
            sql.append(" AND ig.gioco_id = ?");
            params.add(giocoId);
        }

        Long sum = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return sum != null ? sum : 0;
    }

    public double getDurataMediaMinuti(Integer giorni, String giocoId) {
        StringBuilder sql = new StringBuilder("""
            SELECT AVG(EXTRACT(EPOCH FROM (p.data_fine - p.data_inizio))/60.0) 
            FROM platform_db.partita p
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            WHERE p.data_fine > p.data_inizio
        """);
        List<Object> params = new ArrayList<>();

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }
        if (giocoId != null && !giocoId.isBlank()) {
            sql.append(" AND ig.gioco_id = ?");
            params.add(giocoId);
        }

        Double avg = jdbcTemplate.queryForObject(sql.toString(), Double.class, params.toArray());
        return avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
    }

    public List<LocaleStat> getLocaliPiuAttivi(int limit, Integer giorni, String giocoId) {
        StringBuilder sql = new StringBuilder("""
            SELECT p.locale_id, l.nome, COUNT(p.id) as partite_giocate
            FROM platform_db.partita p
            JOIN platform_db.locale l ON p.locale_id = l.id
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }
        if (giocoId != null && !giocoId.isBlank()) {
            sql.append(" AND ig.gioco_id = ?");
            params.add(giocoId);
        }

        sql.append("""
            GROUP BY p.locale_id, l.nome
            ORDER BY partite_giocate DESC
            LIMIT ?
        """);
        params.add(limit);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new LocaleStat(
                rs.getString("locale_id"),
                rs.getString("nome"),
                rs.getLong("partite_giocate")
        ), params.toArray());
    }

    public List<GiocoStat> getGiochiPiuUtilizzati(int limit, Integer giorni) {
        StringBuilder sql = new StringBuilder("""
            SELECT g.nome as gioco_tipo, COUNT(p.id) as partite_giocate
            FROM platform_db.partita p
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            JOIN platform_db.gioco g ON ig.gioco_id = g.id
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }

        sql.append("""
            GROUP BY g.nome
            ORDER BY partite_giocate DESC
            LIMIT ?
        """);
        params.add(limit);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new GiocoStat(
                rs.getString("gioco_tipo"),
                rs.getLong("partite_giocate")
        ), params.toArray());
    }

    public List<GiocatoreVittorieStat> getTopGiocatoriVittorie(int limit, Integer giorni, String giocoId) {
        // Tassativamente solo per utenti con ruolo 'giocatore'
        StringBuilder sql = new StringBuilder("""
            SELECT u.id as utente_id, u.username,
                   COUNT(p.id) as giocate,
                   SUM(CASE WHEN (p.giocatore_1_id = u.id AND p.punteggio_1 > p.punteggio_2)
                              OR (p.giocatore_2_id = u.id AND p.punteggio_2 > p.punteggio_1) THEN 1 ELSE 0 END) as vinte
            FROM platform_db.utente u
            JOIN platform_db.partita p ON (p.giocatore_1_id = u.id OR p.giocatore_2_id = u.id)
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            WHERE u.ruolo = 'giocatore'
        """);
        List<Object> params = new ArrayList<>();

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }
        if (giocoId != null && !giocoId.isBlank()) {
            sql.append(" AND ig.gioco_id = ?");
            params.add(giocoId);
        }

        sql.append("""
            GROUP BY u.id, u.username
            HAVING COUNT(p.id) > 0
            ORDER BY vinte DESC, giocate DESC
            LIMIT ?
        """);
        params.add(limit);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            UUID utenteId = UUID.fromString(rs.getString("utente_id"));
            String username = rs.getString("username");
            long giocate = rs.getLong("giocate");
            long vinte = rs.getLong("vinte");
            double winRate = giocate > 0 ? (double) vinte / giocate * 100.0 : 0.0;
            return new GiocatoreVittorieStat(utenteId, username, giocate, vinte, Math.round(winRate * 10.0) / 10.0);
        }, params.toArray());
    }

    public List<TorneoStat> getTorneiStat(int limit) {
        String sql = """
            SELECT t.id as torneo_id, t.nome, g.nome as gioco_nome, t.stato,
                   (SELECT COUNT(*) FROM platform_db.iscrizione_torneo it WHERE it.torneo_id = t.id) as iscritti_count,
                   (SELECT COUNT(*) FROM platform_db.partita p WHERE p.torneo_id = t.id) as partite_count
            FROM platform_db.torneo t
            JOIN platform_db.gioco g ON t.gioco_id = g.id
            ORDER BY t.data_inizio DESC
            LIMIT ?
        """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TorneoStat(
                UUID.fromString(rs.getString("torneo_id")),
                rs.getString("nome"),
                rs.getString("gioco_nome"),
                rs.getString("stato"),
                rs.getLong("iscritti_count"),
                rs.getLong("partite_count")
        ), limit);
    }

    public List<PartiteTempoStat> getTrendPartiteTempo(Integer giorni, String giocoId) {
        StringBuilder sql = new StringBuilder("""
            SELECT TO_CHAR(p.data_fine, 'YYYY-MM-DD') as data_giorno, COUNT(p.id) as partite_count
            FROM platform_db.partita p
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();

        if (giorni != null && giorni > 0) {
            sql.append(" AND p.data_fine >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ?)");
            params.add(giorni);
        }
        if (giocoId != null && !giocoId.isBlank()) {
            sql.append(" AND ig.gioco_id = ?");
            params.add(giocoId);
        }

        sql.append("""
            GROUP BY TO_CHAR(p.data_fine, 'YYYY-MM-DD')
            ORDER BY data_giorno ASC
        """);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new PartiteTempoStat(
                rs.getString("data_giorno"),
                rs.getLong("partite_count")
        ), params.toArray());
    }

    public StatisticheLocaleResponse getStatistichePerLocale(String localeId) {
        Long partiteGiocate = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM platform_db.partita WHERE locale_id = ?",
                Long.class, localeId);

        String sqlGiocatori = """
            SELECT COUNT(DISTINCT player_id) FROM (
                SELECT p.giocatore_1_id as player_id 
                FROM platform_db.partita p
                JOIN platform_db.utente u ON p.giocatore_1_id = u.id
                WHERE p.locale_id = ? AND u.ruolo = 'giocatore'
                UNION
                SELECT p.giocatore_2_id as player_id 
                FROM platform_db.partita p
                JOIN platform_db.utente u ON p.giocatore_2_id = u.id
                WHERE p.locale_id = ? AND u.ruolo = 'giocatore'
            ) as players
        """;
        Long giocatoriAttivi = jdbcTemplate.queryForObject(sqlGiocatori, Long.class, localeId, localeId);

        String sqlRipartizione = """
            SELECT g.nome as gioco_tipo, COUNT(p.id) as partite_giocate
            FROM platform_db.partita p
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            JOIN platform_db.gioco g ON ig.gioco_id = g.id
            WHERE p.locale_id = ?
            GROUP BY g.nome
            ORDER BY partite_giocate DESC
        """;
        List<GiocoStat> ripartizione = jdbcTemplate.query(sqlRipartizione, (rs, rowNum) -> new GiocoStat(
                rs.getString("gioco_tipo"),
                rs.getLong("partite_giocate")
        ), localeId);

        String giocoPiuPopolare = ripartizione.isEmpty() ? "Nessuno" : ripartizione.get(0).giocoTipo();

        return new StatisticheLocaleResponse(
                localeId,
                partiteGiocate != null ? partiteGiocate : 0,
                giocatoriAttivi != null ? giocatoriAttivi : 0,
                giocoPiuPopolare,
                ripartizione
        );
    }

    public StatisticheUtenteResponse getStatistichePerUtente(UUID utenteId) {
        String sqlCheckRuolo = "SELECT ruolo FROM platform_db.utente WHERE id = ?";
        List<String> ruoli = jdbcTemplate.query(sqlCheckRuolo, (rs, rowNum) -> rs.getString("ruolo"), utenteId);
        if (ruoli.isEmpty() || !"giocatore".equalsIgnoreCase(ruoli.get(0))) {
            // Se l'utente non esiste o ha un ruolo diverso da 'giocatore', restituiamo dati azzerati
            return new StatisticheUtenteResponse(utenteId, 0, 0, 0, 0.0, 0);
        }

        String sqlPartite = """
            SELECT COUNT(*) FROM platform_db.partita 
            WHERE giocatore_1_id = ? OR giocatore_2_id = ?
        """;
        Long partiteGiocate = jdbcTemplate.queryForObject(sqlPartite, Long.class, utenteId, utenteId);

        String sqlVinte = """
            SELECT COUNT(*) FROM platform_db.partita 
            WHERE (giocatore_1_id = ? AND punteggio_1 > punteggio_2)
               OR (giocatore_2_id = ? AND punteggio_2 > punteggio_1)
        """;
        Long partiteVinte = jdbcTemplate.queryForObject(sqlVinte, Long.class, utenteId, utenteId);

        String sqlTornei = """
            SELECT COUNT(DISTINCT torneo_id) FROM platform_db.iscrizione_torneo
            WHERE utente_id = ?
        """;
        Long torneiPartecipati = jdbcTemplate.queryForObject(sqlTornei, Long.class, utenteId);

        long giocate = partiteGiocate != null ? partiteGiocate : 0;
        long vinte = partiteVinte != null ? partiteVinte : 0;
        long perse = giocate - vinte;
        double percVittorie = giocate > 0 ? (double) vinte / giocate * 100 : 0.0;

        return new StatisticheUtenteResponse(
                utenteId,
                giocate,
                vinte,
                perse,
                Math.round(percVittorie * 100.0) / 100.0,
                torneiPartecipati != null ? torneiPartecipati : 0
        );
    }
}
