package com.connectedgames.statistiche.controller;

import com.connectedgames.statistiche.dto.StatisticheGlobaliResponse;
import com.connectedgames.statistiche.service.StatisticheBackendService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/statistiche")
public class StatisticheRestController {

    private final StatisticheBackendService statisticheService;

    public StatisticheRestController(StatisticheBackendService statisticheService) {
        this.statisticheService = statisticheService;
    }

    @GetMapping
    public ResponseEntity<StatisticheGlobaliResponse> getStatistiche() {
        return ResponseEntity.ok(statisticheService.getStatisticheGlobali());
    }
}
