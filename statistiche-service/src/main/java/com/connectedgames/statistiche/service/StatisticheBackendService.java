package com.connectedgames.statistiche.service;

import com.connectedgames.statistiche.dto.StatisticheGlobaliResponse;
import com.connectedgames.statistiche.repository.StatisticheRepository;
import org.springframework.stereotype.Service;

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
                statisticheRepository.getLocaliPiuAttivi(5),
                statisticheRepository.getGiochiPiuUtilizzati(5)
        );
    }
}
