package com.connectedgames.statistiche.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.view.RedirectView;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/auth")
public class AuthController {

    @Value("${app.keycloak.public-url}")
    private String publicUrl;

    @Value("${app.keycloak.internal-url}")
    private String internalUrl;

    @Value("${app.keycloak.client-id}")
    private String clientId;

    @Value("${app.keycloak.redirect-uri}")
    private String redirectUri;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/login")
    public RedirectView login(HttpSession session) {
        String state = UUID.randomUUID().toString();
        session.setAttribute("oidcState", state);

        String authUrl = publicUrl + "/protocol/openid-connect/auth" +
                "?client_id=" + clientId +
                "&redirect_uri=" + redirectUri +
                "&response_type=code" +
                "&scope=openid profile email" +
                "&state=" + state;

        return new RedirectView(authUrl);
    }

    @GetMapping("/callback")
    public RedirectView callback(@RequestParam(value = "code", required = false) String code,
                                 @RequestParam(value = "state", required = false) String state,
                                 HttpServletRequest request) {
        HttpSession session = request.getSession();
        String savedState = (String) session.getAttribute("oidcState");

        if (code == null || state == null || savedState == null || !savedState.equals(state)) {
            return new RedirectView("/dashboard?error=auth_failed");
        }
        session.removeAttribute("oidcState");

        // Scambio del codice per il token sulla rete interna di Docker
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("grant_type", "authorization_code");
        map.add("client_id", clientId);
        map.add("code", code);
        map.add("redirect_uri", redirectUri);

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(map, headers);
        String tokenEndpoint = internalUrl + "/protocol/openid-connect/token";

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenEndpoint, entity, Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null && body.containsKey("access_token")) {
                String accessToken = (String) body.get("access_token");
                String idToken = (String) body.get("id_token");

                // Decodifica manuale per estrarre il profilo
                String[] parts = accessToken.split("\\.");
                if (parts.length > 1) {
                    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
                    Map<String, Object> claims = mapper.readValue(payload, Map.class);
                    
                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                    if (claims.containsKey("realm_access")) {
                        Map<String, Object> realmAccess = (Map<String, Object>) claims.get("realm_access");
                        if (realmAccess.containsKey("roles")) {
                            List<String> roles = (List<String>) realmAccess.get("roles");
                            authorities = roles.stream()
                                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                                    .collect(Collectors.toList());
                        }
                    }

                    String preferredUsername = (String) claims.get("preferred_username");
                    if (preferredUsername == null) {
                        preferredUsername = (String) claims.get("sub");
                    }

                    // Creazione manuale della sessione di Spring Security
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            preferredUsername, null, authorities);
                    
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, SecurityContextHolder.getContext());
                    
                    session.setAttribute("idToken", idToken);
                }
            }
        } catch (Exception e) {
            System.err.println("Errore scambio token: " + e.getMessage());
            return new RedirectView("/dashboard?error=token_exchange_failed");
        }

        return new RedirectView("/dashboard");
    }

    @GetMapping("/logout")
    public RedirectView logout(HttpSession session) {
        String idToken = (String) session.getAttribute("idToken");
        session.invalidate();
        SecurityContextHolder.clearContext();

        if (idToken != null) {
            String logoutUrl = publicUrl + "/protocol/openid-connect/logout" +
                    "?id_token_hint=" + idToken +
                    "&post_logout_redirect_uri=http://localhost:8081/dashboard";
            return new RedirectView(logoutUrl);
        }
        return new RedirectView("/dashboard");
    }

    @GetMapping("/unauthorized")
    @org.springframework.web.bind.annotation.ResponseBody
    public String unauthorized() {
        return "<html><head><title>Accesso Negato</title><link href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css' rel='stylesheet'></head><body class='bg-light d-flex align-items-center justify-content-center vh-100'><div class='text-center'><h1 class='display-1 text-danger'>403</h1><h2 class='mb-4'>Accesso Negato</h2><p class='lead'>Mi dispiace, ma non hai i permessi di <strong>Admin Piattaforma</strong> necessari per visualizzare questa dashboard.</p><a href='/auth/logout' class='btn btn-primary mt-3'>Disconnettiti ed entra con un altro account</a></div></body></html>";
    }
}
