package com.connectedgames.core.dto;

public record LocaleResponse(
    String id,
    String nome,
    String tipo,
    String indirizzo
) {
    public static LocaleResponse of(String id, String nome, String tipo, String indirizzo) {
        return new LocaleResponse(id, nome, tipo, indirizzo);
    }
}
