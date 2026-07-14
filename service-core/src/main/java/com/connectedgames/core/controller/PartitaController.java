package com.connectedgames.core.controller;

import com.connectedgames.core.dto.PartitaSyncInput;
import com.connectedgames.core.dto.SyncResultResponse;
import com.connectedgames.core.service.PartitaService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/locali/{localeId}/partite")
public class PartitaController {

    private final PartitaService partitaService;

    public PartitaController(PartitaService partitaService) {
        this.partitaService = partitaService;
    }

    @PostMapping("/sincronizza")
    public ResponseEntity<SyncResultResponse> sincronizzaPartite(
            @PathVariable String localeId,
            @RequestBody @Valid List<PartitaSyncInput> partite) {
        SyncResultResponse result = partitaService.sincronizzaPartite(localeId, partite);
        return ResponseEntity.ok(result);
    }
}
