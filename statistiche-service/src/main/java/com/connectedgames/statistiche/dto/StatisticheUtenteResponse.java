package com.connectedgames.statistiche.dto;

import java.util.UUID;

public record StatisticheUtenteResponse(
    UUID utenteId,
    long partiteGiocate,
    long partiteVinte,
    long partitePerse,
    double percentualeVittorie,
    long torneiPartecipati
) {}
