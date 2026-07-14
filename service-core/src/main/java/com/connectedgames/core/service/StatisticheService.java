package com.connectedgames.core.service;

import com.connectedgames.core.dto.StatisticheGlobaliResponse;
import com.connectedgames.core.repository.LocaleRepository;
import com.connectedgames.core.repository.PartitaRepository;
import com.connectedgames.core.repository.TorneoRepository;
import com.connectedgames.core.repository.UtenteRepository;
import org.springframework.stereotype.Service;

@Service
public class StatisticheService {

    private final LocaleRepository localeRepo;
    private final PartitaRepository partitaRepo;
    private final UtenteRepository utenteRepo;
    private final TorneoRepository torneoRepo;

    public StatisticheService(LocaleRepository localeRepo, PartitaRepository partitaRepo,
                               UtenteRepository utenteRepo, TorneoRepository torneoRepo) {
        this.localeRepo = localeRepo;
        this.partitaRepo = partitaRepo;
        this.utenteRepo = utenteRepo;
        this.torneoRepo = torneoRepo;
    }

    public StatisticheGlobaliResponse getStatisticheGlobali() {
        long totaleLocali = localeRepo.count();
        long totalePartite = partitaRepo.count();
        long totaleGiocatori = utenteRepo.count();
        long totaleTornei = torneoRepo.count();

        return StatisticheGlobaliResponse.of(totaleLocali, totalePartite, totaleGiocatori, totaleTornei);
    }
}
