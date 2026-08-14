package com.connectedgames.statistiche.dto;

import java.util.List;

public record StatisticheGlobaliResponse(
        long totalePartiteGiocate,
        long totaleGiocatoriAttivi,
        long totaleTorneiAttivi,
        long totaleTorneiConclusi,
        long totalePuntiSegnati,
        double durataMediaMinuti,
        List<LocaleStat> localiPiuAttivi,
        List<GiocoStat> giochiPiuUtilizzati,
        List<GiocatoreVittorieStat> topGiocatoriVittorie,
        List<TorneoStat> torneiStat,
        List<PartiteTempoStat> trendPartite
) {}
