package com.connectedgames.core;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

// Test d'integrazione e raggiungibilità per Torneo Service
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TorneoServiceReachabilityIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("Test 1: Verifica dello stato di salute del Torneo Service (/actuator/health)")
    void testStatoSaluteTorneoService() {
        ResponseEntity<String> risposta = restTemplate.getForEntity("/actuator/health", String.class);
        assertThat(risposta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(risposta.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Test 2: Verifica protezione endpoint /api/v1/tornei senza token (401 Unauthorized)")
    void testProtezioneEndpointTornei() {
        ResponseEntity<String> risposta = restTemplate.getForEntity("/api/v1/tornei", String.class);
        assertThat(risposta.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
