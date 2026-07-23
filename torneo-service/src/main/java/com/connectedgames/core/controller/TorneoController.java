package com.connectedgames.core.controller;

import com.connectedgames.core.dto.ClassificaTorneoResponse;
import com.connectedgames.core.dto.TorneoResponse;
import com.connectedgames.core.service.TorneoService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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

    @GetMapping
    public ResponseEntity<List<TorneoResponse>> getTornei(
            @RequestParam(required = false) String stato) {
        List<TorneoResponse> tornei = torneoService.getTornei(stato);
        return ResponseEntity.ok(tornei);
    }

    @GetMapping("/{torneoId}/classifica")
    public ResponseEntity<ClassificaTorneoResponse> getClassifica(
            @PathVariable UUID torneoId) {
        ClassificaTorneoResponse classifica = torneoService.getClassifica(torneoId);
        return ResponseEntity.ok(classifica);
    }

    @PostMapping
    public ResponseEntity<TorneoResponse> creaTorneo(@Valid @RequestBody TorneoCreateInput input) {
        TorneoResponse response = torneoService.creaTorneo(input);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{torneoId}")
    public ResponseEntity<TorneoResponse> getTorneoById(@PathVariable UUID torneoId) {
        TorneoResponse response = torneoService.getTorneoById(torneoId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{torneoId}/iscrizioni")
    public ResponseEntity<IscrizioneTorneoResponse> iscriviGiocatore(
            @PathVariable UUID torneoId,
            @Valid @RequestBody IscrizioneInput input) {
        IscrizioneTorneoResponse response = torneoService.iscriviGiocatore(torneoId, input.utenteId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{torneoId}/iscrizioni")
    public ResponseEntity<List<IscrizioneTorneoResponse>> getIscritti(
            @PathVariable UUID torneoId) {
        List<IscrizioneTorneoResponse> response = torneoService.getIscritti(torneoId);
        return ResponseEntity.ok(response);
    }
}
