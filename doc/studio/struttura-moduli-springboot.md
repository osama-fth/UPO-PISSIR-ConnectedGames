# Struttura dei Moduli Spring Boot — Connected Games Platform

Questo documento descrive in dettaglio la struttura del codice sorgente, la suddivisione in package e lo scopo delle componenti per ciascuno dei **4 microservizi Spring Boot** dell'architettura centrale:

1. [`service-gateway`](#1-service-gateway) — API Gateway Centrale & Security Proxy
2. [`partita-service`](#2-partita-service) — Gestione Partite & Sincronizzazione Edge (Core API)
3. [`torneo-service`](#3-torneo-service) — Gestione Tornei, Iscrizioni & Classifiche Live
4. [`statistiche-service`](#4-statistiche-service) — Analytics Backend & Super Admin Dashboard (BFF Pattern)

---

## Panoramica dell'Architettura dei Moduli

I microservizi adottano un'architettura **layered (a strati)** basata sulle convenzioni standard di Spring Boot, con chiara separazione delle responsabilità:

| Layer / Cartella | Descrizione e Responsabilità |
| :--- | :--- |
| **`config/`** | Configurazione dei Bean di Spring (Sicurezza, WebFlux/Web, CORS, JWT Resource Server). |
| **`controller/`** | Adattatori REST (@RestController / @Controller) che espongono gli endpoint API e gestiscono le richieste HTTP. |
| **`service/`** | Strato di business logic contenente le regole di dominio, le transazioni e le elaborazioni applicative. |
| **`repository/`** | Interfacce di accesso ai dati (Spring Data JPA / `JdbcTemplate`) per l'interazione con il database PostgreSQL (`platform_db`). |
| **`entity/`** | Modelli di dominio e classi ORM (JPA/Hibernate) mappate direttamente sulle tabelle del database. |
| **`dto/`** | Data Transfer Objects (Record Java 21) usati per la serializzazione/deserializzazione JSON da e verso il client. |
| **`exception/`** | Gestore globale delle eccezioni (@RestControllerAdvice) e classi di eccezione custom di dominio. |
| **`filter/`** | Filtri custom della catena di sicurezza o del Gateway (es. verifica multi-tenant). |
| **`templates/`** | Viste HTML server-side (Thymeleaf) per l'interfaccia utente (presente nel BFF `statistiche-service`). |

---

## 1. `service-gateway`

* **Porta HTTP**: `8081`
* **Tecnologia**: Spring Cloud Gateway, Spring WebFlux (Reattivo), Spring Security Reactive, SpringDoc OpenAPI.
* **Scopo**: Punto di ingresso unico ed esclusivo (Single Entry Point) per tutti i client esterni. Gestisce il routing verso i microservizi interni, la validazione dei token JWT di Keycloak, il controllo d'accesso multi-tenant e la documentazione delle API.

```
service-gateway/
├── Dockerfile
├── pom.xml
└── src/main/
    ├── java/com/connectedgames/gateway/
    │   ├── GatewayApplication.java                   # Punto di avvio dell'applicazione Spring Boot
    │   ├── config/
    │   │   └── SecurityConfig.java                    # Configurazione della sicurezza reattiva (WebFlux), autorizzazione rotte, ruoli e CORS
    │   └── filter/
    │       └── TenantVerificationGatewayFilterFactory.java # Filtro Gateway custom per la verifica dell'isolamento Multi-Tenant (controllo claim locale_id)
    └── resources/
        ├── application.yml                            # Definizione delle rotte di proxying, URI Keycloak, porte ed Actuator
        └── static/
            └── openapi-spec.yaml                      # Specifica OpenAPI 3.0 completa ed unificata della piattaforma
```

### Dettaglio Cartelle e Componenti:
* **`config/`**:
  * `SecurityConfig.java`: Configura `SecurityWebFilterChain` reattiva. Definisce le rotte pubbliche (es. `/openapi-spec.yaml`, `/docs`, asset UI) e quelle protette da JWT Bearer Token, convertendo i ruoli del realm di Keycloak nei prefissi `ROLE_` di Spring.
* **`filter/`**:
  * `TenantVerificationGatewayFilterFactory.java`: Filtro custom applicato alla rotta di sincronizzazione bulk. Controlla che un amministratore di locale possa sincronizzare unicamente le partite del proprio `locale_id` (o che sia un `admin_piattaforma` globale).
* **`resources/`**:
  * `application.yml`: Configura il bilanciamento ed il routing verso `partita-service:8082`, `torneo-service:8083` e `statistiche-service:8084`, oltre alle regole CORS globali.
  * `static/openapi-spec.yaml`: File YAML di documentazione OpenAPI che alimenta lo Swagger UI del Gateway (`http://localhost:8081/docs`).

---

## 2. `partita-service`

* **Porta HTTP**: `8082` (Rete interna Docker `backend-tier`)
* **Tecnologia**: Spring Boot Web, Spring Data JPA, PostgreSQL Driver, Spring Security OAuth2 Resource Server.
* **Scopo**: Gestione del ciclo di vita delle partite, ricezione del caricamento massivo (Bulk Sync) dagli Edge Node con garanzia di idempotenza, auto-registrazione degli utenti ed interrogazione delle partite storiche.

```
partita-service/
├── Dockerfile
├── pom.xml
└── src/main/
    ├── java/com/connectedgames/core/
    │   ├── CoreApplication.java                       # Punto di avvio del microservizio Partite
    │   ├── config/
    │   │   └── SecurityConfig.java                    # Configurazione Spring Security Stateless (OAuth2 Resource Server JWT)
    │   ├── controller/
    │   │   ├── PartitaController.java                 # Endpoint REST per la sincronizzazione bulk e la ricerca partite
    │   │   ├── UtenteController.java                  # Endpoint REST per la consultazione degli utenti e dello storico personale
    │   │   ├── GiocoController.java                   # Endpoint REST per i giochi installati nei locali
    │   │   └── LocaleController.java                  # Endpoint REST per la consultazione e ricerca dei locali
    │   ├── service/
    │   │   ├── PartitaService.java                    # Logica di business: verifica idempotenza, auto-registrazione utente, validazione torneo e salvataggio
    │   │   ├── UtenteService.java                     # Calcolo aggregato delle statistiche utente (vittorie/sconfitte)
    │   │   └── GiocoService.java                      # Ricerca e filtro delle installazioni di gioco nei locali
    │   ├── repository/
    │   │   ├── PartitaRepository.java                 # Query JPA per la ricerca ed i conteggi delle partite
    │   │   ├── UtenteRepository.java                  # Accesso ai dati anagrafici dei giocatori
    │   │   ├── LocaleRepository.java                  # Accesso ai dati dei locali
    │   │   ├── InstallazioneGiocoRepository.java      # Accesso alle installazioni fisiche di gioco
    │   │   └── TorneoRepository.java                  # Consultazione tornei ai fini della validazione partite
    │   ├── entity/
    │   │   ├── Partita.java                           # Entità JPA per la tabella platform_db.partita
    │   │   ├── Utente.java                            # Entità JPA per la tabella platform_db.utente
    │   │   ├── Locale.java                            # Entità JPA per la tabella platform_db.locale
    │   │   ├── Gioco.java                             # Entità JPA per la tabella platform_db.gioco
    │   │   ├── InstallazioneGioco.java                # Entità JPA per la tabella platform_db.installazione_gioco
    │   │   └── Torneo.java                            # Entità JPA per la tabella platform_db.torneo
    │   ├── dto/
    │   │   ├── PartitaSyncInput.java                  # DTO di input per l'invio bulk da parte dell'Edge
    │   │   ├── SyncResultResponse.java                # DTO di risposta con liste di UUID salvate e fallite
    │   │   ├── PartitaDetailResponse.java             # DTO dettagliato per la rappresentazione JSON della partita
    │   │   ├── UtenteResponse.java                    # DTO base per la lista utenti
    │   │   ├── UtenteDetailResponse.java              # DTO con statistiche aggregate utente
    │   │   ├── GiocoInstallatoResponse.java           # DTO per la lista dei giochi presenti in un locale
    │   │   ├── LocaleResponse.java                    # DTO per la rappresentazione JSON di un locale
    │   │   └── ErrorResponse.java                     # DTO per il formato di errore normalizzato
    │   └── exception/
    │       ├── GlobalExceptionHandler.java            # Gestione centralizzata delle eccezioni HTTP (@RestControllerAdvice)
    │       ├── ResourceNotFoundException.java         # Eccezione custom per risorsa non trovata (404)
    │       └── DuplicatePartitaException.java        # Eccezione custom per gestione idempotenza (409)
    └── resources/
        └── application.yml                            # Connessione PostgreSQL (HikariCP), JPA/Hibernate ed issuer JWT
```

### Dettaglio Cartelle e Componenti:
* **`controller/`**: Espone le API per l'Edge Node (sincronizzazione) e per la consultazione del catalogo partite e giocatori.
* **`service/`**: Contiene il nucleo algoritmico: `PartitaService` elabora ciascun elemento del payload bulk, verifica se l'utente esiste (altrimenti lo auto-registra al volo), controlla se la partita è valida per un torneo ed esegue il salvataggio atomico.
* **`entity/`**: Mappatura ORM JPA delle 6 tabelle fondamentali del database PostgreSQL `platform_db`.
* **`repository/`**: Interfacce Spring Data JPA che eseguono le query sul database relazionale.

---

## 3. `torneo-service`

* **Porta HTTP**: `8083` (Rete interna Docker `backend-tier`)
* **Tecnologia**: Spring Boot Web, Spring Data JPA, PostgreSQL Driver, Spring Security OAuth2 Resource Server.
* **Scopo**: Gestione completa del ciclo di vita dei tornei (creazione da parte degli admin, iscrizioni e disiscrizioni dei giocatori) e calcolo dinamico (*live*) delle classifiche dei tornei in base ai risultati delle partite.

```
torneo-service/
├── Dockerfile
├── pom.xml
└── src/main/
    ├── java/com/connectedgames/core/
    │   ├── CoreApplication.java                       # Punto di avvio del microservizio Tornei
    │   ├── config/
    │   │   └── SecurityConfig.java                    # Configurazione Spring Security Stateless per Resource Server JWT
    │   ├── controller/
    │   │   └── TorneoController.java                  # Endpoint REST per tornei, classifiche ed iscrizioni
    │   ├── service/
    │   │   └── TorneoService.java                     # Business logic: creazione tornei, calcolo stato lazy, iscrizioni e classifica in tempo reale
    │   ├── repository/
    │   │   ├── TorneoRepository.java                  # Query JPA per la ricerca dei tornei attivi/finiti
    │   │   ├── IscrizioneTorneoRepository.java        # Query ed operazioni di eliminazione per le iscrizioni
    │   │   ├── PartitaRepository.java                 # Consultazione delle partite giocate all'interno di un torneo
    │   │   ├── UtenteRepository.java                  # Accesso e registrazione rapida giocatori
    │   │   ├── LocaleRepository.java                  # Associazione tornei-locali
    │   │   └── GiocoRepository.java                   # Associazione torneo-tipologia di gioco
    │   ├── entity/
    │   │   ├── Torneo.java                            # Entità JPA per la tabella platform_db.torneo
    │   │   ├── IscrizioneTorneo.java                  # Entità JPA per la tabella platform_db.iscrizione_torneo
    │   │   ├── IscrizioneTorneoId.java                # Composite Key (@Embeddable) per l'iscrizione (torneo_id, utente_id)
    │   │   ├── Partita.java                           # Entità JPA per la lettura delle partite
    │   │   ├── Utente.java                            # Entità JPA utente
    │   │   ├── Locale.java                            # Entità JPA locale
    │   │   ├── Gioco.java                             # Entità JPA gioco
    │   │   └── InstallazioneGioco.java                # Entità JPA installazione
    │   ├── dto/
    │   │   ├── TorneoCreateInput.java                 # DTO per la creazione di un nuovo torneo da parte dell'admin
    │   │   ├── TorneoResponse.java                    # DTO di risposta per i dettagli del torneo
    │   │   ├── IscrizioneInput.java                   # DTO con l'utenteId da iscrivere
    │   │   ├── IscrizioneTorneoResponse.java          # DTO di risposta conferma iscrizione
    │   │   ├── ClassificaTorneoResponse.java          # DTO per la classifica ordinata del torneo con metriche e posizioni
    │   │   └── ErrorResponse.java                     # DTO per il formato di errore normalizzato
    │   └── exception/
    │       ├── GlobalExceptionHandler.java            # Gestore centralizzato eccezioni HTTP
    │       └── ResourceNotFoundException.java         # Eccezione 404 custom
    └── resources/
        └── application.yml                            # Connessione PostgreSQL, JPA ed OAuth2
```

### Dettaglio Cartelle e Componenti:
* **`controller/`**: Espone le rotte per la gestione tornei (`/api/v1/tornei`, iscrizioni e classifiche).
* **`service/`**: `TorneoService` implementa la logica di calcolo stato *lazy* (`NON_ATTIVO` prima dell'inizio, `ATTIVO` durante la finestra temporale, `CONCLUSO` alla fine) e calcola in tempo reale la classifica ordinando i partecipanti per percentuale di vittorie, vinte e giocate.
* **`entity/`**: Mantiene il modello dei tornei e la chiave composta `@Embeddable` (`IscrizioneTorneoId`) per la tabella di unione delle iscrizioni.

---

## 4. `statistiche-service`

* **Porta HTTP**: `8084` (Rete interna Docker `backend-tier`)
* **Tecnologia**: Spring Boot Web, Spring Security OIDC Client + JWT, Spring JDBC (`JdbcTemplate`), Thymeleaf Engine, Chart.js, Bootstrap 5.
* **Scopo**: Backend-For-Frontend (BFF) e motore di analytics della piattaforma. Espone sia la Dashboard Super Admin web server-rendered con grafici interattivi e modali, sia le API REST per le metriche aggregate di locali ed utenti.

```
statistiche-service/
├── Dockerfile
├── pom.xml
└── src/main/
    ├── java/com/connectedgames/statistiche/
    │   ├── StatisticheApplication.java                # Punto di avvio del microservizio Statistiche & Dashboard
    │   ├── config/
    │   │   └── SecurityConfig.java                    # Configurazione duplice: Form/OIDC Login per la UI + JWT Bearer per le API REST
    │   ├── controller/
    │   │   ├── DashboardController.java               # Controller MVC (@Controller) che serve le pagine HTML Thymeleaf
    │   │   ├── StatisticheRestController.java         # Controller REST (@RestController) per le API JSON delle statistiche
    │   │   └── AuthController.java                    # Gestione del flusso OIDC web (Login Keycloak, Callback, Token Exchange e Logout)
    │   ├── service/
    │   │   ├── StatisticheBackendService.java         # Servizio applicativo per l'aggregazione delle metriche di dashboard, locali ed utenti
    │   │   └── HealthCheckService.java                # Servizio per il monitoraggio dello stato di salute di tutti i componenti cloud e database
    │   ├── repository/
    │   │   └── StatisticheRepository.java             # Query SQL native ad alte prestazioni tramite Spring JdbcTemplate
    │   └── dto/
    │       ├── StatisticheGlobaliResponse.java        # DTO contenente le metriche generali della piattaforma (totale partite, utenti attivi, punti, ecc.)
    │       ├── StatisticheLocaleResponse.java         # DTO per le statistiche di un singolo locale (giochi più usati, utenti distinti)
    │       ├── StatisticheUtenteResponse.java         # DTO per il dettaglio delle prestazioni del singolo giocatore (vittorie, sconfitte, win rate)
    │       ├── HealthStatusResponse.java              # DTO per lo stato di salute globale del sistema (servizi cloud e database)
    │       ├── GiocatoreVittorieStat.java             # DTO di supporto per la classifica dei migliori giocatori
    │       ├── GiocoStat.java                         # DTO di supporto per la ripartizione dei giochi utilizzati
    │       ├── LocaleStat.java                        # DTO di supporto per la classifica dei locali più attivi
    │       ├── PartiteTempoStat.java                  # DTO di supporto per le statistiche temporali delle partite
    │       └── TorneoStat.java                        # DTO di supporto per le metriche sintetiche dei tornei
    └── resources/
        ├── application.yml                            # Configurazione porta 8084, datasource PostgreSQL e credenziali OIDC
        └── templates/
            ├── dashboard.html                         # Dashboard Super Admin completa con grafici Chart.js, filtri e 3 modali interattive
            ├── utenti.html                            # Vista HTML dedicata alla lista e ricerca utenti
            ├── partite.html                           # Vista HTML per la consultazione dello storico partite
            ├── tornei.html                            # Vista HTML per la lista dei tornei e classifiche
            ├── servizi.html                           # Vista HTML per il monitoraggio dello stato di salute dei servizi cloud
            └── fragments/                             # Componenti HTML Thymeleaf riutilizzabili (navbar, sidebar)
```

### Dettaglio Cartelle e Componenti:
* **`controller/`**:
  * `DashboardController.java`: Renderizza le viste Thymeleaf iniettando i modelli dei dati.
  * `AuthController.java`: Gestisce la sessione OIDC del browser con Keycloak per gli amministratori di piattaforma.
  * `StatisticheRestController.java`: Espone gli endpoint `/api/v1/statistiche/**`.
* **`repository/`**: `StatisticheRepository.java` utilizza query SQL native e `JdbcTemplate` anziché Hibernate per eseguire aggregazioni veloci su grandi moli di dati (es. `COUNT(DISTINCT)`, `SUM`, `AVG`, `EPOCH`).
* **`templates/`**: Contiene la pagina `dashboard.html` realizzata con Bootstrap 5, icone Bootstrap, Chart.js ed oltre 200 righe di JavaScript AJAX vanilla per l'apertura dinamica delle modali di dettaglio.

---

## Sintesi delle Dipendenze dei Moduli

| Modulo | Database | Autenticazione / Security | Rendering UI |
| :--- | :--- | :--- | :--- |
| **`service-gateway`** | N/A (Stateless) | Spring Security WebFlux (JWT Bearer) | Swagger UI (`/docs`) |
| **`partita-service`** | PostgreSQL (`platform_db` via JPA) | Spring Security OAuth2 Resource Server | API REST JSON |
| **`torneo-service`** | PostgreSQL (`platform_db` via JPA) | Spring Security OAuth2 Resource Server | API REST JSON |
| **`statistiche-service`** | PostgreSQL (`platform_db` via `JdbcTemplate`) | Spring Security OIDC Web Session + JWT | Thymeleaf + Bootstrap 5 + Chart.js |
