package com.connectedgames.core.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record IscrizioneTorneoResponse(
    UUID torneoId,
    UUID utenteId,
    String utenteUsername,
    String localeId,
    String localeNome,
    OffsetDateTime dataIscrizione
) {

    public static IscrizioneTorneoResponse from(com.connectedgames.core.entity.IscrizioneTorneo i) {
        return new IscrizioneTorneoResponse(
            i.getTorneo().getId(),
            i.getUtente().getId(),
            i.getUtente().getUsername(),
            i.getLocale() != null ? i.getLocale().getId() : null,
            i.getLocale() != null ? i.getLocale().getNome() : null,
            i.getDataIscrizione()
        );
    }
}
