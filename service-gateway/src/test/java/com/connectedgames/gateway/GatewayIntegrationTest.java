package com.connectedgames.gateway;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class GatewayIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    @DisplayName("Verifica stato di salute del Gateway (/actuator/health)")
    void testStatoSaluteGateway() {
        webTestClient.get()
                .uri("/actuator/health")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.status").isEqualTo("UP");
    }

    @Test
    @DisplayName("Verifica protezione API senza token (401 Unauthorized)")
    void testProtezioneApiSenzaToken() {
        webTestClient.get()
                .uri("/api/v1/partite")
                .exchange()
                .expectStatus().isUnauthorized();
    }
}
