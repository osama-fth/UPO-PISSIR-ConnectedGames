package com.connectedgames.core.repository;

import com.connectedgames.core.entity.IscrizioneTorneo;
import com.connectedgames.core.entity.IscrizioneTorneoId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IscrizioneTorneoRepository extends JpaRepository<IscrizioneTorneo, IscrizioneTorneoId> {

    List<IscrizioneTorneo> findByTorneoId(UUID torneoId);

    boolean existsByIdTorneoIdAndIdUtenteId(UUID torneoId, UUID utenteId);

    @Modifying
    @Query("DELETE FROM IscrizioneTorneo i WHERE i.torneo.id = :torneoId")
    void deleteByTorneoId(@Param("torneoId") UUID torneoId);

    @Modifying
    @Query("DELETE FROM IscrizioneTorneo i WHERE i.torneo.id = :torneoId AND i.utente.id = :utenteId")
    void deleteByTorneoIdAndUtenteId(@Param("torneoId") UUID torneoId, @Param("utenteId") UUID utenteId);
}
