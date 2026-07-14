package com.connectedgames.core.service;

import com.connectedgames.core.dto.PartitaSyncInput;
import com.connectedgames.core.dto.SyncResultResponse;
import com.connectedgames.core.dto.SyncResultResponse.SyncFailure;
import com.connectedgames.core.entity.InstallazioneGioco;
import com.connectedgames.core.entity.Locale;
import com.connectedgames.core.entity.Partita;
import com.connectedgames.core.entity.Torneo;
import com.connectedgames.core.entity.Utente;
import com.connectedgames.core.exception.DuplicatePartitaException;
import com.connectedgames.core.repository.InstallazioneGiocoRepository;
import com.connectedgames.core.repository.LocaleRepository;
import com.connectedgames.core.repository.PartitaRepository;
import com.connectedgames.core.repository.TorneoRepository;
import com.connectedgames.core.repository.UtenteRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PartitaService {

    private static final Logger log = LoggerFactory.getLogger(PartitaService.class);

    private final PartitaRepository partitaRepo;
    private final InstallazioneGiocoRepository installazioneRepo;
    private final LocaleRepository localeRepo;
    private final UtenteRepository utenteRepo;
    private final TorneoRepository torneoRepo;

    public PartitaService(PartitaRepository partitaRepo,
                          InstallazioneGiocoRepository installazioneRepo,
                          LocaleRepository localeRepo,
                          UtenteRepository utenteRepo,
                          TorneoRepository torneoRepo) {
        this.partitaRepo = partitaRepo;
        this.installazioneRepo = installazioneRepo;
        this.localeRepo = localeRepo;
        this.utenteRepo = utenteRepo;
        this.torneoRepo = torneoRepo;
    }

    @Transactional
    public SyncResultResponse sincronizzaPartite(String localeId, List<PartitaSyncInput> partite) {
        List<UUID> salvate = new ArrayList<>();
        List<SyncFailure> fallite = new ArrayList<>();

        for (PartitaSyncInput input : partite) {
            try {
                if (partitaRepo.existsById(input.id())) {
                    throw new DuplicatePartitaException(input.id());
                }

                Partita partita = new Partita();
                partita.setId(input.id());

                InstallazioneGioco installazione = installazioneRepo.findById(input.installazioneId())
                    .orElseThrow(() -> new IllegalArgumentException("Installazione non trovata: " + input.installazioneId()));
                partita.setInstallazione(installazione);

                Locale locale = localeRepo.findById(input.localeId())
                    .orElseThrow(() -> new IllegalArgumentException("Locale non trovato: " + input.localeId()));
                partita.setLocale(locale);

                if (input.giocatore1Id() != null) {
                    Utente g1 = utenteRepo.findById(input.giocatore1Id())
                        .orElse(null);
                    partita.setGiocatore1(g1);
                }

                if (input.giocatore2Id() != null) {
                    Utente g2 = utenteRepo.findById(input.giocatore2Id())
                        .orElse(null);
                    partita.setGiocatore2(g2);
                }

                partita.setPunteggio1(input.punteggio1());
                partita.setPunteggio2(input.punteggio2());
                partita.setDataInizio(input.dataInizio());
                partita.setDataFine(input.dataFine());
                partita.setDataSincronizzazione(OffsetDateTime.now());

                if (input.torneoId() != null) {
                    Optional<Torneo> torneo = torneoRepo.findById(input.torneoId());
                    torneo.ifPresent(partita::setTorneo);
                }

                partitaRepo.save(partita);
                salvate.add(input.id());
                log.debug("Partita {} salvata con successo", input.id());

            } catch (DuplicatePartitaException e) {
                log.warn("Partita {} già presente, saltata (idempotenza)", input.id());
                salvate.add(input.id());
            } catch (Exception e) {
                log.error("Errore salvataggio partita {}: {}", input.id(), e.getMessage());
                fallite.add(new SyncFailure(input.id(), e.getMessage()));
            }
        }

        return SyncResultResponse.of(salvate, fallite);
    }
}
