package com.connectedgames.core.dto;

import java.util.List;
import java.util.UUID;

public record ClassificaTorneoResponse(
    String torneoId,
    String torneoNome,
    List<VoceClassificaLocale> classificaLocali,
    List<VoceClassificaGiocatore> classificaGiocatori
) {

    public static ClassificaTorneoResponse of(String torneoId, String torneoNome,
                                               List<VoceClassificaLocale> classificaLocali,
                                               List<VoceClassificaGiocatore> classificaGiocatori) {
        return new ClassificaTorneoResponse(torneoId, torneoNome, classificaLocali, classificaGiocatori);
    }

    public record VoceClassificaLocale(
        int posizione,
        String localeId,
        String localeNome,
        long partiteGiocate,
        int partiteVinte,
        double percentualeVittorie,
        String metricaClassifica
    ) {}

    public record VoceClassificaGiocatore(
        int posizione,
        UUID utenteId,
        String username,
        String localeId,
        String localeNome,
        long partiteGiocate,
        int partiteVinte,
        double percentualeVittorie,
        String metricaClassifica
    ) {}
}
