package com.connectedgames.core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

public record TorneoCreateInput(
    @NotBlank String nome,
    @NotBlank String giocoId,
    @NotNull OffsetDateTime dataInizio,
    @NotNull OffsetDateTime dataFine,
    List<String> localiId
) {}
