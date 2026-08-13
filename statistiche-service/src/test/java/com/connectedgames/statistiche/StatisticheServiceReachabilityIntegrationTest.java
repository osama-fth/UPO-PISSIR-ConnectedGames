package com.connectedgames.statistiche;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.io.IOException;
import java.net.HttpURLConnection;

import static org.assertj.core.api.Assertions.assertThat;

// Test d'integrazione e raggiungibilità per Statistiche Service
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StatisticheServiceReachabilityIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("Test 1: Verifica dello stato di salute del Statistiche Service (/actuator/health)")
    void testStatoSaluteStatisticheService() {
        ResponseEntity<String> risposta = restTemplate.getForEntity("/actuator/health", String.class);
        assertThat(risposta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(risposta.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Test 2: Verifica reindirizzamento per l'endpoint protetto /dashboard (302 Found)")
    void testReindirizzamentoDashboardNonAutenticata() {
        // Disabilitiamo il redirect automatico per catturare la risposta 302 diretta
        restTemplate.getRestTemplate().setRequestFactory(new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws IOException {
                super.prepareConnection(connection, httpMethod);
                connection.setInstanceFollowRedirects(false);
            }
        });

        ResponseEntity<String> risposta = restTemplate.getForEntity("/dashboard", String.class);
        assertThat(risposta.getStatusCode()).isEqualTo(HttpStatus.FOUND);
    }
}
