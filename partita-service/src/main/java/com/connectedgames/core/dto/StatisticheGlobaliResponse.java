package com.connectedgames.core.dto;

public record StatisticheGlobaliResponse(
    long totaleLocali,
    long totalePartite,
    long totaleGiocatori,
    long totaleTornei
) {

    public static StatisticheGlobaliResponse of(long totaleLocali, long totalePartite,
                                                  long totaleGiocatori, long totaleTornei) {
        return new StatisticheGlobaliResponse(totaleLocali, totalePartite, totaleGiocatori, totaleTornei);
    }
}
