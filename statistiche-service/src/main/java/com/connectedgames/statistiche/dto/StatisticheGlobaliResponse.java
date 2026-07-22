package com.connectedgames.statistiche.dto;

import java.util.List;

public record StatisticheGlobaliResponse(
        long totalePartiteGiocate,
        long totaleGiocatoriAttivi,
        List<LocaleStat> localiPiuAttivi,
        List<GiocoStat> giochiPiuUtilizzati
) {}
