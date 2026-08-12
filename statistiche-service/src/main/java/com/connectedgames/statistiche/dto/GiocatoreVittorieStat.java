package com.connectedgames.statistiche.dto;

import java.util.UUID;

public record GiocatoreVittorieStat(
        UUID utenteId,
        String username,
        long partiteGiocate,
        long partiteVinte,
        double percentualeVittorie
) {}
