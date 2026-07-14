package com.connectedgames.core.repository;

import com.connectedgames.core.entity.InstallazioneGioco;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InstallazioneGiocoRepository extends JpaRepository<InstallazioneGioco, String> {

    List<InstallazioneGioco> findByLocaleIdAndStatoAttivita(String localeId, String statoAttivita);

    List<InstallazioneGioco> findByLocaleId(String localeId);
}
