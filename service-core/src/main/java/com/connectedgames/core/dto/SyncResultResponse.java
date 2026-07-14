package com.connectedgames.core.dto;

import java.util.List;
import java.util.UUID;

public record SyncResultResponse(
    List<UUID> salvate,
    List<SyncFailure> fallite
) {

    public static SyncResultResponse of(List<UUID> salvate, List<SyncFailure> fallite) {
        return new SyncResultResponse(salvate, fallite);
    }

    public record SyncFailure(
        UUID id,
        String errore
    ) {}
}
