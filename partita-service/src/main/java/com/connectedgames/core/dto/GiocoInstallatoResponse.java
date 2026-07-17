package com.connectedgames.core.dto;

public record GiocoInstallatoResponse(
    String id,
    String tipoGioco
) {

    public static GiocoInstallatoResponse of(String id, String tipoGioco) {
        return new GiocoInstallatoResponse(id, tipoGioco);
    }
}
