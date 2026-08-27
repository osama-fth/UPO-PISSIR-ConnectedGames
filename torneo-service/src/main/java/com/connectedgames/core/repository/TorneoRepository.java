package com.connectedgames.core.repository;

import com.connectedgames.core.entity.Torneo;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface TorneoRepository extends JpaRepository<Torneo, UUID> {

    List<Torneo> findByStato(String stato);

    @Query("SELECT t FROM Torneo t WHERE t.dataInizio <= ?1 AND t.dataFine >= ?1")
    List<Torneo> findAttiviAlTimestamp(OffsetDateTime now);
}
