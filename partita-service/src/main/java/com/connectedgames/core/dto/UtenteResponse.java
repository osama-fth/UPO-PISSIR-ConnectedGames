package com.connectedgames.core.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO di risposta per la lista e il dettaglio utenti.
 */
public record UtenteResponse(
    UUID id,
    String username,
    String email,
    OffsetDateTime dataRegistrazione
) {

    public static UtenteResponse from(com.connectedgames.core.entity.Utente u) {
        return new UtenteResponse(
            u.getId(),
            u.getUsername(),
            u.getEmail(),
            u.getDataRegistrazione()
        );
    }
}
