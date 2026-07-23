package com.connectedgames.core.repository;

import com.connectedgames.core.entity.IscrizioneTorneo;
import com.connectedgames.core.entity.IscrizioneTorneoId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IscrizioneTorneoRepository extends JpaRepository<IscrizioneTorneo, IscrizioneTorneoId> {

    List<IscrizioneTorneo> findByTorneoId(UUID torneoId);

    List<IscrizioneTorneo> findByUtenteId(UUID utenteId);

    boolean existsByIdTorneoIdAndIdUtenteId(UUID torneoId, UUID utenteId);
}
