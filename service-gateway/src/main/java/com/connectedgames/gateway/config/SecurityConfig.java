package com.connectedgames.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {

        http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(exchange -> exchange

                .matchers(ServerWebExchangeMatchers.pathMatchers("/actuator/health"))
                .permitAll()
                .matchers(ServerWebExchangeMatchers.pathMatchers("/actuator/health/readiness"))
                .permitAll()
                .matchers(ServerWebExchangeMatchers.pathMatchers("/actuator/health/liveness"))
                .permitAll()

                // Swagger UI & OpenAPI spec
                .matchers(ServerWebExchangeMatchers.pathMatchers(
                    "/docs", "/docs/**", "/swagger-ui/**", "/v3/api-docs/**", "/webjars/**", "/openapi-spec.yaml", 
                    "/swagger-resources/**", "/configuration/ui", "/configuration/security"
                )).permitAll()

                // Dashboard UI & Auth Flow (statistiche-service handles its own session)
                .matchers(ServerWebExchangeMatchers.pathMatchers(
                    "/", "/dashboard", "/utenti", "/partite", "/tornei", "/auth/**", "/css/**", "/js/**", "/images/**"
                )).permitAll()

                // API statistiche requires admin role
                .matchers(ServerWebExchangeMatchers.pathMatchers("/api/v1/statistiche/**"))
                .hasRole("admin_piattaforma")
                
                // Tornei API
                .matchers(ServerWebExchangeMatchers.pathMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/tornei"))
                .hasAnyRole("admin_piattaforma", "admin_locale")
                .matchers(ServerWebExchangeMatchers.pathMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/tornei/*/iscrizioni"))
                .authenticated()
                .matchers(ServerWebExchangeMatchers.pathMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/tornei/**"))
                .permitAll()

                // Everything else requires a valid JWT Token
                .anyExchange()
                .authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(grantedAuthoritiesExtractor()))
            );

        return http.build();
    }

    private Converter<Jwt, Mono<AbstractAuthenticationToken>> grantedAuthoritiesExtractor() {
        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(new GrantedAuthoritiesExtractor());
        return new ReactiveJwtAuthenticationConverterAdapter(jwtAuthenticationConverter);
    }

    static class GrantedAuthoritiesExtractor implements Converter<Jwt, Collection<GrantedAuthority>> {
        @Override
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null && realmAccess.containsKey("roles")) {
                @SuppressWarnings("unchecked")
                Collection<String> roles = (Collection<String>) realmAccess.get("roles");
                return roles.stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .collect(Collectors.toList());
            }
            return List.of();
        }
    }
}
