package com.connectedgames.core.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TorneoResponse(
    UUID id,
    String nome,
    String tipoGioco,
    String stato,
    OffsetDateTime dataInizio,
    OffsetDateTime dataFine
) {

    public static TorneoResponse of(UUID id, String nome, String tipoGioco, String stato,
                                     OffsetDateTime dataInizio, OffsetDateTime dataFine) {
        return new TorneoResponse(id, nome, tipoGioco, stato, dataInizio, dataFine);
    }
}
