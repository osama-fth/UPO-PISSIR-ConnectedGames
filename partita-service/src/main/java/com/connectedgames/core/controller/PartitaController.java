package com.connectedgames.core.controller;

import com.connectedgames.core.dto.PartitaDetailResponse;
import com.connectedgames.core.dto.PartitaSyncInput;
import com.connectedgames.core.dto.SyncResultResponse;
import com.connectedgames.core.service.PartitaService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PartitaController {

    private final PartitaService partitaService;

    public PartitaController(PartitaService partitaService) {
        this.partitaService = partitaService;
    }

    /**
     * POST /api/v1/locali/{localeId}/partite/sincronizza
     * Sincronizzazione massiva offline (Bulk Sync) dall'Edge.
     */
    @PostMapping("/locali/{localeId}/partite/sincronizza")
    public ResponseEntity<SyncResultResponse> sincronizzaPartite(
            @PathVariable String localeId,
            @RequestBody @Valid List<PartitaSyncInput> partite) {
        SyncResultResponse result = partitaService.sincronizzaPartite(localeId, partite);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/partite
     * Lista di tutte le partite con paginazione e filtri opzionali.
     */
    @GetMapping("/partite")
    public ResponseEntity<Page<PartitaDetailResponse>> getPartite(
            @RequestParam(required = false) String localeId,
            @RequestParam(required = false) String giocoId,
            @RequestParam(required = false) UUID giocatoreId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PartitaDetailResponse> partite = partitaService.getPartite(localeId, giocoId, giocatoreId, page, size);
        return ResponseEntity.ok(partite);
    }

    /**
     * GET /api/v1/partite/{partitaId}
     * Dettaglio di una singola partita.
     */
    @GetMapping("/partite/{partitaId}")
    public ResponseEntity<PartitaDetailResponse> getPartitaById(
            @PathVariable UUID partitaId) {
        PartitaDetailResponse partita = partitaService.getPartitaById(partitaId);
        return ResponseEntity.ok(partita);
    }
}
