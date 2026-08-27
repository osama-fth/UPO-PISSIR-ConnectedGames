package com.connectedgames.statistiche.controller;

import com.connectedgames.statistiche.dto.HealthStatusResponse;
import com.connectedgames.statistiche.dto.StatisticheGlobaliResponse;
import com.connectedgames.statistiche.dto.StatisticheLocaleResponse;
import com.connectedgames.statistiche.dto.StatisticheUtenteResponse;
import com.connectedgames.statistiche.service.HealthCheckService;
import com.connectedgames.statistiche.service.StatisticheBackendService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/statistiche")
public class StatisticheRestController {

    private final StatisticheBackendService statisticheService;
    private final HealthCheckService healthCheckService;

    public StatisticheRestController(StatisticheBackendService statisticheService, HealthCheckService healthCheckService) {
        this.statisticheService = statisticheService;
        this.healthCheckService = healthCheckService;
    }

    /**
     * GET /api/v1/statistiche
     * Metriche statistiche globali della piattaforma con filtri temporali e per gioco.
     */
    @GetMapping
    public ResponseEntity<StatisticheGlobaliResponse> getStatistiche(
            @RequestParam(required = false) Integer giorni,
            @RequestParam(required = false) String giocoId) {
        return ResponseEntity.ok(statisticheService.getStatisticheGlobali(giorni, giocoId));
    }

    /**
     * GET /api/v1/statistiche/locali/{localeId}
     * Metriche statistiche aggregate per un singolo locale.
     */
    @GetMapping("/locali/{localeId}")
    public ResponseEntity<StatisticheLocaleResponse> getStatisticheLocale(@PathVariable String localeId) {
        return ResponseEntity.ok(statisticheService.getStatistichePerLocale(localeId));
    }

    /**
     * GET /api/v1/statistiche/utenti/{utenteId}
     * Metriche statistiche aggregate per un singolo utente.
     */
    @GetMapping("/utenti/{utenteId}")
    public ResponseEntity<StatisticheUtenteResponse> getStatisticheUtente(@PathVariable UUID utenteId) {
        return ResponseEntity.ok(statisticheService.getStatistichePerUtente(utenteId));
    }

    /**
     * GET /api/v1/statistiche/stato-sistema
     * Stato di salute (health check) dei microservizi e database di piattaforma.
     */
    @GetMapping("/stato-sistema")
    public ResponseEntity<HealthStatusResponse> getStatoSistema() {
        return ResponseEntity.ok(healthCheckService.getSystemHealth());
    }
}
