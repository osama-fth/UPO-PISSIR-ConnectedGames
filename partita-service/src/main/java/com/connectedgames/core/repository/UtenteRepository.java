package com.connectedgames.core.repository;

import com.connectedgames.core.entity.Utente;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UtenteRepository extends JpaRepository<Utente, UUID> {

    Optional<Utente> findByUsername(String username);

    List<Utente> findByRuolo(String ruolo);
}
