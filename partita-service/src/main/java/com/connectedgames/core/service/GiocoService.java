package com.connectedgames.core.service;

import com.connectedgames.core.dto.GiocoInstallatoResponse;
import com.connectedgames.core.entity.InstallazioneGioco;
import com.connectedgames.core.exception.ResourceNotFoundException;
import com.connectedgames.core.repository.InstallazioneGiocoRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class GiocoService {

    private final InstallazioneGiocoRepository installazioneRepo;

    public GiocoService(InstallazioneGiocoRepository installazioneRepo) {
        this.installazioneRepo = installazioneRepo;
    }

    public List<GiocoInstallatoResponse> getGiochiByLocale(String localeId) {
        List<InstallazioneGioco> installazioni = installazioneRepo.findByLocaleIdAndStatoAttivita(localeId, "ATTIVO");

        if (installazioni.isEmpty()) {
            List<InstallazioneGioco> tutte = installazioneRepo.findByLocaleId(localeId);
            if (tutte.isEmpty()) {
                throw new ResourceNotFoundException("Locale", localeId);
            }
        }

        return installazioni.stream()
            .map(inst -> GiocoInstallatoResponse.of(
                inst.getId(),
                inst.getGioco().getNome().toUpperCase()
            ))
            .toList();
    }
}
