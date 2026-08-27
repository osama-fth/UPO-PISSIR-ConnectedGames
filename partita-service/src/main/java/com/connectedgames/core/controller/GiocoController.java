package com.connectedgames.core.controller;

import com.connectedgames.core.dto.GiocoInstallatoResponse;
import com.connectedgames.core.service.GiocoService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/locali/{localeId}/giochi")
public class GiocoController {

    private final GiocoService giocoService;

    public GiocoController(GiocoService giocoService) {
        this.giocoService = giocoService;
    }

    /**
     * GET /api/v1/locali/{localeId}/giochi
     * Lista dei giochi installati presso un specifico locale.
     */
    @GetMapping
    public ResponseEntity<List<GiocoInstallatoResponse>> getGiochiByLocale(
            @PathVariable String localeId) {
        List<GiocoInstallatoResponse> giochi = giocoService.getGiochiByLocale(localeId);
        return ResponseEntity.ok(giochi);
    }
}
