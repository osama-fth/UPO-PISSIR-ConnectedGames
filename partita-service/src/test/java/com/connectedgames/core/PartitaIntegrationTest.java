package com.connectedgames.core;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PartitaIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("Verifica stato di salute del Partita Service (/actuator/health)")
    void testStatoSalutePartitaService() {
        ResponseEntity<String> risposta = restTemplate.getForEntity("/actuator/health", String.class);
        assertThat(risposta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(risposta.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Verifica protezione endpoint /api/v1/partite senza token (401 Unauthorized)")
    void testProtezioneEndpointPartite() {
        ResponseEntity<String> risposta = restTemplate.getForEntity("/api/v1/partite", String.class);
        assertThat(risposta.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
