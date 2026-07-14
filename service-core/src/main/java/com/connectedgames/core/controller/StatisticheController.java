package com.connectedgames.core.controller;

import com.connectedgames.core.dto.StatisticheGlobaliResponse;
import com.connectedgames.core.service.StatisticheService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/statistiche")
public class StatisticheController {

    private final StatisticheService statisticheService;

    public StatisticheController(StatisticheService statisticheService) {
        this.statisticheService = statisticheService;
    }

    @GetMapping
    public ResponseEntity<StatisticheGlobaliResponse> getStatistiche() {
        StatisticheGlobaliResponse stats = statisticheService.getStatisticheGlobali();
        return ResponseEntity.ok(stats);
    }
}
