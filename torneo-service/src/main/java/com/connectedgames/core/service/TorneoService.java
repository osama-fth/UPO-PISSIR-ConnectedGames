package com.connectedgames.core.service;

import com.connectedgames.core.dto.ClassificaTorneoResponse;
import com.connectedgames.core.dto.ClassificaTorneoResponse.VoceClassifica;
import com.connectedgames.core.dto.TorneoResponse;
import com.connectedgames.core.entity.Partita;
import com.connectedgames.core.entity.Torneo;
import com.connectedgames.core.exception.ResourceNotFoundException;
import com.connectedgames.core.repository.PartitaRepository;
import com.connectedgames.core.repository.TorneoRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class TorneoService {

    private final TorneoRepository torneoRepo;
    private final PartitaRepository partitaRepo;

    public TorneoService(TorneoRepository torneoRepo, PartitaRepository partitaRepo) {
        this.torneoRepo = torneoRepo;
        this.partitaRepo = partitaRepo;
    }

    public List<TorneoResponse> getTornei(String stato) {
        List<Torneo> tornei;

        if (stato != null && !stato.isBlank()) {
            if ("ATTIVO".equalsIgnoreCase(stato)) {
                tornei = torneoRepo.findAttiviAlTimestamp(OffsetDateTime.now());
            } else {
                tornei = torneoRepo.findByStato(stato.toUpperCase());
            }
        } else {
            tornei = torneoRepo.findAll();
        }

        return tornei.stream()
            .map(t -> TorneoResponse.of(
                t.getId(),
                t.getNome(),
                t.getGioco().getNome().toUpperCase(),
                calcolaStatoLazy(t),
                t.getDataInizio(),
                t.getDataFine()
            ))
            .toList();
    }

    public ClassificaTorneoResponse getClassifica(UUID torneoId) {
        Torneo torneo = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));

        List<Partita> partite = partitaRepo.findByTorneoId(torneoId);

        // Aggrega per giocatore (usando giocatore1 come riferimento)
        // In uno scenario reale si userebbero entrambi i giocatori
        Map<String, List<Partita>> partitePerGiocatore = partite.stream()
            .filter(p -> p.getGiocatore1() != null)
            .collect(Collectors.groupingBy(
                p -> p.getGiocatore1().getUsername(),
                LinkedHashMap::new,
                Collectors.toList()
            ));

        List<VoceClassifica> classifica = new ArrayList<>();
        for (Map.Entry<String, List<Partita>> entry : partitePerGiocatore.entrySet()) {
            long partiteGiocate = entry.getValue().size();
            long partiteVinte = entry.getValue().stream()
                .filter(p -> p.getPunteggio1() > p.getPunteggio2())
                .count();
            double percentualeVittorie = partiteGiocate > 0
                ? (double) partiteVinte / partiteGiocate * 100
                : 0.0;

            classifica.add(new VoceClassifica(0, entry.getKey(), partiteGiocate, (int) partiteVinte, percentualeVittorie));
        }

        // Ordina per percentuale vittorie decrescente
        classifica.sort(Comparator.comparingDouble(VoceClassifica::percentualeVittorie).reversed());

        // Assegna posizioni
        List<VoceClassifica> classificaFinale = new ArrayList<>();
        for (int i = 0; i < classifica.size(); i++) {
            VoceClassifica v = classifica.get(i);
            classificaFinale.add(new VoceClassifica(i + 1, v.giocatoreNome(), v.partiteGiocate(), v.partiteVinte(), v.percentualeVittorie()));
        }

        return ClassificaTorneoResponse.of(
            torneoId.toString(),
            torneo.getNome(),
            classificaFinale
        );
    }

    private String calcolaStatoLazy(Torneo torneo) {
        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(torneo.getDataInizio())) {
            return "NON_ATTIVO";
        } else if (now.isAfter(torneo.getDataFine())) {
            return "CONCLUSO";
        }
        return "ATTIVO";
    }
}
