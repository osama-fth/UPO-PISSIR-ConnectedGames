package com.connectedgames.core.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record IscrizioneInput(
    @NotNull UUID utenteId
) {}
