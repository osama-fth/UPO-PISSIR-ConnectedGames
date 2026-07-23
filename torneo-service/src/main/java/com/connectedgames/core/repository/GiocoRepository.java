package com.connectedgames.core.repository;

import com.connectedgames.core.entity.Gioco;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GiocoRepository extends JpaRepository<Gioco, String> {
}
