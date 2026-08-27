package com.connectedgames.core.controller;

import com.connectedgames.core.dto.LocaleResponse;
import com.connectedgames.core.repository.LocaleRepository;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/locali")
public class LocaleController {

    private final LocaleRepository localeRepo;

    public LocaleController(LocaleRepository localeRepo) {
        this.localeRepo = localeRepo;
    }

    /**
     * GET /api/v1/locali
     * Lista di tutti i locali appartenenti alla piattaforma.
     */
    @GetMapping
    public ResponseEntity<List<LocaleResponse>> getAllLocali() {
        List<LocaleResponse> locali = localeRepo.findAll().stream()
            .map(l -> LocaleResponse.of(l.getId(), l.getNome(), l.getTipo(), l.getIndirizzo()))
            .toList();
        return ResponseEntity.ok(locali);
    }
}
