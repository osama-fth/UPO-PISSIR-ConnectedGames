package com.connectedgames.core.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO di risposta per il dettaglio di un utente con statistiche aggregate.
 */
public record UtenteDetailResponse(
    UUID id,
    String username,
    String email,
    String ruolo,
    OffsetDateTime dataRegistrazione,
    long totalePartite,
    long vittorie,
    long sconfitte,
    double percentualeVittorie
) {

    public static UtenteDetailResponse of(
            com.connectedgames.core.entity.Utente u,
            long totalePartite,
            long vittorie,
            long sconfitte) {
        double perc = totalePartite > 0 ? (double) vittorie / totalePartite * 100.0 : 0.0;
        return new UtenteDetailResponse(
            u.getId(),
            u.getUsername(),
            u.getEmail(),
            u.getRuolo(),
            u.getDataRegistrazione(),
            totalePartite,
            vittorie,
            sconfitte,
            Math.round(perc * 100.0) / 100.0
        );
    }
}
