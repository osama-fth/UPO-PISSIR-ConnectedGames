# 📘 Documentazione di Specifica e Progettazione Architetturale
## Connected Games Platform
**Progetto di Laboratorio PISSIR — A.A. 2025/2026 — Università del Piemonte Orientale**

---

## INDICE

1. **ARCHITETTURA DEI CONTAINER E RETI DOCKER**
   - 1.1 Schema dei Container e Reti Separate (Deployment Diagram)

2. **SPECIFICA DEI REQUISITI E DOMINIO APPLICATIVO**
   - 2.1 Dominio Applicativo
   - 2.2 Diagramma UML dei Casi d'Uso
   - 2.3 Descrizione Testuale di Tutti i Casi d'Uso (UC-01 .. UC-08)
   - 2.4 Diagramma UML delle Classi del Dominio

3. **PROGETTAZIONE ARCHITETTURALE A MICROSERVIZI**
   - 3.1 Pattern Architetturali Adottati
   - 3.2 Diagramma dei Package
   - 3.3 Diagramma delle Classi di Implementazione
   - 3.4 Diagrammi di Sequenza per Ogni Caso d'Uso (UC-01 .. UC-08)
   - 3.5 Definizione delle API REST (OpenAPI / Swagger YAML)
   - 3.6 Definizione dei Topic MQTT e Schema Payload

---

# 1. ARCHITETTURA DEI CONTAINER E RETI DOCKER

## 1.1 Schema dei Container e Reti Separate (Deployment Diagram)

La **Connected Games Platform** è containerizzata con Docker Compose e strutturata su **tre reti isolati (Bridge Tier)** per garantire la segregazione della sicurezza ed il controllo dei flussi multi-tenant.

```mermaid
graph TB
    subgraph "RETE LOCALE 1: platform-locale1-tier (Bridge)"
        MOSQ1["Container: mosquitto-locale1<br>Image: connectedgames-mosquitto<br>Ports: 8883 (MQTTS), 1883"]
        EDGE1["Container: edge-locale1<br>Image: connectedgames-edge<br>Ports: 3001:3001<br>Volume: edge-locale1-data"]
        MOSQ1 <-->|"MQTTS / SSL (Port 8883)"| EDGE1
    end

    subgraph "RETE LOCALE 2: platform-locale2-tier (Bridge)"
        MOSQ2["Container: mosquitto-locale2<br>Image: connectedgames-mosquitto<br>Ports: 8884 (MQTTS), 1884"]
        EDGE2["Container: edge-locale2<br>Image: connectedgames-edge<br>Ports: 3002:3002<br>Volume: edge-locale2-data"]
        MOSQ2 <-->|"MQTTS / SSL (Port 8884)"| EDGE2
    end

    subgraph "RETE BACKEND CENTRALE: platform-backend-tier (Internal Bridge)"
        GW["Container: service-gateway<br>Image: connectedgames-service-gateway<br>Port: 8081:8081"]
        KC["Container: keycloak<br>Image: keycloak:24.0.0<br>Port: 9080:8080<br>Volume: keycloak_data"]
        PG["Container: postgres-db<br>Image: postgres:15-alpine<br>Port: 5432:5432<br>Volume: postgres_data"]
        
        PART["Container: partita-service<br>Image: connectedgames-partita-service<br>Port: 8082 (Internal)"]
        TORN["Container: torneo-service<br>Image: connectedgames-torneo-service<br>Port: 8083 (Internal)"]
        STAT["Container: statistiche-service<br>Image: connectedgames-statistiche-service<br>Port: 8084 (Internal)"]

        GW -->|"HTTP (Proxy)"| PART
        GW -->|"HTTP (Proxy)"| TORN
        GW -->|"HTTP (Proxy)"| STAT
        GW -->|"JWT Validation"| KC

        PART -->|"JDBC (platform_db)"| PG
        TORN -->|"JDBC (platform_db)"| PG
        STAT -->|"JDBC (platform_db)"| PG
        KC -->|"JDBC (keycloak_db)"| PG
    end

    EDGE1 ==>|"REST / Bearer JWT (Bulk Sync)"| GW
    EDGE2 ==>|"REST / Bearer JWT (Bulk Sync)"| GW
    EDGE1 -.->|"OIDC Auth Flow"| KC
    EDGE2 -.->|"OIDC Auth Flow"| KC
```

### Isolamento delle Reti:
1. **`platform-locale1-tier`**: Rete privata per il Locale 1 (Bar Belvedere). Collega solo il broker `mosquitto-locale1` e il relativo `edge-locale1`.
2. **`platform-locale2-tier`**: Rete privata per il Locale 2 (Sala Giochi Roma). Collega `mosquitto-locale2` ed `edge-locale2`.
3. **`platform-backend-tier`** *(Internal)*: Rete interna protetta del Cloud Centrale. Collega il `service-gateway`, i microservizi Spring Boot (`partita-service`, `torneo-service`, `statistiche-service`), il database `postgres-db` (con DB logici distinti `platform_db` e `keycloak_db`) e l'Identity Provider `keycloak`.

---

# 2. SPECIFICA DEI REQUISITI E DOMINIO APPLICATIVO

## 2.1 Dominio Applicativo

Il sistema gestisce tavoli da gioco fisici (Calciobalilla, Freccette) distribuibili in più locali commercialmente indipendenti.
- **Livello IoT / Sensori**: Sensori fisici o simulatori inviano eventi istantanei via MQTTS al broker locale.
- **Livello Edge**: Il nodo locale garantisce la giocabilità senza internet, bufferizzando i match conclusi su DB SQLite locale.
- **Livello Cloud**: Gestisce il bulk-sync, la federazione degli utenti con Keycloak OIDC, l'organizzazione dei tornei e la reportistica aggregata.

---

## 2.2 Diagramma UML dei Casi d'Uso

```mermaid
graph TD
    Giocatore(("Giocatore"))
    AdminLocale(("Admin Locale"))
    AdminPiattaforma(("Admin Piattaforma"))
    SensoreIoT(("Sensore IoT / Simulatore"))
    EdgeNode(("Edge Node Service"))

    subgraph "Connected Games Platform"
        UC01("UC-01: Autenticazione OIDC (SSO)")
        UC02("UC-02: Avvio Nuova Partita")
        UC03("UC-03: Rilevamento Evento di Gioco")
        UC04("UC-04: Sincronizzazione Bulk Offline")
        UC05("UC-05: Creazione Torneo Globale")
        UC06("UC-06: Iscrizione a Torneo (Auto-Reg)")
        UC07("UC-07: Consulta Classifica e Statistiche")
        UC08("UC-08: Monitoraggio Locale ed Edge")
    end

    Giocatore --> UC01
    Giocatore --> UC02
    Giocatore --> UC06
    Giocatore --> UC07

    SensoreIoT --> UC03
    EdgeNode --> UC04

    AdminLocale --> UC01
    AdminLocale --> UC08

    AdminPiattaforma --> UC01
    AdminPiattaforma --> UC05
    AdminPiattaforma --> UC07
    AdminPiattaforma --> UC08

    UC02 ..->|"include"| UC01
    UC06 ..->|"include"| UC01
    UC03 ..->|"include"| UC02
    UC04 ..->|"include"| UC01
```

---

## 2.3 Descrizione Testuale di Tutti i Casi d'Uso

### UC-01: Autenticazione OIDC (SSO)
- **Attori**: Giocatore, Admin Locale, Admin Piattaforma.
- **Pre-condizioni**: Keycloak attivo; l'utente accede alla dashboard.
- **Flusso Principale**:
  1. L'utente clicca su "Login".
  2. Il client reindirizza su Keycloak OIDC via Authorization Code Flow con PKCE.
  3. L'utente inserisce le credenziali. Keycloak valida e restituisce l'Authorization Code.
  4. Il client scambia il codice per Access Token (JWT), ID Token e Refresh Token.
- **Post-condizioni**: Utente autenticato con il proprio ruolo Keycloak (`giocatore`, `admin_locale`, `admin_piattaforma`).

### UC-02: Avvio Nuova Partita
- **Attori**: Giocatore (1 e 2).
- **Pre-condizioni**: Edge Node operativo; Giocatore 1 autenticato.
- **Flusso Principale**:
  1. Il Giocatore 1 sceglie il gioco (Calciobalilla/Freccette) ed il secondo giocatore (autenticato o Ospite).
  2. L'Edge Node genera un UUID partita, imposta stato `IN_CORSO` e salva lo stato iniziale in SQLite `partite_attive` (Fix C1).
- **Post-condizioni**: Partita in corso pronta a ricevere eventi.

### UC-03: Rilevamento Evento di Gioco (MQTTS)
- **Attori**: Sensore IoT / Simulatore, Edge Node.
- **Pre-condizioni**: Partita in stato `IN_CORSO`.
- **Flusso Principale**:
  1. Il sensore rileva un evento (Gol / Tiro) e pubblica su `locale/{LOCALE_ID}/eventi` via MQTTS TLS (Fix C2).
  2. L'Edge Node elabora il punteggio e aggiorna SQLite `partite_attive`.
  3. Al raggiungimento della condizione di fine partita, la partita viene marcata `TERMINATA`, salvata nel buffer SQLite `partite_buffer` (`sincronizzata = 0`) e rimossa dalle partite attive.
- **Post-condizioni**: Partita conclusa salvata nel buffer offline.

### UC-04: Sincronizzazione Bulk Offline
- **Attori**: Edge Node Service, Service Gateway.
- **Pre-condizioni**: Partite non sincronizzate in SQLite (`sincronizzata = 0`).
- **Flusso Principale**:
  1. Il cron-job dell'Edge acquisisce un JWT per `edge-sync-client` via Client Credentials Grant (Fix M5).
  2. Invia `POST /api/v1/locali/{localeId}/partite/sincronizza` al Service Gateway.
  3. Il Gateway esegue `TenantVerificationGatewayFilterFactory` (Fix C3), verificando la corrispondenza del `locale_id`.
  4. `PartitaService` valida il `localeId` (Fix C4), salva le partite nel DB PostgreSQL `platform_db` ed auto-registra i giocatori.
  5. L'Edge riceve 200 OK e marca le partite come `sincronizzata = 1` in SQLite.
- **Post-condizioni**: Partite sincronizzate sul Cloud.

### UC-05: Creazione Torneo Globale
- **Attori**: Admin Piattaforma, Admin Locale.
- **Pre-condizioni**: Utente autenticato con ruolo amministrativo.
- **Flusso Principale**:
  1. L'admin definisce nome, gioco, date e locali partecipanti.
  2. Invia `POST /api/v1/tornei`. `TorneoService` salva il torneo in `platform_db`.
- **Post-condizioni**: Torneo creato ed aperto alle iscrizioni.

### UC-06: Iscrizione a Torneo (con Auto-Registrazione)
- **Attori**: Giocatore.
- **Pre-condizioni**: Giocatore autenticato; torneo non concluso.
- **Flusso Principale**:
  1. Il giocatore seleziona un torneo e invia `POST /api/v1/tornei/{torneoId}/iscrizioni`.
  2. `TorneoService` cerca l'utente in `platform_db.utente`.
  3. Se l'utente non ha mai giocato partite prima e non esiste in `platform_db`, il servizio lo auto-registra dinamente estraendo lo `username` dai claim del JWT.
  4. Salva l'iscrizione in `iscrizione_torneo`.
- **Post-condizioni**: Giocatore iscritto con successo al torneo.

### UC-07: Consulta Classifica e Statistiche
- **Attori**: Giocatore, Admin Piattaforma.
- **Pre-condizioni**: Utente autenticato o navigazione pubblica.
- **Flusso Principale**:
  1. Richiesta di `GET /api/v1/tornei/{torneoId}/classifica` o `GET /api/v1/statistiche/...`.
  2. Il servizio calcola le metriche (partite giocate, vinte, percentuale di vittoria).
- **Post-condizioni**: Classifica e statistiche restituite al client.

### UC-08: Monitoraggio Locale ed Edge
- **Attori**: Admin Locale, Admin Piattaforma.
- **Pre-condizioni**: Utente autenticato.
- **Flusso Principale**:
  1. L'admin consulta la dashboard dello stato degli Edge Node e delle installazioni di gioco.
  2. Il Gateway verifica i permessi di lettura dei dati del locale.
- **Post-condizioni**: Dati di monitoraggio visualizzati.

---

## 2.4 Diagramma UML delle Classi del Dominio

```mermaid
classDiagram
    class Locale {
        +String id
        +String nome
        +String indirizzo
        +String citta
    }

    class Gioco {
        +String id
        +String nome
        +String descrizione
    }

    class InstallazioneGioco {
        +String id
        +String note
    }

    class Utente {
        +UUID id
        +String username
        +String email
        +OffsetDateTime dataRegistrazione
    }

    class Partita {
        +UUID id
        +Integer punteggio1
        +Integer punteggio2
        +OffsetDateTime dataInizio
        +OffsetDateTime dataFine
        +OffsetDateTime dataSincronizzazione
    }

    class Torneo {
        +UUID id
        +String nome
        +String stato
        +OffsetDateTime dataInizio
        +OffsetDateTime dataFine
    }

    class IscrizioneTorneo {
        +OffsetDateTime dataIscrizione
    }

    Locale "1" -- "*" InstallazioneGioco : ospita
    Gioco "1" -- "*" InstallazioneGioco : definisce
    InstallazioneGioco "1" -- "*" Partita : esegue
    Locale "1" -- "*" Partita : localizzata in
    Utente "1" -- "*" Partita : Giocatore 1
    Utente "1" -- "*" Partita : Giocatore 2
    Torneo "0..1" -- "*" Partita : classifica
    Torneo "*" -- "*" Locale : associato a
    Torneo "1" -- "*" IscrizioneTorneo : possiede
    Utente "1" -- "*" IscrizioneTorneo : effettua
```

---

# 3. PROGETTAZIONE ARCHITETTURALE A MICROSERVIZI

## 3.1 Pattern Architetturali Adottati
- **API Gateway Pattern**: Router centrale e risorsa di sicurezza OAuth2/JWT.
- **Tenant Verification Filter**: Filtro Gateway per prevenire accessi ed iniezioni dati cross-tenant.
- **Store-and-Forward (Edge Resiliency)**: Buffer locale SQLite con persistenza attiva per resilienza ai crash (C1).
- **Client Credentials Flow**: Autenticazione sicura machine-to-machine per il sync background (M5).

---

## 3.2 Diagramma dei Package

```mermaid
graph TB
    subgraph "com.connectedgames.gateway (Service Gateway)"
        G_Config["config (SecurityConfig)"]
        G_Filter["filter (TenantVerificationGatewayFilterFactory)"]
    end

    subgraph "com.connectedgames.core (Partita Service)"
        P_Ctrl["controller (PartitaController)"]
        P_Svc["service (PartitaService)"]
        P_Repo["repository (PartitaRepository, UtenteRepository)"]
        P_Ent["entity (Partita, Utente, Locale)"]
    end

    subgraph "com.connectedgames.core (Torneo Service)"
        T_Ctrl["controller (TorneoController)"]
        T_Svc["service (TorneoService)"]
        T_Repo["repository (TorneoRepository, IscrizioneTorneoRepository)"]
        T_Ent["entity (Torneo, IscrizioneTorneo)"]
    end

    subgraph "com.connectedgames.statistiche (Statistiche Service)"
        S_Ctrl["controller (AuthController, DashboardController)"]
        S_Svc["service (StatisticheService)"]
    end

    subgraph "edge-node (Node.js Service)"
        E_Server["server.js"]
        E_Engine["services/game-engine.js"]
        E_Sync["services/sync-service.js"]
        E_Db["services/sqlite-db.js"]
        E_Mqtt["services/mqtt-client.js"]
        E_Oidc["services/oidc-client.js"]
    end

    E_Sync --> G_Filter
    G_Filter --> P_Ctrl
    G_Filter --> T_Ctrl
    P_Ctrl --> P_Svc
    P_Svc --> P_Repo
    T_Ctrl --> T_Svc
    T_Svc --> T_Repo
```

---

## 3.3 Diagramma delle Classi di Implementazione

```mermaid
classDiagram
    class TenantVerificationGatewayFilterFactory {
        +apply(Config) GatewayFilter
    }

    class PartitaController {
        -PartitaService partitaService
        +sincronizzaPartite(String, List~PartitaSyncInput~) ResponseEntity~SyncResultResponse~
        +getPartite(...) ResponseEntity
    }

    class PartitaService {
        -PartitaRepository partitaRepo
        -UtenteRepository utenteRepo
        -LocaleRepository localeRepo
        +sincronizzaPartite(String, List~PartitaSyncInput~) SyncResultResponse
        -trovaORegistraUtente(UUID, String) Utente
    }

    class TorneoController {
        -TorneoService torneoService
        +creaTorneo(TorneoCreateInput) ResponseEntity~TorneoResponse~
        +iscriviGiocatore(UUID, IscrizioneInput) ResponseEntity~IscrizioneTorneoResponse~
        +getClassifica(UUID) ResponseEntity~ClassificaTorneoResponse~
    }

    class TorneoService {
        -TorneoRepository torneoRepo
        -IscrizioneTorneoRepository iscrizioneRepo
        -UtenteRepository utenteRepo
        +iscriviGiocatore(UUID, UUID) IscrizioneTorneoResponse
        +getClassifica(UUID) ClassificaTorneoResponse
    }

    class GameEngine {
        -Map activeMatches
        +creaPartita(giocoId, g1, g2) Object
        +processaEvento(matchId, evento) Object
        +terminaPartita(match) Object
        +caricaPartiteAttiveDaDb() void
        +avviaTimeoutPartiteAbbandonate() void
    }

    class SqliteDb {
        +initDatabase() void
        +salvaPartitaAttiva(match) void
        +rimuoviPartitaAttiva(matchId) void
        +salvaPartita(partita) Object
        +getPartiteNonSincronizzate() Array
        +segnaComeSincronizzate(ids) number
    }

    PartitaController --> PartitaService
    TorneoController --> TorneoService
    GameEngine --> SqliteDb
```

---

## 3.4 Diagrammi di Sequenza per Ciascun Caso d'Uso (UC-01 .. UC-08)

### UC-01: Autenticazione OIDC (SSO PKCE)
```mermaid
sequenceDiagram
    autonumber
    actor U as Utente (Giocatore/Admin)
    participant B as Browser Client
    participant E as Edge Node (oidc-client.js)
    participant KC as Keycloak (OIDC Server)

    U->>B: Clicca "Login con Keycloak"
    B->>E: GET /auth/login
    E->>E: Genera Code Verifier & Code Challenge (PKCE)
    E-->>B: Redirect to Keycloak Auth URL
    B->>KC: GET /protocol/openid-connect/auth (PKCE)
    KC-->>B: Rendering Form Login Keycloak
    U->>B: Inserisce Username e Password
    B->>KC: POST Login Credentials
    KC-->>B: Redirect a Edge Callback + Authorization Code
    B->>E: GET /auth/callback?code=xxx
    E->>KC: POST /token (Code + Code Verifier)
    KC-->>E: JWT Access Token + ID Token
    E-->>B: Sessione Creata & Redirect a Dashboard
```

### UC-02: Avvio Nuova Partita (Match Init & SQLite Active Match)
```mermaid
sequenceDiagram
    autonumber
    actor G as Giocatore 1
    participant B as Browser Client
    participant E as Edge Node (game-engine.js)
    participant DB as SQLite (edge.sqlite3)

    G->>B: Seleziona Gioco (es. Calciobalilla) e Giocatore 2
    B->>E: POST /api/partite (giocoId, g1, g2)
    E->>E: creaPartita() -> Genera Match UUID (IN_CORSO)
    E->>DB: salvaPartitaAttiva(match) [Persistenza C1]
    E-->>B: 200 OK { matchId, stato: "IN_CORSO" }
```

### UC-03: Rilevamento Evento di Gioco (MQTTS TLS)
```mermaid
sequenceDiagram
    autonumber
    participant S as Sensore IoT / Simulatore
    participant M as Mosquitto MQTTS Broker
    participant E as Edge Node (mqtt-client.js & game-engine.js)
    participant DB as SQLite (edge.sqlite3)

    S->>M: PUBLISH locale/BAR_BELVEDERE/eventi (TLS C2)
    M->>E: On Event (GOAL / TIRO)
    E->>E: processaEvento() -> Aggiorna Punteggio Match
    E->>DB: salvaPartitaAttiva(match) [Aggiorna JSON Active]

    opt Se Punteggio Finale Raggiunto (es. 10 gol)
        E->>E: terminaPartita() -> Marca TERMINATA
        E->>DB: salvaPartita(buffer, sincronizzata=0)
        E->>DB: rimuoviPartitaAttiva(matchId)
    end
```

### UC-04: Sincronizzazione Bulk Offline (Client Credentials & Tenant Verification)
```mermaid
sequenceDiagram
    autonumber
    participant E as Edge Sync Service
    participant KC as Keycloak IdP
    participant GW as Service Gateway
    participant TF as TenantVerificationFilter
    participant PS as Partita Service (Cloud)
    participant DB as PostgreSQL (platform_db)

    E->>E: Cron 2 min -> Legge partite (sincronizzata=0)
    E->>KC: POST /token (grant_type=client_credentials, Fix M5)
    KC-->>E: JWT Access Token (edge-sync-client)
    E->>GW: POST /api/v1/locali/BAR_BELVEDERE/partite/sincronizza
    GW->>TF: Intercetta Richiesta
    TF->>TF: Verifica locale_id claim vs Path URL (Fix C3)
    TF->>PS: Inoltra Bulk Payload
    PS->>PS: Valida localeId path vs payload (Fix C4)
    PS->>DB: Salva Partite & Auto-Registra Utenti
    PS-->>GW: 200 OK { salvate: [UUIDs], fallite: [] }
    GW-->>E: 200 OK
    E->>E: segnaComeSincronizzate([UUIDs]) in SQLite
```

### UC-05: Creazione Torneo Globale
```mermaid
sequenceDiagram
    autonumber
    actor A as Admin Piattaforma
    participant B as Browser Client
    participant GW as Service Gateway
    participant TS as Torneo Service
    participant DB as PostgreSQL (platform_db)

    A->>B: Compila Form Nuovo Torneo
    B->>GW: POST /api/v1/tornei (Bearer JWT Admin)
    GW->>GW: Verfica Ruolo admin_piattaforma
    GW->>TS: Inoltra Payload Creazione
    TS->>DB: Salva Torneo & Locali Associati
    TS-->>GW: 200 OK TorneoResponse
    GW-->>B: Torneo Creato con Successo
```

### UC-06: Iscrizione a Torneo (con Auto-Registrazione Utente)
```mermaid
sequenceDiagram
    autonumber
    actor G as Giocatore
    participant B as Browser Client
    participant GW as Service Gateway
    participant TS as Torneo Service
    participant DB as PostgreSQL (platform_db)

    G->>B: Clicca "Iscriviti al Torneo"
    B->>GW: POST /api/v1/tornei/{torneoId}/iscrizioni + Bearer JWT
    GW->>TS: Inoltra Iscrizione
    TS->>DB: utenteRepo.findById(utenteId)
    
    alt Utente Non Presente in platform_db
        TS->>TS: Estrae preferred_username da JWT Claims
        TS->>DB: Auto-registra Utente in platform_db.utente
    end

    TS->>DB: Salva IscrizioneTorneo
    TS-->>GW: 200 OK IscrizioneTorneoResponse
    GW-->>B: Conferma Iscrizione Riuscita
```

### UC-07: Consulta Classifica e Statistiche
```mermaid
sequenceDiagram
    autonumber
    actor U as Utente / Admin
    participant B as Browser Client
    participant GW as Service Gateway
    participant TS as Torneo / Statistiche Service
    participant DB as PostgreSQL (platform_db)

    U->>B: Richiede Classifica Torneo / Statistiche
    B->>GW: GET /api/v1/tornei/{torneoId}/classifica
    GW->>TS: Inoltra Richiesta GET
    TS->>DB: Query Partite & Iscrizioni del Torneo
    TS->>TS: Calcola Vittorie, Giocate e % Vittoria
    TS-->>GW: 200 OK ClassificaTorneoResponse
    GW-->>B: Renderizza Tabella Classifica
```

### UC-08: Monitoraggio Locale ed Edge (Health Check & Actuator)
```mermaid
sequenceDiagram
    autonumber
    actor A as Admin Locale / DevOps
    participant B as Browser Client / Prometheus
    participant GW as Service Gateway / Edge Node
    participant ACT as Actuator Endpoints

    A->>B: Accesso a Dashboard Stato o Health Check
    B->>GW: GET /actuator/health oppure GET /api/v1/locali/BAR_BELVEDERE
    GW->>ACT: Query Probes (Liveness & Readiness)
    ACT-->>GW: 200 OK { status: "UP", components: { db: "UP" } }
    GW-->>B: Visualizza Stato Operativo dei Servizi
```

---

## 3.5 Definizione delle API REST (OpenAPI v3.0 YAML)

Le API REST della piattaforma sono formalmente specificate ed eseguibili tramite la documentazione **OpenAPI 3.0 (YAML)** situata nel codebase in:
📄 **`service-gateway/src/main/resources/static/openapi-spec.yaml`** (accessibile da Swagger UI a `http://localhost:8081/docs`).

### Specifica OpenAPI YAML Completa del Sistema:

```yaml
openapi: 3.0.3
info:
  title: Connected Games Platform — Core API Specification
  description: >
    API REST centralizzate esposte dal Service Gateway (porta 8081).
    Gestisce la sincronizzazione bulk delle partite dagli Edge Node,
    la gestione dei tornei, l'anagrafica utenti e le statistiche globali.
  version: 1.0.0

servers:
  - url: http://localhost:8081
    description: Service Gateway (Ambiente Locale / Docker)

paths:
  /api/v1/locali/{localeId}/partite/sincronizza:
    post:
      summary: Sincronizzazione massiva partite (Bulk Sync dagli Edge Node)
      description: >
        Riceve un array di partite completate dal buffer SQLite dell'Edge Node.
        Richiede autenticazione Bearer JWT e ruolo admin_piattaforma o admin_locale (con locale_id match).
      parameters:
        - name: localeId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/PartitaSyncInput'
      responses:
        '200':
          description: Esito della sincronizzazione (partite salvate e fallite)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SyncResultResponse'
        '403':
          description: Accesso negato (Tenant Mismatch)

  /api/v1/tornei:
    get:
      summary: Lista dei tornei
      parameters:
        - name: stato
          in: query
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Lista tornei trovati
    post:
      summary: Creazione nuovo torneo
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TorneoCreateInput'
      responses:
        '200':
          description: Torneo creato con successo

  /api/v1/tornei/{torneoId}/iscrizioni:
    post:
      summary: Iscrizione di un giocatore a un torneo
      parameters:
        - name: torneoId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/IscrizioneInput'
      responses:
        '200':
          description: Giocatore iscritto con successo (auto-registrazione se nuovo utente)

  /api/v1/tornei/{torneoId}/classifica:
    get:
      summary: Classifica calcolata di un torneo
      parameters:
        - name: torneoId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Classifica del torneo restituita

components:
  schemas:
    PartitaSyncInput:
      type: object
      required:
        - id
        - installazioneId
        - localeId
        - punteggio1
        - punteggio2
        - dataInizio
        - dataFine
      properties:
        id:
          type: string
          format: uuid
        installazioneId:
          type: string
        localeId:
          type: string
        giocatore1Id:
          type: string
          format: uuid
        giocatore1Username:
          type: string
        giocatore2Id:
          type: string
          format: uuid
        giocatore2Username:
          type: string
        punteggio1:
          type: integer
        punteggio2:
          type: integer
        dataInizio:
          type: string
          format: date-time
        dataFine:
          type: string
          format: date-time
        torneoId:
          type: string
          format: uuid

    SyncResultResponse:
      type: object
      properties:
        salvate:
          type: array
          items:
            type: string
            format: uuid
        fallite:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
                format: uuid
              errore:
                type: string

    TorneoCreateInput:
      type: object
      required:
        - nome
        - giocoId
        - dataInizio
        - dataFine
        - localiId
      properties:
        nome:
          type: string
        giocoId:
          type: string
        dataInizio:
          type: string
          format: date-time
        dataFine:
          type: string
          format: date-time
        localiId:
          type: array
          items:
            type: string

    IscrizioneInput:
      type: object
      required:
        - utenteId
      properties:
        utenteId:
          type: string
          format: uuid
```

---

## 3.6 Definizione dei Topic MQTT e Schema Payload

Le comunicazioni IoT locali tra i sensori fisici (o simulatori) ed il broker **Mosquitto** avvengono via **MQTTS (porta 8883 / 8884)** con cifratura TLS SSL ed autenticazione tramite password file.

### Tabella dei Topic MQTT:

| Topic | Ruolo Pub | Ruolo Sub | QoS | Descrizione |
|:---|:---|:---|:---|:---|
| `locale/{LOCALE_ID}/eventi` | `simulator` | `edge-client` | `1` | Stream degli eventi di gioco (Gol, Tiri) per la partita in corso nel locale. |
| `test/ping` | `simulator` | `edge-client` | `0` | Health check del listener MQTTS Mosquitto. |

### Schema Payload Evento Calciobalilla (GOAL):
```json
{
  "tipo": "GOAL",
  "matchId": "0d640c9d-0238-47f0-9128-0af6209cc264",
  "giocoId": "calciobalilla",
  "team": "A",
  "timestamp": "2026-08-08T10:45:00.123Z"
}
```

### Schema Payload Evento Freccette 301 (TIRO):
```json
{
  "tipo": "TIRO",
  "matchId": "0d640c9d-0238-47f0-9128-0af6209cc264",
  "giocoId": "freccette",
  "settore": "20",
  "moltiplicatore": 3,
  "timestamp": "2026-08-08T10:46:12.456Z"
}
```
