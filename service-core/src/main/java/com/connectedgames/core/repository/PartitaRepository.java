package com.connectedgames.core.repository;

import com.connectedgames.core.entity.Partita;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PartitaRepository extends JpaRepository<Partita, UUID> {

    List<Partita> findByLocaleId(String localeId);

    List<Partita> findByTorneoId(UUID torneoId);

    List<Partita> findByTorneoIdOrderByPunteggio1Desc(UUID torneoId);

    long countByLocaleId(String localeId);

    long countByGiocatore1IdOrGiocatore2Id(UUID giocatore1Id, UUID giocatore2Id);

    boolean existsById(UUID id);
}
