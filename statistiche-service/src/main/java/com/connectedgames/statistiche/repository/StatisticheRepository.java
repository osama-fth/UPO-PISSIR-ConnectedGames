package com.connectedgames.statistiche.repository;

import com.connectedgames.statistiche.dto.GiocoStat;
import com.connectedgames.statistiche.dto.LocaleStat;
import com.connectedgames.statistiche.dto.StatisticheLocaleResponse;
import com.connectedgames.statistiche.dto.StatisticheUtenteResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class StatisticheRepository {

    private final JdbcTemplate jdbcTemplate;

    public StatisticheRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long countTotalePartite() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM platform_db.partita", Long.class);
        return count != null ? count : 0;
    }

    public long countTotaleGiocatoriAttivi() {
        // Conta i giocatori distinti che hanno partecipato ad almeno una partita
        String sql = """
            SELECT COUNT(DISTINCT player_id) FROM (
                SELECT giocatore_1_id as player_id FROM platform_db.partita WHERE giocatore_1_id IS NOT NULL
                UNION
                SELECT giocatore_2_id as player_id FROM platform_db.partita WHERE giocatore_2_id IS NOT NULL
            ) as players
        """;
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0;
    }

    public List<LocaleStat> getLocaliPiuAttivi(int limit) {
        String sql = """
            SELECT p.locale_id, l.nome, COUNT(p.id) as partite_giocate
            FROM platform_db.partita p
            JOIN platform_db.locale l ON p.locale_id = l.id
            GROUP BY p.locale_id, l.nome
            ORDER BY partite_giocate DESC
            LIMIT ?
        """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new LocaleStat(
                rs.getString("locale_id"),
                rs.getString("nome"),
                rs.getLong("partite_giocate")
        ), limit);
    }

    public List<GiocoStat> getGiochiPiuUtilizzati(int limit) {
        String sql = """
            SELECT g.nome as gioco_tipo, COUNT(p.id) as partite_giocate
            FROM platform_db.partita p
            JOIN platform_db.installazione_gioco ig ON p.installazione_id = ig.id
            JOIN platform_db.gioco g ON ig.gioco_id = g.id
            GROUP BY g.nome
            ORDER BY partite_giocate DESC
            LIMIT ?
        """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new GiocoStat(
                rs.getString("gioco_tipo"),
                rs.getLong("partite_giocate")
        ), limit);
    }

    public StatisticheLocaleResponse getStatistichePerLocale(String localeId) {
        Long partiteGiocate = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM platform_db.partita WHERE locale_id = ?",
                Long.class, localeId);

        String sqlGiocatori = """
            SELECT COUNT(DISTINCT player_id) FROM (
                SELECT giocatore_1_id as player_id FROM platform_db.partita WHERE locale_id = ? AND giocatore_1_id IS NOT NULL
                UNION
                SELECT giocatore_2_id as player_id FROM platform_db.partita WHERE locale_id = ? AND giocatore_2_id IS NOT NULL
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
