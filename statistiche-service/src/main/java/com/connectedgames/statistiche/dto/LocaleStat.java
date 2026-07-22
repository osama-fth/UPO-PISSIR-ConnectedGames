package com.connectedgames.statistiche.dto;

public record LocaleStat(
        String localeId,
        String nomeLocale,
        long partiteGiocate
) {}
