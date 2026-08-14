package com.connectedgames.core.service;

import com.connectedgames.core.dto.PartitaDetailResponse;
import com.connectedgames.core.dto.PartitaSyncInput;
import com.connectedgames.core.dto.SyncResultResponse;
import com.connectedgames.core.dto.SyncResultResponse.SyncFailure;
import com.connectedgames.core.entity.InstallazioneGioco;
import com.connectedgames.core.entity.Locale;
import com.connectedgames.core.entity.Partita;
import com.connectedgames.core.entity.Torneo;
import com.connectedgames.core.entity.Utente;
import com.connectedgames.core.exception.DuplicatePartitaException;
import com.connectedgames.core.exception.ResourceNotFoundException;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Servizio di gestione e sincronizzazione delle partite con auto-registrazione automatica degli utenti
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

    // Processa il caricamento massivo delle partite dagli Edge Node garantendo l'idempotenza
    @Transactional
    public SyncResultResponse sincronizzaPartite(String localeId, List<PartitaSyncInput> partite) {
        List<UUID> salvate = new ArrayList<>();
        List<SyncFailure> fallite = new ArrayList<>();

        for (PartitaSyncInput input : partite) {
            try {
                if (localeId != null && !localeId.equalsIgnoreCase(input.localeId())) {
                    throw new IllegalArgumentException("localeId del payload ('" + input.localeId() + "') non corrisponde a quello del path ('" + localeId + "')");
                }

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
                    Utente g1 = trovaORegistraUtente(input.giocatore1Id(), input.giocatore1Username());
                    partita.setGiocatore1(g1);
                }

                if (input.giocatore2Id() != null) {
                    Utente g2 = trovaORegistraUtente(input.giocatore2Id(), input.giocatore2Username());
                    partita.setGiocatore2(g2);
                }

                partita.setPunteggio1(input.punteggio1());
                partita.setPunteggio2(input.punteggio2());
                partita.setDataInizio(input.dataInizio());
                partita.setDataFine(input.dataFine());
                partita.setDataSincronizzazione(OffsetDateTime.now());

                if (input.torneoId() != null) {
                    Optional<Torneo> torneoOpt = torneoRepo.findById(input.torneoId());
                    if (torneoOpt.isPresent()) {
                        Torneo torneo = torneoOpt.get();
                        OffsetDateTime now = OffsetDateTime.now();

                        boolean inTime = !now.isBefore(torneo.getDataInizio()) && !now.isAfter(torneo.getDataFine());
                        long iscritti = partitaRepo.countIscrizioniByTorneoIdAndGiocatoriId(torneo.getId(), input.giocatore1Id(), input.giocatore2Id());
                        boolean bothEnrolled = (iscritti == 2);
                        
                        if (input.giocatore1Id() == null || input.giocatore2Id() == null) {
                            bothEnrolled = false;
                        }

                        if (inTime && bothEnrolled) {
                            partita.setTorneo(torneo);
                        } else {
                            log.warn("Partita {} declassata in amichevole. Validazione torneo fallita (inTime={}, bothEnrolled={})", input.id(), inTime, bothEnrolled);
                        }
                    }
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

    // Auto-registra l'utente in platform_db se presente solo in Keycloak ma non ancora nel database locale
    private Utente trovaORegistraUtente(UUID keycloakSub, String username) {
        Optional<Utente> existing = utenteRepo.findById(keycloakSub);
        if (existing.isPresent()) {
            return existing.get();
        }

        Utente nuovo = new Utente();
        nuovo.setId(keycloakSub);
        nuovo.setUsername(username != null ? username : "user_" + keycloakSub.toString().substring(0, 8));
        nuovo.setEmail(null);
        nuovo.setRuolo("giocatore");
        nuovo.setDataRegistrazione(OffsetDateTime.now());

        Utente salvato = utenteRepo.saveAndFlush(nuovo);
        log.info("Utente {} ({}) auto-registrato in platform_db", salvato.getUsername(), salvato.getId());
        return salvato;
    }

    // Recupera la lista delle partite filtrate per locale, gioco o giocatore con ordinamento decrescente per data
    @Transactional(readOnly = true)
    public Page<PartitaDetailResponse> getPartite(String localeId, String giocoId, UUID giocatoreId,
                                                   int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dataFine"));
        Page<Partita> partite;

        if (giocatoreId != null) {
            partite = partitaRepo.findByGiocatoreId(giocatoreId, pageable);
        } else if (localeId != null && giocoId != null) {
            partite = partitaRepo.findByLocaleIdAndGiocoId(localeId, giocoId, pageable);
        } else if (localeId != null) {
            partite = partitaRepo.findByLocaleId(localeId, pageable);
        } else if (giocoId != null) {
            partite = partitaRepo.findByGiocoId(giocoId, pageable);
        } else {
            partite = partitaRepo.findAll(pageable);
        }

        return partite.map(PartitaDetailResponse::from);
    }

    @Transactional(readOnly = true)
    public PartitaDetailResponse getPartitaById(UUID partitaId) {
        Partita partita = partitaRepo.findById(partitaId)
            .orElseThrow(() -> new ResourceNotFoundException("Partita", partitaId.toString()));
        return PartitaDetailResponse.from(partita);
    }

    @Transactional(readOnly = true)
    public Page<PartitaDetailResponse> getPartiteByUtente(UUID utenteId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dataFine"));
        return partitaRepo.findByGiocatoreId(utenteId, pageable)
            .map(PartitaDetailResponse::from);
    }
}
