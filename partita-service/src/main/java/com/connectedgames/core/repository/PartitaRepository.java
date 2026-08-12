package com.connectedgames.core.repository;

import com.connectedgames.core.entity.Partita;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

// Repository JPA per l'accesso e la memorizzazione delle partite giocate in platform_db
@Repository
public interface PartitaRepository extends JpaRepository<Partita, UUID> {

    List<Partita> findByLocaleId(String localeId);

    List<Partita> findByTorneoId(UUID torneoId);

    long countByGiocatore1IdOrGiocatore2Id(UUID giocatore1Id, UUID giocatore2Id);

    boolean existsById(UUID id);

    Page<Partita> findAll(Pageable pageable);

    Page<Partita> findByLocaleId(String localeId, Pageable pageable);

    @Query("SELECT p FROM Partita p WHERE p.giocatore1.id = :utenteId OR p.giocatore2.id = :utenteId")
    Page<Partita> findByGiocatoreId(@Param("utenteId") UUID utenteId, Pageable pageable);

    @Query("""
        SELECT COUNT(p) FROM Partita p
        WHERE (p.giocatore1.id = :uid AND p.punteggio1 > p.punteggio2)
           OR (p.giocatore2.id = :uid AND p.punteggio2 > p.punteggio1)
    """)
    long countVittorieByGiocatoreId(@Param("uid") UUID utenteId);

    @Query("""
        SELECT COUNT(p) FROM Partita p
        WHERE (p.giocatore1.id = :uid AND p.punteggio1 < p.punteggio2)
           OR (p.giocatore2.id = :uid AND p.punteggio2 < p.punteggio1)
    """)
    long countSconfitteByGiocatoreId(@Param("uid") UUID utenteId);

    @Query("SELECT p FROM Partita p WHERE p.installazione.gioco.id = :giocoId")
    Page<Partita> findByGiocoId(@Param("giocoId") String giocoId, Pageable pageable);

    @Query("SELECT p FROM Partita p WHERE p.locale.id = :localeId AND p.installazione.gioco.id = :giocoId")
    Page<Partita> findByLocaleIdAndGiocoId(
        @Param("localeId") String localeId,
        @Param("giocoId") String giocoId,
        Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM platform_db.iscrizione_torneo WHERE torneo_id = :torneoId AND utente_id IN (:g1, :g2)", nativeQuery = true)
    long countIscrizioniByTorneoIdAndGiocatoriId(@Param("torneoId") UUID torneoId, @Param("g1") UUID g1, @Param("g2") UUID g2);
}
