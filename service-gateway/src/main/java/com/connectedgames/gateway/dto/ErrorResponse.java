package com.connectedgames.gateway.dto;

import java.time.LocalDateTime;

/**
 * DTO per risposte di errore normalizzate.
 * <p>
 * Utilizzato per restituire errori HTTP uniformi al client
 * (es. 401 Unauthorized, 403 Forbidden, 500 Internal Error).
 * Corrisponde allo schema ErrorResponse definito in OpenAPI.
 * </p>
 *
 * @param timestamp  Momento in cui si è verificato l'errore
 * @param status     Codice HTTP dello stato
 * @param error      Descrizione breve dell'errore (es. "Unauthorized")
 * @param message    Messaggio dettagliato per il client
 */
public record ErrorResponse(
    LocalDateTime timestamp,
    int status,
    String error,
    String message
) {

    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(LocalDateTime.now(), status, error, message);
    }
}
