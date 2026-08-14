package com.connectedgames.core.service;

import com.connectedgames.core.dto.UtenteDetailResponse;
import com.connectedgames.core.dto.UtenteResponse;
import com.connectedgames.core.entity.Utente;
import com.connectedgames.core.exception.ResourceNotFoundException;
import com.connectedgames.core.repository.PartitaRepository;
import com.connectedgames.core.repository.UtenteRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UtenteService {

    private final UtenteRepository utenteRepo;
    private final PartitaRepository partitaRepo;

    public UtenteService(UtenteRepository utenteRepo, PartitaRepository partitaRepo) {
        this.utenteRepo = utenteRepo;
        this.partitaRepo = partitaRepo;
    }

    /**
     * Recupera tutti gli utenti registrati in platform_db, eventualmente filtrati per ruolo.
     */
    @Transactional(readOnly = true)
    public List<UtenteResponse> getAllUtenti(String ruolo) {
        List<Utente> lista = (ruolo != null && !ruolo.isBlank())
            ? utenteRepo.findByRuolo(ruolo)
            : utenteRepo.findAll();

        return lista.stream()
            .map(UtenteResponse::from)
            .toList();
    }

    /**
     * Recupera il dettaglio di un utente con statistiche aggregate.
     */
    @Transactional(readOnly = true)
    public UtenteDetailResponse getUtenteDetail(UUID utenteId) {
        Utente utente = utenteRepo.findById(utenteId).orElseGet(() -> {
            Utente u = new Utente();
            u.setId(utenteId);
            u.setUsername("utente_" + utenteId.toString().substring(0, 8));
            u.setDataRegistrazione(java.time.OffsetDateTime.now());
            return u;
        });

        long totalePartite = partitaRepo.countByGiocatore1IdOrGiocatore2Id(utenteId, utenteId);
        long vittorie = partitaRepo.countVittorieByGiocatoreId(utenteId);
        long sconfitte = partitaRepo.countSconfitteByGiocatoreId(utenteId);

        return UtenteDetailResponse.of(utente, totalePartite, vittorie, sconfitte);
    }
}
