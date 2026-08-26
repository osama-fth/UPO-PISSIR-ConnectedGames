package com.connectedgames.core.service;

import com.connectedgames.core.dto.ClassificaTorneoResponse;
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
        if (input.localiId() != null && !input.localiId().isEmpty()) {
            for (String locId : input.localiId()) {
                Locale loc = localeRepo.findById(locId)
                    .orElseThrow(() -> new IllegalArgumentException("Locale non trovato: " + locId));
                locali.add(loc);
            }
        } else {
            locali.addAll(localeRepo.findAll());
        }
        t.setLocali(locali);

        torneoRepo.save(t);

        List<String> localiIds = t.getLocali() != null
            ? t.getLocali().stream().map(l -> l.getId()).toList()
            : List.of();
        return TorneoResponse.of(t.getId(), t.getNome(), t.getGioco().getNome().toUpperCase(), t.getStato(), t.getDataInizio(), t.getDataFine(), localiIds);
    }

    // Iscrive un utente al torneo a nome di un locale con auto-registrazione automatica in platform_db se non ancora presente
    @Transactional
    public IscrizioneTorneoResponse iscriviGiocatore(UUID torneoId, UUID utenteId, String localeId) {
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

        Locale locale = localeRepo.findById(localeId)
            .orElseThrow(() -> new ResourceNotFoundException("Locale", localeId));

        if (torneo.getLocali() != null && !torneo.getLocali().isEmpty() && torneo.getLocali().stream().noneMatch(l -> l.getId().equals(localeId))) {
            throw new IllegalArgumentException("Il locale " + localeId + " non partecipa a questo torneo");
        }

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
        iscrizione.setLocale(locale);
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

    // Calcola live la classifica del torneo per Locali e per Giocatori
    @Transactional(readOnly = true)
    public ClassificaTorneoResponse getClassifica(UUID torneoId) {
        Torneo torneo = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));

        List<IscrizioneTorneo> iscritti = iscrizioneRepo.findByTorneoId(torneoId);
        Map<UUID, IscrizioneTorneo> iscrizioniMap = new HashMap<>();
        for (IscrizioneTorneo i : iscritti) {
            iscrizioniMap.put(i.getUtente().getId(), i);
        }

        class Stat {
            int giocate = 0;
            int vinte = 0;
        }

        Map<String, Locale> localeObjMap = new HashMap<>();
        if (torneo.getLocali() != null) {
            for (Locale l : torneo.getLocali()) {
                localeObjMap.put(l.getId(), l);
            }
        }
        for (IscrizioneTorneo i : iscritti) {
            if (i.getLocale() != null) {
                localeObjMap.put(i.getLocale().getId(), i.getLocale());
            }
        }

        Map<String, Stat> localeStats = new HashMap<>();
        for (String locId : localeObjMap.keySet()) {
            localeStats.put(locId, new Stat());
        }

        Map<UUID, Stat> playerStats = new HashMap<>();
        for (IscrizioneTorneo i : iscritti) {
            playerStats.put(i.getUtente().getId(), new Stat());
        }

        List<Partita> partite = partitaRepo.findByTorneoId(torneoId);
        for (Partita p : partite) {
            boolean g1Win = p.getPunteggio1() > p.getPunteggio2();
            boolean g2Win = p.getPunteggio2() > p.getPunteggio1();

            if (p.getGiocatore1() != null) {
                UUID g1Id = p.getGiocatore1().getId();
                IscrizioneTorneo isc1 = iscrizioniMap.get(g1Id);
                if (isc1 != null) {
                    Stat ps = playerStats.get(g1Id);
                    if (ps != null) {
                        ps.giocate++;
                        if (g1Win) ps.vinte++;
                    }
                    if (isc1.getLocale() != null) {
                        String locId = isc1.getLocale().getId();
                        Stat ls = localeStats.computeIfAbsent(locId, k -> new Stat());
                        ls.giocate++;
                        if (g1Win) ls.vinte++;
                    }
                }
            }

            if (p.getGiocatore2() != null) {
                UUID g2Id = p.getGiocatore2().getId();
                IscrizioneTorneo isc2 = iscrizioniMap.get(g2Id);
                if (isc2 != null) {
                    Stat ps = playerStats.get(g2Id);
                    if (ps != null) {
                        ps.giocate++;
                        if (g2Win) ps.vinte++;
                    }
                    if (isc2.getLocale() != null) {
                        String locId = isc2.getLocale().getId();
                        Stat ls = localeStats.computeIfAbsent(locId, k -> new Stat());
                        ls.giocate++;
                        if (g2Win) ls.vinte++;
                    }
                }
            }
        }

        // 1. Classifica Locali
        List<ClassificaTorneoResponse.VoceClassificaLocale> listLocali = new ArrayList<>();
        for (Map.Entry<String, Stat> entry : localeStats.entrySet()) {
            String locId = entry.getKey();
            Stat s = entry.getValue();
            Locale loc = localeObjMap.get(locId);
            String nomeLocale = loc != null ? loc.getNome() : locId;
            double perc = s.giocate > 0 ? (double) s.vinte / s.giocate * 100 : 0.0;
            double roundedPerc = Math.round(perc * 100.0) / 100.0;
            String metrica = s.vinte + " vinte (" + Math.round(roundedPerc) + "%)";
            listLocali.add(new ClassificaTorneoResponse.VoceClassificaLocale(0, locId, nomeLocale, s.giocate, s.vinte, roundedPerc, metrica));
        }

        listLocali.sort(Comparator.comparingDouble(ClassificaTorneoResponse.VoceClassificaLocale::percentualeVittorie).reversed()
            .thenComparingInt(ClassificaTorneoResponse.VoceClassificaLocale::partiteVinte).reversed()
            .thenComparingLong(ClassificaTorneoResponse.VoceClassificaLocale::partiteGiocate).reversed());

        List<ClassificaTorneoResponse.VoceClassificaLocale> classificaLocali = new ArrayList<>();
        for (int i = 0; i < listLocali.size(); i++) {
            ClassificaTorneoResponse.VoceClassificaLocale v = listLocali.get(i);
            classificaLocali.add(new ClassificaTorneoResponse.VoceClassificaLocale(i + 1, v.localeId(), v.localeNome(), v.partiteGiocate(), v.partiteVinte(), v.percentualeVittorie(), v.metricaClassifica()));
        }

        // 2. Classifica Giocatori
        List<ClassificaTorneoResponse.VoceClassificaGiocatore> listGiocatori = new ArrayList<>();
        for (IscrizioneTorneo i : iscritti) {
            UUID uId = i.getUtente().getId();
            Stat s = playerStats.getOrDefault(uId, new Stat());
            double perc = s.giocate > 0 ? (double) s.vinte / s.giocate * 100 : 0.0;
            double roundedPerc = Math.round(perc * 100.0) / 100.0;
            String metrica = s.vinte + " vinte (" + Math.round(roundedPerc) + "%)";
            String locId = i.getLocale() != null ? i.getLocale().getId() : null;
            String locNome = i.getLocale() != null ? i.getLocale().getNome() : null;
            listGiocatori.add(new ClassificaTorneoResponse.VoceClassificaGiocatore(0, uId, i.getUtente().getUsername(), locId, locNome, s.giocate, s.vinte, roundedPerc, metrica));
        }

        listGiocatori.sort(Comparator.comparingDouble(ClassificaTorneoResponse.VoceClassificaGiocatore::percentualeVittorie).reversed()
            .thenComparingInt(ClassificaTorneoResponse.VoceClassificaGiocatore::partiteVinte).reversed()
            .thenComparingLong(ClassificaTorneoResponse.VoceClassificaGiocatore::partiteGiocate).reversed());

        List<ClassificaTorneoResponse.VoceClassificaGiocatore> classificaGiocatori = new ArrayList<>();
        for (int i = 0; i < listGiocatori.size(); i++) {
            ClassificaTorneoResponse.VoceClassificaGiocatore v = listGiocatori.get(i);
            classificaGiocatori.add(new ClassificaTorneoResponse.VoceClassificaGiocatore(i + 1, v.utenteId(), v.username(), v.localeId(), v.localeNome(), v.partiteGiocate(), v.partiteVinte(), v.percentualeVittorie(), v.metricaClassifica()));
        }

        return ClassificaTorneoResponse.of(
            torneoId.toString(),
            torneo.getNome(),
            classificaLocali,
            classificaGiocatori
        );
    }

    @Transactional
    public void cancellaTorneo(UUID torneoId) {
        Torneo torneo = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));

        iscrizioneRepo.deleteByTorneoId(torneoId);
        torneoRepo.delete(torneo);
    }

    @Transactional
    public void disiscriviGiocatore(UUID torneoId, UUID utenteId) {
        Torneo torneo = torneoRepo.findById(torneoId)
            .orElseThrow(() -> new ResourceNotFoundException("Torneo", torneoId.toString()));

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
