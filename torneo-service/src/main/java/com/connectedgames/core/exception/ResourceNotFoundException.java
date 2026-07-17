package com.connectedgames.core.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resource, String id) {
        super("%s non trovato: %s".formatted(resource, id));
    }
}
