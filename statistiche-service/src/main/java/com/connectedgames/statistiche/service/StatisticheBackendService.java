package com.connectedgames.statistiche.service;

import com.connectedgames.statistiche.dto.StatisticheGlobaliResponse;
import com.connectedgames.statistiche.dto.StatisticheLocaleResponse;
import com.connectedgames.statistiche.dto.StatisticheUtenteResponse;
import com.connectedgames.statistiche.repository.StatisticheRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StatisticheBackendService {

    private final StatisticheRepository statisticheRepository;

    public StatisticheBackendService(StatisticheRepository statisticheRepository) {
        this.statisticheRepository = statisticheRepository;
    }

    public StatisticheGlobaliResponse getStatisticheGlobali() {
        return new StatisticheGlobaliResponse(
                statisticheRepository.countTotalePartite(),
                statisticheRepository.countTotaleGiocatoriAttivi(),
                statisticheRepository.countTorneiAttivi(),
                statisticheRepository.countTorneiConclusi(),
                statisticheRepository.getTotalePuntiSegnati(),
                statisticheRepository.getDurataMediaMinuti(),
                statisticheRepository.getLocaliPiuAttivi(5),
                statisticheRepository.getGiochiPiuUtilizzati(5),
                statisticheRepository.getTopGiocatoriVittorie(5),
                statisticheRepository.getTorneiStat(5)
        );
    }

    public StatisticheLocaleResponse getStatistichePerLocale(String localeId) {
        return statisticheRepository.getStatistichePerLocale(localeId);
    }

    public StatisticheUtenteResponse getStatistichePerUtente(UUID utenteId) {
        return statisticheRepository.getStatistichePerUtente(utenteId);
    }
}
