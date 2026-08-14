package com.connectedgames.gateway;

import com.connectedgames.gateway.filter.TenantVerificationGatewayFilterFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TenantFilterTest {

    private TenantVerificationGatewayFilterFactory filterFactory;
    private GatewayFilterChain mockChain;

    @BeforeEach
    void setUp() {
        filterFactory = new TenantVerificationGatewayFilterFactory();
        mockChain = mock(GatewayFilterChain.class);
        when(mockChain.filter(any())).thenReturn(Mono.empty());
    }

    private Jwt createJwt(String localeId) {
        return new Jwt(
                "token-valore",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("sub", "user-123", "locale_id", localeId)
        );
    }

    @Test
    @DisplayName("Richiesta senza autenticazione respinta (401)")
    void testRichiestaSenzaAutenticazione() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/locali/BAR_BELVEDERE/partite/bulk-sync").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilter filter = filterFactory.apply(new TenantVerificationGatewayFilterFactory.Config());
        filter.filter(exchange, mockChain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Admin Piattaforma ha accesso globale")
    void testAdminPiattaformaAccessoConsentito() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/locali/BAR_BELVEDERE/partite/bulk-sync").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        Jwt jwt = createJwt("QUALSIASI_LOCALE");
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_admin_piattaforma")));
        SecurityContextImpl secContext = new SecurityContextImpl(auth);

        GatewayFilter filter = filterFactory.apply(new TenantVerificationGatewayFilterFactory.Config());
        filter.filter(exchange, mockChain)
                .contextWrite(ReactiveSecurityContextHolder.withSecurityContext(Mono.just(secContext)))
                .block();

        assertThat(exchange.getResponse().getStatusCode()).isNull();
    }

    @Test
    @DisplayName("Admin Locale con locale_id corrispondente autorizzato")
    void testAdminLocaleCorrispondenteAccessoConsentito() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/locali/BAR_BELVEDERE/partite/bulk-sync").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        Jwt jwt = createJwt("BAR_BELVEDERE");
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_admin_locale")));
        SecurityContextImpl secContext = new SecurityContextImpl(auth);

        GatewayFilter filter = filterFactory.apply(new TenantVerificationGatewayFilterFactory.Config());
        filter.filter(exchange, mockChain)
                .contextWrite(ReactiveSecurityContextHolder.withSecurityContext(Mono.just(secContext)))
                .block();

        assertThat(exchange.getResponse().getStatusCode()).isNull();
    }

    @Test
    @DisplayName("Admin Locale con locale_id diverso respinto (403)")
    void testAdminLocaleDiversoAccessoNegato() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/locali/BAR_BELVEDERE/partite/bulk-sync").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        Jwt jwt = createJwt("SALA_GIOCHI_ROMA");
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_admin_locale")));
        SecurityContextImpl secContext = new SecurityContextImpl(auth);

        GatewayFilter filter = filterFactory.apply(new TenantVerificationGatewayFilterFactory.Config());
        filter.filter(exchange, mockChain)
                .contextWrite(ReactiveSecurityContextHolder.withSecurityContext(Mono.just(secContext)))
                .block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
