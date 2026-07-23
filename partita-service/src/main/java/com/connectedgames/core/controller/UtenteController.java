package com.connectedgames.core.controller;

import com.connectedgames.core.dto.PartitaDetailResponse;
import com.connectedgames.core.dto.UtenteDetailResponse;
import com.connectedgames.core.dto.UtenteResponse;
import com.connectedgames.core.service.PartitaService;
import com.connectedgames.core.service.UtenteService;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/utenti")
public class UtenteController {

    private final UtenteService utenteService;
    private final PartitaService partitaService;

    public UtenteController(UtenteService utenteService, PartitaService partitaService) {
        this.utenteService = utenteService;
        this.partitaService = partitaService;
    }

    /**
     * GET /api/v1/utenti
     * Lista di tutti gli utenti registrati in platform_db.
     */
    @GetMapping
    public ResponseEntity<List<UtenteResponse>> getAllUtenti() {
        List<UtenteResponse> utenti = utenteService.getAllUtenti();
        return ResponseEntity.ok(utenti);
    }

    /**
     * GET /api/v1/utenti/{utenteId}
     * Dettaglio di un utente con statistiche aggregate.
     */
    @GetMapping("/{utenteId}")
    public ResponseEntity<UtenteDetailResponse> getUtente(
            @PathVariable UUID utenteId) {
        UtenteDetailResponse utente = utenteService.getUtenteDetail(utenteId);
        return ResponseEntity.ok(utente);
    }

    /**
     * GET /api/v1/utenti/{utenteId}/partite
     * Lista delle partite giocate da un utente specifico.
     */
    @GetMapping("/{utenteId}/partite")
    public ResponseEntity<Page<PartitaDetailResponse>> getPartiteUtente(
            @PathVariable UUID utenteId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PartitaDetailResponse> partite = partitaService.getPartiteByUtente(utenteId, page, size);
        return ResponseEntity.ok(partite);
    }
}
