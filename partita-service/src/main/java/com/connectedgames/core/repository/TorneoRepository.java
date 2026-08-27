package com.connectedgames.core.repository;

import com.connectedgames.core.entity.Torneo;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TorneoRepository extends JpaRepository<Torneo, UUID> {
}
