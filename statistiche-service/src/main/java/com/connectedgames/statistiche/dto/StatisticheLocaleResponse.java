package com.connectedgames.statistiche.dto;

import java.util.List;

public record StatisticheLocaleResponse(
    String localeId,
    long partiteGiocate,
    long giocatoriAttivi,
    String giocoPiuPopolare,
    List<GiocoStat> ripartizioneGiochi,
    long torneiPartecipati,
    long torneiVinti
) {}
