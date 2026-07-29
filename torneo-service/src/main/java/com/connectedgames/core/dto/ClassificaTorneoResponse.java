package com.connectedgames.core.dto;

import java.util.List;

public record ClassificaTorneoResponse(
    String torneoId,
    String torneoNome,
    List<VoceClassifica> classifica
) {

    public static ClassificaTorneoResponse of(String torneoId, String torneoNome, List<VoceClassifica> classifica) {
        return new ClassificaTorneoResponse(torneoId, torneoNome, classifica);
    }

    public record VoceClassifica(
        int posizione,
        String username,
        long partiteGiocate,
        int partiteVinte,
        double percentualeVittorie,
        String metricaClassifica
    ) {}
}
