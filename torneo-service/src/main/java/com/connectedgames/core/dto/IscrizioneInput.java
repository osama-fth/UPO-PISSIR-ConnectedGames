package com.connectedgames.core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record IscrizioneInput(
    @NotNull UUID utenteId,
    @NotBlank String localeId
) {}
