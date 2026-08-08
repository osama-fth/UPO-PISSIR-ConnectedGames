package com.connectedgames.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * TenantVerificationGatewayFilterFactory — Filtro Custom per verifica Multi-Tenant (C3)
 *
 * Verifica che l'utente che invoca la sincronizzazione bulk:
 * 1. Abbia il ruolo ROLE_admin_piattaforma (es. service account globale), oppure
 * 2. Il suo claim 'locale_id' nel JWT corrisponda esattamente al {localeId} specificato nell'URL.
 *
 * NOTA REACTOR: chain.filter(exchange) ritorna Mono(Void) che completa senza emettere valori.
 * Per evitare che switchIfEmpty scatti erroneamente al termine della richiesta, il flatMap
 * emette un segnale booleano tramite .then(Mono.just(true)), e il .then() finale riconverte
 * tutto in Mono(Void) per il contratto GatewayFilter.
 */
@Component
public class TenantVerificationGatewayFilterFactory extends AbstractGatewayFilterFactory<TenantVerificationGatewayFilterFactory.Config> {

    private static final Logger log = LoggerFactory.getLogger(TenantVerificationGatewayFilterFactory.class);

    public TenantVerificationGatewayFilterFactory() {
        super(Config.class);
    }

    public static class Config {
        // Nessuna configurazione aggiuntiva necessaria per ora
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .flatMap(authentication -> {
                    if (authentication == null || !authentication.isAuthenticated()) {
                        log.warn("[TenantFilter] Richiesta non autenticata respinta");
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete().then(Mono.just(false));
                    }

                    // Estrazione del path variable {localeId}
                    Map<String, String> uriVariables = ServerWebExchangeUtils.getUriTemplateVariables(exchange);
                    String pathLocaleId = uriVariables.get("localeId");

                    if (pathLocaleId == null) {
                        // Fallback: estrazione diretta dal path /api/v1/locali/{localeId}/...
                        String path = exchange.getRequest().getPath().value();
                        String[] parts = path.split("/");
                        for (int i = 0; i < parts.length; i++) {
                            if ("locali".equals(parts[i]) && i + 1 < parts.length) {
                                pathLocaleId = parts[i + 1];
                                break;
                            }
                        }
                    }

                    if (pathLocaleId == null) {
                        log.warn("[TenantFilter] Impossibile estrarre localeId dall'URL: {}", exchange.getRequest().getPath().value());
                        exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
                        return exchange.getResponse().setComplete().then(Mono.just(false));
                    }

                    // Verifica ruoli: admin_piattaforma ha accesso globale
                    boolean isPlatformAdmin = authentication.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .anyMatch(role -> role.equalsIgnoreCase("ROLE_admin_piattaforma")
                                    || role.equalsIgnoreCase("admin_piattaforma"));

                    if (isPlatformAdmin) {
                        log.debug("[TenantFilter] Accesso consentito a localeId '{}' per admin_piattaforma", pathLocaleId);
                        // .then(Mono.just(true)) evita che switchIfEmpty scatti dopo chain.filter()
                        return chain.filter(exchange).then(Mono.just(true));
                    }

                    // Se è un admin locale o client edge, controlla il claim locale_id nel JWT
                    if (authentication instanceof JwtAuthenticationToken jwtAuth) {
                        Jwt jwt = jwtAuth.getToken();
                        String tokenLocaleId = jwt.getClaimAsString("locale_id");

                        if (tokenLocaleId != null && tokenLocaleId.equalsIgnoreCase(pathLocaleId)) {
                            log.debug("[TenantFilter] Accesso consentito: claim locale_id '{}' corrisponde al path", tokenLocaleId);
                            return chain.filter(exchange).then(Mono.just(true));
                        } else {
                            log.warn("[TenantFilter] ACCESSO NEGATO: Token locale_id='{}' non corrisponde a path localeId='{}' per utente '{}'",
                                    tokenLocaleId, pathLocaleId, authentication.getName());
                            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                            return exchange.getResponse().setComplete().then(Mono.just(false));
                        }
                    }

                    log.warn("[TenantFilter] ACCESSO NEGATO: Nessuna regola di autorizzazione tenant matched per '{}'", authentication.getName());
                    exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                    return exchange.getResponse().setComplete().then(Mono.just(false));
                })
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("[TenantFilter] Context di sicurezza vuoto");
                    exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                    return exchange.getResponse().setComplete().then(Mono.just(false));
                }))
                .then(); // Riconverte Mono<Boolean> → Mono<Void> per il contratto GatewayFilter
    }
}
