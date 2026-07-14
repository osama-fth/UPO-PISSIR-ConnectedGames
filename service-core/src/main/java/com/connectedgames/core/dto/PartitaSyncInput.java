package com.connectedgames.core.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PartitaSyncInput(
    @NotNull UUID id,
    @NotBlank String installazioneId,
    @NotBlank String localeId,
    UUID giocatore1Id,
    UUID giocatore2Id,
    @NotNull @Min(0) @Max(999) int punteggio1,
    @NotNull @Min(0) @Max(999) int punteggio2,
    @NotNull OffsetDateTime dataInizio,
    @NotNull OffsetDateTime dataFine,
    UUID torneoId
) {}
