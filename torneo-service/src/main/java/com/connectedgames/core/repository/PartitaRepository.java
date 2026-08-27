package com.connectedgames.core.repository;

import com.connectedgames.core.entity.Partita;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PartitaRepository extends JpaRepository<Partita, UUID> {

    List<Partita> findByTorneoId(UUID torneoId);
}
