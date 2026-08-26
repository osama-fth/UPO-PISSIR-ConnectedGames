package com.connectedgames.statistiche.dto;

import java.util.List;

public record HealthStatusResponse(
        String timestamp,
        String statoGlobale,
        long serviziCloudUp,
        long serviziCloudTotali,
        List<ServizioCloudStatus> serviziCloud
) {
    public record ServizioCloudStatus(
            String nome,
            String ruolo,
            String url,
            String stato,
            long latenzaMs,
            String dettagli
    ) {}
}
