package com.connectedgames.core.service;

import com.connectedgames.core.dto.ClassificaTorneoResponse;
import com.connectedgames.core.dto.ClassificaTorneoResponse.VoceClassifica;
import com.connectedgames.core.dto.TorneoResponse;
import com.connectedgames.core.entity.Partita;
import com.connectedgames.core.entity.Torneo;
import com.connectedgames.core.exception.ResourceNotFoundException;
import com.connectedgames.core.repository.PartitaRepository;
import com.connectedgames.core.repository.TorneoRepository;
import com.connectedgames.core.dto.IscrizioneTorneoResponse;
import com.connectedgames.core.dto.TorneoCreateInput;
import com.connectedgames.core.entity.Gioco;
import com.connectedgames.core.entity.IscrizioneTorneo;
import com.connectedgames.core.entity.IscrizioneTorneoId;
import com.connectedgames.core.entity.Locale;
import com.connectedgames.core.entity.Utente;
import com.connectedgames.core.repository.GiocoRepository;
import com.connectedgames.core.repository.IscrizioneTorneoRepository;
import com.connectedgames.core.repository.LocaleRepository;
import com.connectedgames.core.repository.UtenteRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Servizio di gestione dei tornei, calcolo lazy delle classifiche ed iscrizioni dei giocatori
@Service
public class TorneoService {

    private final TorneoRepository torneoRepo;
    private final PartitaRepository partitaRepo;
    private final GiocoRepository giocoRepo;
    private final LocaleRepository localeRepo;
    private final UtenteRepository utenteRepo;
    private final IscrizioneTorneoRepository iscrizioneRepo;

    public TorneoService(TorneoRepository torneoRepo, PartitaRepository partitaRepo,
                         GiocoRepository giocoRepo, LocaleRepository localeRepo,
                         UtenteRepository utenteRepo, IscrizioneTorneoRepository iscrizioneRepo) {
        this.torneoRepo = torneoRepo;
        this.partitaRepo = partitaRepo;
        this.giocoRepo = giocoRepo;
        this.localeRepo = localeRepo;
        this.utenteRepo = utenteRepo;
        this.iscrizioneRepo = iscrizioneRepo;
    }

    @Transactional(readOnly = true)
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
                t.getDataFine(),
                t.getLocali() != null
                    ? t.getLocali().stream().map(l -> l.getId()).toList()
                    : List.of()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public TorneoResponse getTorneoById(UUID torneoId) {
        Torneo t = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));
        List<String> localiIds = t.getLocali() != null
            ? t.getLocali().stream().map(l -> l.getId()).toList()
            : List.of();
        return TorneoResponse.of(
            t.getId(), t.getNome(), t.getGioco().getNome().toUpperCase(),
            calcolaStatoLazy(t), t.getDataInizio(), t.getDataFine(), localiIds
        );
    }

    @Transactional
    public TorneoResponse creaTorneo(TorneoCreateInput input) {
        Torneo t = new Torneo();
        t.setId(UUID.randomUUID());
        t.setNome(input.nome());
        t.setStato("ATTIVO");
        t.setDataInizio(input.dataInizio());
        t.setDataFine(input.dataFine());

        Gioco gioco = giocoRepo.findById(input.giocoId())
            .orElseThrow(() -> new IllegalArgumentException("Gioco non trovato"));
        t.setGioco(gioco);

        Set<Locale> locali = new HashSet<>();
        for (String locId : input.localiId()) {
            Locale loc = localeRepo.findById(locId)
                .orElseThrow(() -> new IllegalArgumentException("Locale non trovato: " + locId));
            locali.add(loc);
        }
        t.setLocali(locali);

        torneoRepo.save(t);

        List<String> localiIds = t.getLocali() != null
            ? t.getLocali().stream().map(l -> l.getId()).toList()
            : List.of();
        return TorneoResponse.of(t.getId(), t.getNome(), t.getGioco().getNome().toUpperCase(), t.getStato(), t.getDataInizio(), t.getDataFine(), localiIds);
    }

    // Iscrive un utente al torneo con auto-registrazione automatica in platform_db se non ancora presente
    @Transactional
    public IscrizioneTorneoResponse iscriviGiocatore(UUID torneoId, UUID utenteId) {
        Torneo torneo = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));

        Utente utente = utenteRepo.findById(utenteId)
            .orElseGet(() -> {
                String username = null;
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth instanceof JwtAuthenticationToken jwtAuth) {
                    Jwt jwt = jwtAuth.getToken();
                    username = jwt.getClaimAsString("preferred_username");
                    if (username == null) {
                        username = jwt.getClaimAsString("username");
                    }
                }
                if (username == null || username.isBlank()) {
                    username = "user_" + utenteId.toString().substring(0, 8);
                }
                Utente nuovo = new Utente();
                nuovo.setId(utenteId);
                nuovo.setUsername(username);
                nuovo.setDataRegistrazione(OffsetDateTime.now());
                return utenteRepo.saveAndFlush(nuovo);
            });

        if (iscrizioneRepo.existsByIdTorneoIdAndIdUtenteId(torneoId, utenteId)) {
            throw new IllegalArgumentException("Utente già iscritto a questo torneo");
        }

        String stato = calcolaStatoLazy(torneo);
        if ("CONCLUSO".equals(stato)) {
            throw new IllegalArgumentException("Impossibile iscriversi: il torneo è già concluso");
        }

        IscrizioneTorneo iscrizione = new IscrizioneTorneo();
        iscrizione.setId(new IscrizioneTorneoId(torneoId, utenteId));
        iscrizione.setTorneo(torneo);
        iscrizione.setUtente(utente);
        iscrizione.setDataIscrizione(OffsetDateTime.now());

        iscrizione = iscrizioneRepo.save(iscrizione);
        return IscrizioneTorneoResponse.from(iscrizione);
    }

    @Transactional(readOnly = true)
    public List<IscrizioneTorneoResponse> getIscritti(UUID torneoId) {
        if (!torneoRepo.existsById(torneoId)) {
            throw new ResourceNotFoundException("Torneo", torneoId.toString());
        }
        return iscrizioneRepo.findByTorneoId(torneoId).stream()
            .map(IscrizioneTorneoResponse::from)
            .toList();
    }

    // Calcola live la classifica del torneo ordinando per percentuale vittorie, vittorie e partite giocate
    @Transactional(readOnly = true)
    public ClassificaTorneoResponse getClassifica(UUID torneoId) {
        Torneo torneo = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));

        List<Partita> partite = partitaRepo.findByTorneoId(torneoId);

        class Stat {
            int giocate = 0;
            int vinte = 0;
        }

        Map<String, Stat> stats = new HashMap<>();

        for (Partita p : partite) {
            if (p.getGiocatore1() != null) {
                String name = p.getGiocatore1().getUsername();
                stats.putIfAbsent(name, new Stat());
                stats.get(name).giocate++;
                if (p.getPunteggio1() > p.getPunteggio2()) {
                    stats.get(name).vinte++;
                }
            }
            if (p.getGiocatore2() != null) {
                String name = p.getGiocatore2().getUsername();
                stats.putIfAbsent(name, new Stat());
                stats.get(name).giocate++;
                if (p.getPunteggio2() > p.getPunteggio1()) {
                    stats.get(name).vinte++;
                }
            }
        }

        List<VoceClassifica> classifica = new ArrayList<>();
        for (Map.Entry<String, Stat> entry : stats.entrySet()) {
            Stat s = entry.getValue();
            double perc = s.giocate > 0 ? (double) s.vinte / s.giocate * 100 : 0.0;
            double roundedPerc = Math.round(perc * 100.0) / 100.0;
            String metrica = s.vinte + " vinte (" + Math.round(roundedPerc) + "%)";
            String playerUsername = entry.getKey();
            classifica.add(new VoceClassifica(0, playerUsername, s.giocate, s.vinte, roundedPerc, metrica));
        }

        classifica.sort(Comparator.comparingDouble(VoceClassifica::percentualeVittorie).reversed()
            .thenComparingInt(VoceClassifica::partiteVinte).reversed()
            .thenComparingLong(VoceClassifica::partiteGiocate).reversed());

        List<VoceClassifica> classificaFinale = new ArrayList<>();
        for (int i = 0; i < classifica.size(); i++) {
            VoceClassifica v = classifica.get(i);
            classificaFinale.add(new VoceClassifica(i + 1, v.username(), v.partiteGiocate(), v.partiteVinte(), v.percentualeVittorie(), v.metricaClassifica()));
        }

        return ClassificaTorneoResponse.of(
            torneoId.toString(),
            torneo.getNome(),
            classificaFinale
        );
    }

    @Transactional
    public void cancellaTorneo(UUID torneoId) {
        Torneo torneo = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));

        if (!"NON_ATTIVO".equals(calcolaStatoLazy(torneo))) {
            throw new IllegalStateException("Il torneo può essere cancellato solo se non è ancora iniziato");
        }

        iscrizioneRepo.deleteByTorneoId(torneoId);
        torneoRepo.delete(torneo);
    }

    @Transactional
    public void disiscriviGiocatore(UUID torneoId, UUID utenteId) {
        Torneo torneo = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));

        if (!"NON_ATTIVO".equals(calcolaStatoLazy(torneo))) {
            throw new IllegalStateException("La disiscrizione è possibile solo se il torneo non è ancora iniziato");
        }

        if (!iscrizioneRepo.existsByIdTorneoIdAndIdUtenteId(torneoId, utenteId)) {
            throw new ResourceNotFoundException("Iscrizione", utenteId.toString());
        }

        iscrizioneRepo.deleteByTorneoIdAndUtenteId(torneoId, utenteId);
    }

    // Calcola dinamica del valore di stato (NON_ATTIVO, ATTIVO, CONCLUSO) rispetto all'ora corrente
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
