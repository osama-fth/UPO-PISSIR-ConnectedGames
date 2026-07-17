package com.connectedgames.core.controller;

import com.connectedgames.core.dto.ClassificaTorneoResponse;
import com.connectedgames.core.dto.TorneoResponse;
import com.connectedgames.core.service.TorneoService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
