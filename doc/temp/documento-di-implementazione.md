# Documento di Implementazione Architetturale
## Connected Games Platform
**Progetto di Laboratorio PISSIR — A.A. 2025/2026 — Università del Piemonte Orientale**  
**Autori:** Foutih Osama, Bellotti Lorenzo, Riccardo Negrini

---

## INDICE
1. **ARCHITETTURA DI DEPLOYMENT E CONTAINER DOCKER**
   - 1.1 Diagramma di Deployment (PlantUML)
   - 1.2 Descrizione delle Reti e Volumi Containerizzati
2. **DIAGRAMMA DEI PACKAGE DI IMPLEMENTAZIONE**
   - 2.1 Diagramma dei Package (PlantUML)
3. **DIAGRAMMA DELLE CLASSI DI IMPLEMENTAZIONE**
   - 3.1 Diagramma delle Classi Backend ed Edge (PlantUML)
4. **DIAGRAMMI DI SEQUENZA DEI FLUSSI CRITICI**
   - 4.1 UC-01: Autenticazione OIDC (SSO PKCE)
   - 4.2 UC-02: Avvio Nuova Partita ed Persistenza SQLite
   - 4.3 UC-03: Rilevamento Evento MQTTS e Chiusura Partita
   - 4.4 UC-04: Sincronizzazione Bulk Offline e Tenant Verification
5. **DEFINIZIONE DELLE API REST (OpenAPI 3.0)**
   - 5.1 Endpoint Principali del Service Gateway
6. **DEFINIZIONE DEI TOPIC MQTT E SCHEMA PAYLOAD**
   - 6.1 Topic MQTTS e Struttura JSON degli Eventi IoT

---

# 1. ARCHITETTURA DI DEPLOYMENT E CONTAINER DOCKER

## 1.1 Diagramma di Deployment (PlantUML)

```plantuml
@startuml Diagramma_Deployment_Connected_Games

skinparam componentStyle rectangle
skinparam shadowing false
skinparam packageStyle rectangle

node "Locale Fisico (Edge Tier / locale-tier)" as LOCALE {
  node "Container: Mosquitto Broker" as M_NODE {
    component "Broker MQTT\n(Porta 8883 / 1883)" as MOSQ
  }
  
  node "Container: Edge Node Service" as E_NODE {
    component "Edge Node Gateway\n(Porta 3001)" as EDGE
    database "SQLite Local Buffer" as SQLITE
  }
  
  MOSQ <--> EDGE : MQTTS
  EDGE <--> SQLITE : SQL
}

node "Identity Provider (Condiviso / Ponte tra le reti)" as AUTH_ZONE {
  node "Container: Keycloak IdP" as KC_NODE {
    component "Keycloak Server\n(Porta 9080)" as KC
  }
}

node "Cloud Backend (backend-tier)" as CLOUD {
  
  node "Container: Service Gateway" as GW_NODE {
    component "Spring Cloud Gateway\n(Porta 8081)" as GW
  }

  node "Container: Partita Service" as PART_NODE {
    component "Partita Microservice\n(Porta 8082)" as PART
  }

  node "Container: Torneo Service" as TORN_NODE {
    component "Torneo Microservice\n(Porta 8083)" as TORN
  }

  node "Container: Statistiche Service" as STAT_NODE {
    component "Statistiche Microservice\n(Porta 8084)" as STAT
  }

  node "Container: PostgreSQL DB" as PG_NODE {
    database "platform_db\n(Porta 5432)" as DB_PLATFORM
    database "keycloak_db\n(Porta 5432)" as DB_KEYCLOAK
  }

  GW --> PART : HTTP
  GW --> TORN : HTTP
  GW --> STAT : HTTP
  GW --> KC : HTTP

  PART --> DB_PLATFORM : JDBC
  TORN --> DB_PLATFORM : JDBC
  STAT --> DB_PLATFORM : JDBC
  KC --> DB_KEYCLOAK : JDBC
}

EDGE ..> GW : REST / HTTP
EDGE ..> KC : HTTP / OIDC

@enduml
```

## 1.2 Descrizione delle Reti e Volumi Containerizzati
* **Reti Private Edge (`locale1-tier`, `locale2-tier`)**: Rete isolata per ciascun locale fisico. Collega il broker Mosquitto ed il nodo Edge locale. A questa rete appartiene anche il container **Keycloak**, permettendo ai client e nodi Edge di effettuare il login OIDC.
* **Rete Backend Cloud (`platform-backend-tier`)**: Rete interna riservata al backend che collega il Service Gateway, i microservizi Spring Boot (`partita-service`, `torneo-service`, `statistiche-service`), il DB PostgreSQL e **Keycloak** (per la validazione token JWT via backchannel).
* **Volumi Persistenti**: Volumi Docker dedicati per la persistenza dei dati PostgreSQL (`postgres_data`), di Keycloak (`keycloak_data`) e dei buffer SQLite sui nodi Edge.

---

# 2. DIAGRAMMA DEI PACKAGE DI IMPLEMENTAZIONE

## 2.1 Diagramma dei Package (PlantUML)

```plantuml
@startuml Diagramma_Package_Connected_Games

skinparam packageStyle rectangle
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 11

' ==========================================
' SUBSYSTEM 1: LOCAL EDGE NODE (Node.js / Express)
' ==========================================
package "edge (Node.js Express App)" as EDGE_SUB {
  package "edge.routes" as E_RTS {
    [auth.js]
    [dashboard.js]
    [game.js]
    [sync.js]
  }
  package "edge.services" as E_SVC {
    [game-engine.js]
    [sqlite-db.js]
    [sync-service.js]
    [mqtt-client.js]
    [oidc-client.js]
  }
  package "edge.middleware" as E_MID {
    [auth-middleware.js]
  }
  package "edge.views" as E_VIEWS {
    [EJS Templates]
  }

  E_RTS ..> E_SVC : require / usa
  E_RTS ..> E_MID : usa
  E_RTS ..> E_VIEWS : renderizza
}

' ==========================================
' SUBSYSTEM 2: SERVICE GATEWAY (Spring Cloud Gateway)
' ==========================================
package "com.connectedgames.gateway (service-gateway)" as GW_SUB {
  package "com.connectedgames.gateway.config" as G_CFG {
    [SecurityConfig]
  }
  package "com.connectedgames.gateway.filter" as G_FLT {
    [TenantVerificationGatewayFilterFactory]
  }

  G_FLT ..> G_CFG : usa
}

' ==========================================
' SUBSYSTEM 3: PARTITA MICROSERVICE
' ==========================================
package "com.connectedgames.core (partita-service)" as PART_SUB {
  package "com.connectedgames.core.controller" as P_CTRL {
    [PartitaController]
    [GiocoController]
    [LocaleController]
    [UtenteController]
  }
  package "com.connectedgames.core.service" as P_SVC {
    [PartitaService]
    [GiocoService]
    [UtenteService]
  }
  package "com.connectedgames.core.repository" as P_REPO {
    [PartitaRepository]
    [UtenteRepository]
    [LocaleRepository]
    [InstallazioneGiocoRepository]
  }
  package "com.connectedgames.core.entity" as P_ENT {
    [Partita]
    [Utente]
    [Locale]
    [InstallazioneGioco]
  }

  P_CTRL ..> P_SVC : usa
  P_SVC ..> P_REPO : usa
  P_SVC ..> P_ENT : manipola
  P_REPO ..> P_ENT : gestisce
}

' ==========================================
' SUBSYSTEM 4: TORNEO MICROSERVICE
' ==========================================
package "com.connectedgames.core (torneo-service)" as TORN_SUB {
  package "com.connectedgames.core.controller (Torneo)" as T_CTRL {
    [TorneoController]
  }
  package "com.connectedgames.core.service (Torneo)" as T_SVC {
    [TorneoService]
  }
  package "com.connectedgames.core.repository (Torneo)" as T_REPO {
    [TorneoRepository]
    [IscrizioneTorneoRepository]
  }
  package "com.connectedgames.core.entity (Torneo)" as T_ENT {
    [Torneo]
    [IscrizioneTorneo]
  }

  T_CTRL ..> T_SVC : usa
  T_SVC ..> T_REPO : usa
  T_SVC ..> T_ENT : manipola
  T_REPO ..> T_ENT : gestisce
}

' ==========================================
' SUBSYSTEM 5: STATISTICHE MICROSERVICE
' ==========================================
package "com.connectedgames.statistiche (statistiche-service)" as STAT_SUB {
  package "com.connectedgames.statistiche.controller" as S_CTRL {
    [StatisticheRestController]
    [DashboardController]
    [AuthController]
  }
  package "com.connectedgames.statistiche.service" as S_SVC {
    [StatisticheBackendService]
  }
  package "com.connectedgames.statistiche.repository" as S_REPO {
    [StatisticheRepository]
  }

  S_CTRL ..> S_SVC : usa
  S_SVC ..> S_REPO : usa
}

' ==========================================
' DIPENDENZE INTER-SUBSYSTEM (FLUSSI ARCHITETTURALI)
' ==========================================
E_SVC ..> GW_SUB : REST Sync HTTP
GW_SUB ..> PART_SUB : Forward HTTP
GW_SUB ..> TORN_SUB : Forward HTTP
GW_SUB ..> STAT_SUB : Forward HTTP

@enduml
```

---

# 3. DIAGRAMMA DELLE CLASSI DI IMPLEMENTAZIONE

## 3.1 Diagramma delle Classi Backend ed Edge (PlantUML)

```plantuml
@startuml Diagramma_Classi_Implementazione_Connected_Games

skinparam classAttributeIconSize 0
skinparam shadowing false
skinparam packageStyle rectangle

package "Service Gateway (service-gateway)" {
  class TenantVerificationGatewayFilterFactory {
    + apply(Config config) : GatewayFilter
  }
}

package "Partita Service (partita-service)" {
  class PartitaController {
    - PartitaService partitaService
    + sincronizzaPartite(String localeId, List<PartitaSyncInput> partite) : ResponseEntity<SyncResultResponse>
    + getPartite(String localeId, String giocoId, UUID giocatoreId, int page, int size) : ResponseEntity<Page<PartitaDetailResponse>>
    + getPartitaById(UUID partitaId) : ResponseEntity<PartitaDetailResponse>
  }

  class PartitaService {
    - PartitaRepository partitaRepo
    - UtenteRepository utenteRepo
    - LocaleRepository localeRepo
    - GiocoRepository giocoRepo
    - InstallazioneGiocoRepository installazioneRepo
    + sincronizzaPartite(String localeId, List<PartitaSyncInput> partite) : SyncResultResponse
    + getPartite(String localeId, String giocoId, UUID giocatoreId, int page, int size) : Page<PartitaDetailResponse>
    + getPartitaById(UUID partitaId) : PartitaDetailResponse
    - trovaORegistraUtente(UUID utenteId, String username) : Utente
  }
}

package "Torneo Service (torneo-service)" {
  class TorneoController {
    - TorneoService torneoService
    + getTornei(String stato) : ResponseEntity<List<TorneoResponse>>
    + getTorneoById(UUID torneoId) : ResponseEntity<TorneoResponse>
    + creaTorneo(TorneoCreateInput input) : ResponseEntity<TorneoResponse>
    + iscriviGiocatore(UUID torneoId, IscrizioneInput input) : ResponseEntity<IscrizioneTorneoResponse>
    + getClassifica(UUID torneoId) : ResponseEntity<ClassificaTorneoResponse>
    + cancellaTorneo(UUID torneoId) : void
  }

  class TorneoService {
    - TorneoRepository torneoRepo
    - IscrizioneTorneoRepository iscrizioneRepo
    - UtenteRepository utenteRepo
    - GiocoRepository giocoRepo
    + getTornei(String stato) : List<TorneoResponse>
    + creaTorneo(TorneoCreateInput input) : TorneoResponse
    + iscriviGiocatore(UUID torneoId, UUID utenteId, String localeId) : IscrizioneTorneoResponse
    + getClassifica(UUID torneoId) : ClassificaTorneoResponse
  }
}

package "Statistiche Service (statistiche-service)" {
  class StatisticheRestController {
    - StatisticheBackendService statisticheService
    + getStatistiche(Integer giorni, String giocoId) : ResponseEntity<StatisticheGlobaliResponse>
    + getStatisticheLocale(String localeId) : ResponseEntity<StatisticheLocaleResponse>
    + getStatisticheUtente(UUID utenteId) : ResponseEntity<StatisticheUtenteResponse>
  }

  class StatisticheBackendService {
    - StatisticheRepository repository
    + getStatisticheGlobali(Integer giorni, String giocoId) : StatisticheGlobaliResponse
    + getStatistichePerLocale(String localeId) : StatisticheLocaleResponse
    + getStatistichePerUtente(UUID utenteId) : StatisticheUtenteResponse
  }
}

package "Modulo Edge Node (edge - Node.js)" {
  class GameEngine {
    - Map activeMatches
    + creaPartita(giocoId, g1, g2) : Object
    + processaEvento(matchId, evento) : Object
    + terminaPartita(match) : Object
    + caricaPartiteAttiveDaDb() : void
    + initInstallazioni() : Promise
  }

  class SqliteDb {
    + initDatabase() : Database
    + salvaPartitaAttiva(match) : void
    + rimuoviPartitaAttiva(matchId) : void
    + salvaPartita(partita) : Object
    + getPartiteNonSincronizzate() : Array
    + segnaComeSincronizzate(ids) : number
    + getStatsLocale() : Object
  }

  class SyncService {
    + avviaCronSync() : void
    + eseguiSyncBulk() : Promise
  }
}

' === RELAZIONI DI INIEZIONE ED UTILIZZO ===
PartitaController --> PartitaService
TorneoController --> TorneoService
StatisticheRestController --> StatisticheBackendService
GameEngine --> SqliteDb
SyncService --> SqliteDb

@enduml
```

---

# 4. DIAGRAMMI DI SEQUENZA DEI FLUSSI CRITICI (UC-01 .. UC-08)

## 4.1 UC-01: Autenticazione OIDC (SSO PKCE)
```mermaid
sequenceDiagram
    autonumber
    actor U as Utente (Giocatore/Admin)
    participant B as Browser Client
    participant E as Edge Node (auth.js & oidc-client.js)
    participant KC as Keycloak IdP

    U->>B: Clicca "Login con Keycloak"
    B->>E: GET /auth/login
    E->>E: Genera PKCE Code Verifier & Challenge
    E-->>B: Redirect to Keycloak Auth URL (302)
    B->>KC: GET /protocol/openid-connect/auth (PKCE)
    KC-->>B: Rendering Form Login Keycloak
    U->>B: Inserisce Username e Password
    B->>KC: POST Login Credentials
    KC-->>B: Redirect a Edge Callback + Auth Code (302)
    B->>E: GET /auth/callback?code=xxx
    E->>KC: POST /token (Code + Code Verifier)
    KC-->>E: JWT Access Token + ID Token
    E-->>B: Sessione Creata & Redirect a Dashboard
```

## 4.2 UC-02: Avvio Nuova Partita ed Persistenza SQLite
```mermaid
sequenceDiagram
    autonumber
    actor G as Giocatore 1
    participant B as Browser Client
    participant E as Edge Node (game.js & game-engine.js)
    participant DB as SQLite (edge.sqlite3)

    G->>B: Seleziona Tavolo (installazioneId) e Avversario
    B->>E: POST /game/nuova-partita (installazioneId, g1, g2)
    E->>E: creaPartita() -> Genera UUID Match (IN_CORSO)
    E->>DB: salvaPartitaAttiva(match) [Persistenza SQLite C1]
    E-->>B: 200 OK { matchId, stato: "IN_CORSO" }
```

## 4.3 UC-03: Rilevamento Evento MQTTS e Chiusura Partita
```mermaid
sequenceDiagram
    autonumber
    participant S as Sensore IoT / Simulatore
    participant M as Broker Mosquitto
    participant E as Edge Node (mqtt-client.js & game-engine.js)
    participant DB as SQLite (edge.sqlite3)

    S->>M: PUBLISH locale/{localeId}/eventi (MQTTS TLS C2)
    M->>E: On Event Message (GOAL / TIRO)
    E->>E: processaEvento() -> Aggiorna Punteggio Match
    E->>DB: salvaPartitaAttiva(match) [Aggiorna JSON Active]

    opt Se Punteggio Finale Raggiunto (es. 10 gol)
        E->>E: terminaPartita() -> Marca TERMINATA
        E->>DB: salvaPartita(buffer, sincronizzata=0)
        E->>DB: rimuoviPartitaAttiva(matchId)
    end
```

## 4.4 UC-04: Sincronizzazione Bulk Offline e Tenant Verification
```mermaid
sequenceDiagram
    autonumber
    participant E as Edge Sync Service (sync-service.js)
    participant KC as Keycloak IdP
    participant GW as Service Gateway
    participant TF as TenantVerificationFilter
    participant PS as Partita Service (Cloud)
    participant DB as PostgreSQL (platform_db)

    E->>E: Cron 2 min -> Legge partite (sincronizzata=0)
    E->>KC: POST /token (grant_type=client_credentials, Fix M5)
    KC-->>E: JWT Access Token (edge-sync-client)
    E->>GW: POST /api/v1/locali/{localeId}/partite/sincronizza
    GW->>TF: Intercetta Richiesta HTTP
    TF->>TF: Verifica locale_id claim vs Path URL (Fix C3)
    TF->>PS: Inoltra Bulk Payload JSON
    PS->>PS: Valida localeId path vs payload (Fix C4)
    PS->>DB: Salva Partite & Auto-Registra Utenti
    PS-->>GW: 200 OK { salvate: [UUIDs] }
    GW-->>E: 200 OK
    E->>E: segnaComeSincronizzate([UUIDs]) in SQLite
```

## 4.5 UC-05: Creazione Torneo Globale
```mermaid
sequenceDiagram
    autonumber
    actor A as Admin Piattaforma
    participant B as Browser Client
    participant GW as Service Gateway
    participant TS as Torneo Service
    participant DB as PostgreSQL (platform_db)

    A->>B: Compila Form Creazione Nuovo Torneo
    B->>GW: POST /api/v1/tornei (Bearer JWT Admin)
    GW->>GW: Verifica Ruolo ROLE_admin_piattaforma
    GW->>TS: Inoltra Payload TorneoCreateInput
    TS->>DB: Salva Torneo & Locali Associati
    TS-->>GW: 200 OK TorneoResponse
    GW-->>B: Torneo Creato con Successo
```

## 4.6 UC-06: Iscrizione a Torneo (con Auto-Registrazione Utente)
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
    GW->>TS: Inoltra IscrizioneInput
    TS->>DB: utenteRepo.findById(utenteId)

    opt Se Utente Non Presente in platform_db.utente
        TS->>TS: Estrae username e sub da JWT Claims
        TS->>DB: Auto-registra Utente in platform_db.utente
    end

    TS->>DB: Salva IscrizioneTorneo
    TS-->>GW: 200 OK IscrizioneTorneoResponse
    GW-->>B: Conferma Iscrizione Riuscita
```

## 4.7 UC-07: Consulta Classifica e Statistiche
```mermaid
sequenceDiagram
    autonumber
    actor U as Utente / Admin
    participant B as Browser Client
    participant GW as Service Gateway
    participant ST as Statistiche / Torneo Service
    participant DB as PostgreSQL (platform_db)

    U->>B: Richiede Classifica Torneo / Statistiche
    B->>GW: GET /api/v1/tornei/{torneoId}/classifica
    GW->>ST: Inoltra Richiesta GET
    ST->>DB: Query Partite & Iscrizioni Torneo
    ST->>ST: Calcola Vittorie, Sconfitte e % Vittoria
    ST-->>GW: 200 OK ClassificaTorneoResponse
    GW-->>B: Renderizza Tabella Classifica
```

## 4.8 UC-08: Monitoraggio Stato Locale ed Edge
```mermaid
sequenceDiagram
    autonumber
    actor A as Admin Locale / DevOps
    participant B as Browser Client
    participant GW as Service Gateway / Edge Node
    participant ACT as Health & Actuator Endpoints

    A->>B: Accesso Dashboard Monitoraggio
    B->>GW: GET /health oppure GET /actuator/health
    GW->>ACT: Query Probes (Liveness & Readiness)
    ACT-->>GW: 200 OK { status: "UP", mqtt: "CONNECTED", db: "UP" }
    GW-->>B: Visualizza Stato Operativo dei Servizi
```

---

# 5. DEFINIZIONE DELLE API REST (OpenAPI 3.0)

Le API REST centralizzate della piattaforma sono gestite dal **Service Gateway (Porta 8081)**.

| Metodo | Endpoint URL | Descrizione / Ruolo Richiesto |
| :--- | :--- | :--- |
| `POST` | `/api/v1/locali/{localeId}/partite/sincronizza` | Bulk Sync partite da Edge Node (`admin_locale`, `admin_piattaforma`). |
| `GET` | `/api/v1/tornei` | Restituisce la lista di tutti i tornei attivi ed aperti. |
| `POST` | `/api/v1/tornei` | Creazione di un nuovo torneo globale (`admin_piattaforma`). |
| `POST` | `/api/v1/tornei/{torneoId}/iscrizioni` | Iscrizione di un giocatore a un torneo con auto-registrazione sul DB. |
| `GET` | `/api/v1/tornei/{torneoId}/classifica` | Calcola e restituisce la classifica in tempo reale del torneo. |
| `GET` | `/api/v1/statistiche/giocatore/{utenteId}` | Restituisce lo storico e le statistiche aggregate di un giocatore. |

*Nota di riferimento*: La specifica completa eseguibile è disponibile nel file OpenAPI Swagger [`service-gateway/src/main/resources/static/openapi-spec.yaml`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-gateway/src/main/resources/static/openapi-spec.yaml).

---

# 6. DEFINIZIONE DEI TOPIC MQTT E SCHEMA PAYLOAD

## 6.1 Sicurezza della Comunicazione IoT: MQTTS TLS e Controllo Accessi ACL

La comunicazione tra i dispositivi fisici (sensori, simulatori) ed il nodo Edge locale avviene su protocollo **MQTTS** sicuro per prevenire manomissioni del punteggio o intercettazioni dei dati sul canale di comunicazione locale.

### 1. Cifratura del Canale via MQTTS TLS (Porta 8883)
* **Cifratura del Traffico**: Tutta la comunicazione transitante sul broker Mosquitto viene cifrata end-to-end tramite **TLS (Transport Layer Security)** sulla porta `8883`.
* **Certificati X.509 e CA**: Il broker Mosquitto carica il certificato del server (`server.crt`) e la chiave privata (`server.key`). Il client Node.js (`mqtt-client.js`) ed i sensori validano l'autenticità del broker verificando il certificato della Certificate Authority radice (`MQTT_CA_PATH = /mosquitto/config/certs/ca.crt`).
* **Protezione dai Rischi**: Impedisce attacchi di eavsdropping (intercettazione in chiaro dei pacchetti sulla LAN del locale) e attacchi Man-In-The-Middle (MITM).

### 2. Controllo degli Accessi tramite ACL (Access Control Lists in `acl.conf`)
Il broker applica il **Principio del Minimo Privilegio** definendo utenti distinti in `passwords.txt` con permessi granulari stabiliti in `acl.conf`:
* **Utente `simulator` (Sensori / Dispositivi di Gioco)**:
  * **Permesso**: Esclusivamente `WRITE` (pubblicazione).
  * **Scope**: Limitato al pattern dei topic del proprio locale `locale/{LOCALE_ID}/+/+`.
  * **Scopo**: Può solo inviare i segnali dei gol/tiri e non ha visibilità sui messaggi degli altri sensori né sulle risposte del sistema.
* **Utente `edge-client` (Nodo Edge Node.js)**:
  * **Permesso**: Esclusivamente `READ` (sottoscrizione).
  * **Scope**: Pattern wildcard `locale/{LOCALE_ID}/+/+`.
  * **Scopo**: Ascolta gli eventi di gioco elaborati dal motore locale ma non può iniettare o falsificare arbitrariamente eventi sul canale MQTT.

---

## 6.2 Struttura Gerarchica dei Topic MQTT

I topic seguono la convenzione a tre livelli: `locale/{localeId}/{giocoId}/{tipoEvento}`

| Topic MQTT | Direzione | Permessi ACL (`acl.conf`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `locale/{localeId}/+/+` | Sensore $\rightarrow$ Edge Node | `user simulator`: WRITE<br>`user edge-client`: READ | Pattern wildcard per sottoscrivere tutti i giochi (`calciobalilla`, `freccette`, `biliardo`) e tutti i tipi evento del locale. |
| `locale/{localeId}/calciobalilla/goal` | Sensore Gol $\rightarrow$ Edge | `write` (user simulator) | Evento di rilevamento gol sul tavolo di calciobalilla. |
| `locale/{localeId}/freccette/tiro` | Bersaglio $\rightarrow$ Edge | `write` (user simulator) | Evento di impatto freccetta nel settore bersaglio. |
| `locale/{localeId}/biliardo/buca` | Sensore Buca $\rightarrow$ Edge | `write` (user simulator) | Evento di imbucata bilia. |

---

## 6.3 Schema del Payload JSON degli Eventi IoT

Il payload inviato sui topic specifici (es. `locale/BAR_BELVEDERE/calciobalilla/goal`) segue lo schema JSON elaborato da `mqtt-client.js` e consumato da `game-engine.js`:

```json
{
  "matchId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "installazioneId": "calciobalilla-locale1",
  "team": "A",
  "tipo": "GOAL",
  "punti": 1,
  "timestamp": "2026-08-21T09:45:00.000Z"
}
```
