package com.connectedgames.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto di ingresso principale del service-gateway.
 * <p>
 * Gateway API reattivo (Spring Cloud Gateway) che funge da entry-point REST
 * per la Connected Games Platform. Convalida i JWT e instrada
 * le richieste verso service-core sulla rete interna.
 * </p>
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
