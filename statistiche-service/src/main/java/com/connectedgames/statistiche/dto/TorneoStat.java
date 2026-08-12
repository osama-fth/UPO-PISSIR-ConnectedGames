package com.connectedgames.statistiche.dto;

import java.util.UUID;

public record TorneoStat(
        UUID torneoId,
        String nome,
        String giocoNome,
        String stato,
        long iscrittiCount,
        long partiteGiocate
) {}
