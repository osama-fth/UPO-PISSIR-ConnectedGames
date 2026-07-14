package com.connectedgames.core.exception;

import java.util.UUID;

public class DuplicatePartitaException extends RuntimeException {

    public DuplicatePartitaException(UUID partitaId) {
        super("Partita con UUID %s già presente (idempotenza)".formatted(partitaId));
    }
}
