package com.connectedgames.core.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO di risposta per il dettaglio di una partita.
 * Include i nomi leggibili dei giocatori, del locale e del gioco.
 */
public record PartitaDetailResponse(
    UUID id,
    String installazioneId,
    String localeId,
    String nomeLocale,
    String nomeGioco,
    UUID giocatore1Id,
    String giocatore1Username,
    UUID giocatore2Id,
    String giocatore2Username,
    int punteggio1,
    int punteggio2,
    OffsetDateTime dataInizio,
    OffsetDateTime dataFine,
    UUID torneoId,
    String nomeTorneo,
    OffsetDateTime dataSincronizzazione
) {

    public static PartitaDetailResponse from(
            com.connectedgames.core.entity.Partita p) {
        return new PartitaDetailResponse(
            p.getId(),
            p.getInstallazione() != null ? p.getInstallazione().getId() : null,
            p.getLocale() != null ? p.getLocale().getId() : null,
            p.getLocale() != null ? p.getLocale().getNome() : null,
            p.getInstallazione() != null && p.getInstallazione().getGioco() != null
                ? p.getInstallazione().getGioco().getNome() : null,
            p.getGiocatore1() != null ? p.getGiocatore1().getId() : null,
            p.getGiocatore1() != null ? p.getGiocatore1().getUsername() : null,
            p.getGiocatore2() != null ? p.getGiocatore2().getId() : null,
            p.getGiocatore2() != null ? p.getGiocatore2().getUsername() : null,
            p.getPunteggio1(),
            p.getPunteggio2(),
            p.getDataInizio(),
            p.getDataFine(),
            p.getTorneo() != null ? p.getTorneo().getId() : null,
            p.getTorneo() != null ? p.getTorneo().getNome() : null,
            p.getDataSincronizzazione()
        );
    }
}
