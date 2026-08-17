package com.connectedgames.statistiche.service;

import com.connectedgames.statistiche.dto.StatisticheGlobaliResponse;
import com.connectedgames.statistiche.dto.StatisticheLocaleResponse;
import com.connectedgames.statistiche.dto.StatisticheUtenteResponse;
import com.connectedgames.statistiche.repository.StatisticheRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

// Servizio per la lettura ed aggregazione delle metriche statistiche per Dashboard Super Admin, Locali ed Utenti
@Service
public class StatisticheBackendService {

    private final StatisticheRepository statisticheRepository;

    public StatisticheBackendService(StatisticheRepository statisticheRepository) {
        this.statisticheRepository = statisticheRepository;
    }

    public StatisticheGlobaliResponse getStatisticheGlobali() {
        return getStatisticheGlobali(null, null);
    }

    public StatisticheGlobaliResponse getStatisticheGlobali(Integer giorni, String giocoId) {
        return new StatisticheGlobaliResponse(
                statisticheRepository.countTotalePartite(giorni, giocoId),
                statisticheRepository.countTotaleGiocatoriAttivi(giorni, giocoId),
                statisticheRepository.countTorneiAttivi(),
                statisticheRepository.countTorneiConclusi(),
                statisticheRepository.getTotalePuntiSegnati(giorni, giocoId),
                statisticheRepository.getDurataMediaMinuti(giorni, giocoId),
                statisticheRepository.getLocaliPiuAttivi(5, giorni, giocoId),
                statisticheRepository.getGiochiPiuUtilizzati(5, giorni, giocoId),
                statisticheRepository.getTopGiocatoriVittorie(5, giorni, giocoId),
                statisticheRepository.getTorneiStat(5),
                statisticheRepository.getTrendPartiteTempo(giorni, giocoId),
                statisticheRepository.getTuttiIGiochi()
        );
    }

    public StatisticheLocaleResponse getStatistichePerLocale(String localeId) {
        return statisticheRepository.getStatistichePerLocale(localeId);
    }

    public StatisticheUtenteResponse getStatistichePerUtente(UUID utenteId) {
        return statisticheRepository.getStatistichePerUtente(utenteId);
    }
}
