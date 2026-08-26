package com.connectedgames.statistiche.service;

import com.connectedgames.statistiche.dto.HealthStatusResponse;
import com.connectedgames.statistiche.dto.HealthStatusResponse.ServizioCloudStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class HealthCheckService {

    private static final Logger log = LoggerFactory.getLogger(HealthCheckService.class);
    private final RestTemplate restTemplate;

    public HealthCheckService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2000);
        this.restTemplate = new RestTemplate(factory);
    }

    public HealthStatusResponse getSystemHealth() {
        Instant now = Instant.now();

        List<ServizioCloudStatus> cloudServices = new ArrayList<>();
        cloudServices.add(checkCloudService("Service Gateway", "API Gateway & Reverse Proxy", "http://service-gateway:8081/actuator/health"));
        cloudServices.add(checkCloudService("Partita Service", "Gestione & Bulk Sync Partite", "http://partita-service:8082/actuator/health"));
        cloudServices.add(checkCloudService("Torneo Service", "Gestione Tornei & Classifiche", "http://torneo-service:8083/actuator/health"));
        cloudServices.add(checkCloudService("Statistiche Service", "BFF Analytics & Super Admin UI", "http://127.0.0.1:8084/actuator/health"));
        cloudServices.add(checkKeycloak("Keycloak IdP", "OAuth2 / OIDC Identity Provider", "http://keycloak:8080/realms/Connected-Games"));
        cloudServices.add(checkPlatformDatabase());
        cloudServices.add(checkKeycloakDatabase());

        long cloudUp = cloudServices.stream().filter(s -> "UP".equalsIgnoreCase(s.stato())).count();
        String statoGlobale = (cloudUp == cloudServices.size()) ? "UP" : (cloudUp > 0 ? "DEGRADED" : "DOWN");

        return new HealthStatusResponse(
                now.toString(),
                statoGlobale,
                cloudUp,
                cloudServices.size(),
                cloudServices
        );
    }

    private ServizioCloudStatus checkCloudService(String nome, String ruolo, String url) {
        long start = System.currentTimeMillis();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            long latency = System.currentTimeMillis() - start;
            String status = (response != null && "UP".equalsIgnoreCase(String.valueOf(response.get("status")))) ? "UP" : "DEGRADED";
            return new ServizioCloudStatus(nome, ruolo, url, status, latency, "Actuator status: " + status);
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new ServizioCloudStatus(nome, ruolo, url, "DOWN", latency, "Errore connessione: " + e.getMessage());
        }
    }

    private ServizioCloudStatus checkKeycloak(String nome, String ruolo, String url) {
        long start = System.currentTimeMillis();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            long latency = System.currentTimeMillis() - start;
            boolean isOk = response != null && response.containsKey("realm");
            return new ServizioCloudStatus(nome, ruolo, url, isOk ? "UP" : "DOWN", latency, isOk ? "Realm active" : "Realm non attivo");
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new ServizioCloudStatus(nome, ruolo, url, "DOWN", latency, "Keycloak non raggiungibile: " + e.getMessage());
        }
    }

    private ServizioCloudStatus checkPlatformDatabase() {
        long start = System.currentTimeMillis();
        String url = System.getenv().getOrDefault("SPRING_DATASOURCE_URL", "jdbc:postgresql://postgres-db:5432/platform_db");
        String user = System.getenv().getOrDefault("SPRING_DATASOURCE_USERNAME", "platform_user");
        String pass = System.getenv().getOrDefault("SPRING_DATASOURCE_PASSWORD", "platform_pass123");

        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            boolean isOk = conn.isValid(2);
            long latency = System.currentTimeMillis() - start;
            return new ServizioCloudStatus("Platform Database", "Database Piattaforma", url, isOk ? "UP" : "DOWN", latency, isOk ? "Connessione OK" : "DB non valido");
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new ServizioCloudStatus("Platform Database", "Database Piattaforma", url, "DOWN", latency, "Errore DB: " + e.getMessage());
        }
    }

    private ServizioCloudStatus checkKeycloakDatabase() {
        long start = System.currentTimeMillis();
        String url = "jdbc:postgresql://postgres-db:5432/keycloak_db";
        String user = System.getenv().getOrDefault("KEYCLOAK_DB_USER", "keycloak_user");
        String pass = System.getenv().getOrDefault("KEYCLOAK_DB_PASSWORD", "keycloak_pass123");

        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            boolean isOk = conn.isValid(2);
            long latency = System.currentTimeMillis() - start;
            return new ServizioCloudStatus("Keycloak Database", "Database Identity Provider", url, isOk ? "UP" : "DOWN", latency, isOk ? "Connessione OK" : "DB non valido");
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new ServizioCloudStatus("Keycloak Database", "Database Identity Provider", url, "DOWN", latency, "Errore DB: " + e.getMessage());
        }
    }
}
