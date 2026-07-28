package com.connectedgames.core.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TorneoResponse(
    UUID id,
    String nome,
    String tipoGioco,
    String stato,
    OffsetDateTime dataInizio,
    OffsetDateTime dataFine,
    List<String> localiIds
) {

    public static TorneoResponse of(UUID id, String nome, String tipoGioco, String stato,
                                     OffsetDateTime dataInizio, OffsetDateTime dataFine,
                                     List<String> localiIds) {
        return new TorneoResponse(id, nome, tipoGioco, stato, dataInizio, dataFine, localiIds);
    }
}
