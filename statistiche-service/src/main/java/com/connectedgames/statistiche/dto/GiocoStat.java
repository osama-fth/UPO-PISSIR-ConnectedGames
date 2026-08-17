package com.connectedgames.statistiche.dto;

public record GiocoStat(
        String giocoId,
        String giocoTipo,
        long partiteGiocate
) {}
