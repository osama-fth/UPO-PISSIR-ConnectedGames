package com.connectedgames.statistiche.repository;

import com.connectedgames.statistiche.dto.GiocoStat;
import com.connectedgames.statistiche.dto.LocaleStat;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

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
}
