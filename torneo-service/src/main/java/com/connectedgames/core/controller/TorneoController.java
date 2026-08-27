package com.connectedgames.core.controller;

import com.connectedgames.core.dto.ClassificaTorneoResponse;
import com.connectedgames.core.dto.TorneoResponse;
import com.connectedgames.core.service.TorneoService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import com.connectedgames.core.dto.TorneoCreateInput;
import com.connectedgames.core.dto.IscrizioneInput;
import com.connectedgames.core.dto.IscrizioneTorneoResponse;

@RestController
@RequestMapping("/api/v1/tornei")
public class TorneoController {

    private final TorneoService torneoService;

    public TorneoController(TorneoService torneoService) {
        this.torneoService = torneoService;
    }

    /**
     * GET /api/v1/tornei
     * Lista di tutti i tornei con filtro opzionale per stato.
     */
    @GetMapping
    public ResponseEntity<List<TorneoResponse>> getTornei(
            @RequestParam(required = false) String stato) {
        List<TorneoResponse> tornei = torneoService.getTornei(stato);
        return ResponseEntity.ok(tornei);
    }

    /**
     * GET /api/v1/tornei/{torneoId}/classifica
     * Classifica live del torneo per locali e giocatori.
     */
    @GetMapping("/{torneoId}/classifica")
    public ResponseEntity<ClassificaTorneoResponse> getClassifica(
            @PathVariable UUID torneoId) {
        ClassificaTorneoResponse classifica = torneoService.getClassifica(torneoId);
        return ResponseEntity.ok(classifica);
    }

    /**
     * POST /api/v1/tornei
     * Creazione di un nuovo torneo.
     */
    @PostMapping
    public ResponseEntity<TorneoResponse> creaTorneo(@Valid @RequestBody TorneoCreateInput input) {
        TorneoResponse response = torneoService.creaTorneo(input);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/tornei/{torneoId}
     * Dettaglio di un singolo torneo.
     */
    @GetMapping("/{torneoId}")
    public ResponseEntity<TorneoResponse> getTorneoById(@PathVariable UUID torneoId) {
        TorneoResponse response = torneoService.getTorneoById(torneoId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/tornei/{torneoId}/iscrizioni
     * Iscrizione di un utente a un torneo a nome di un locale.
     */
    @PostMapping("/{torneoId}/iscrizioni")
    public ResponseEntity<IscrizioneTorneoResponse> iscriviGiocatore(
            @PathVariable UUID torneoId,
            @Valid @RequestBody IscrizioneInput input) {
        IscrizioneTorneoResponse response = torneoService.iscriviGiocatore(torneoId, input.utenteId(), input.localeId());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/tornei/{torneoId}/iscrizioni
     * Lista degli utenti iscritti al torneo.
     */
    @GetMapping("/{torneoId}/iscrizioni")
    public ResponseEntity<List<IscrizioneTorneoResponse>> getIscritti(
            @PathVariable UUID torneoId) {
        List<IscrizioneTorneoResponse> response = torneoService.getIscritti(torneoId);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/v1/tornei/{torneoId}
     * Cancellazione di un torneo.
     */
    @DeleteMapping("/{torneoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancellaTorneo(@PathVariable UUID torneoId) {
        torneoService.cancellaTorneo(torneoId);
    }

    /**
     * DELETE /api/v1/tornei/{torneoId}/iscrizioni/{utenteId}
     * Disiscrizione di un utente da un torneo.
     */
    @DeleteMapping("/{torneoId}/iscrizioni/{utenteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disiscriviGiocatore(
            @PathVariable UUID torneoId,
            @PathVariable UUID utenteId) {
        torneoService.disiscriviGiocatore(torneoId, utenteId);
    }
}
