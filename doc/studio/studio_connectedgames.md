# 📚 Guida di Studio — Connected Games Platform

> Documento generato dall'analisi completa della codebase.
> Progetto universitario PISSIR — Architettura a microservizi con IoT, MQTT, JWT e Docker.
> Realm Keycloak: `Connected-Games`.

---

## Indice
1. [Panoramica generale — cosa fa il progetto](#1-panoramica-generale)
2. [Architettura a strati e reti Docker](#2-architettura-a-strati-e-reti-docker)
3. [Cos'è MQTT e come viene usato](#3-cosè-mqtt-e-come-viene-usato)
4. [Cos'è Keycloak e cosa fa nel progetto](#4-cosè-keycloak-e-cosa-fa-nel-progetto)
5. [Cos'è JWT e perché è centrale](#5-cosè-jwt-e-perché-è-centrale)
6. [Cosa fa Spring Boot — i microservizi Java](#6-cosa-fa-spring-boot--i-microservizi-java)
7. [Cos'è un Edge Node e cosa fa](#7-cosè-un-edge-node-e-cosa-fa)
8. [Il database PostgreSQL](#8-il-database-postgresql)
9. [entrypoint.sh — cosa fa e perché esiste](#9-entrypointsh--cosa-fa-e-perché-esiste)
10. [Porte aperte e porte private in Docker](#10-porte-aperte-e-porte-private-in-docker)
11. [Flusso completo di una partita — da inizio a fine](#11-flusso-completo-di-una-partita)
12. [Riepilogo dei concetti chiave](#12-riepilogo-dei-concetti-chiave)

---

## 1. Panoramica generale

**Connected Games Platform** è un sistema distribuito per gestire **sale giochi fisiche** (locali).
In ogni locale ci sono macchine arcade/giochi. I giocatori si autenticano, giocano, e i risultati vengono registrati e sincronizzati in un **server centrale**.

### I "locali" simulati nel progetto

| Locale | Identificatore | Porta esposta |
|--------|---------------|--------------|
| Bar Belvedere | `BAR_BELVEDERE` | 3001 |
| Sala Giochi Roma | `SALA_GIOCHI_ROMA` | 3002 |

### Componenti del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOST (il tuo PC)                         │
│  :9080 Keycloak    :8081 Gateway    :3001 Edge1    :3002 Edge2  │
└──────────┬──────────────────┬──────────────┬──────────┬─────────┘
           │                  │              │          │
    ┌──────▼──────────────────▼──────────────▼──────────▼──────┐
    │                     DOCKER                                │
    │  ┌──────────┐  ┌──────────┐  ┌────────────┐             │
    │  │ Keycloak │  │ Postgres │  │  Gateway   │             │
    │  └──────────┘  └──────────┘  └─────┬──────┘             │
    │                                     │ backend-tier        │
    │                         ┌───────────┼───────────┐        │
    │                    ┌────▼────┐ ┌────▼─────┐ ┌───▼────┐  │
    │                    │partita │ │ torneo   │ │stat.   │  │
    │                    │service │ │ service  │ │service │  │
    │                    └────────┘ └──────────┘ └────────┘  │
    │                                                          │
    │  locale1-tier                  locale2-tier             │
    │  ┌──────────┐ ┌────────┐      ┌──────────┐ ┌────────┐  │
    │  │mosquitto1│ │ edge1  │      │mosquitto2│ │ edge2  │  │
    │  └──────────┘ └────────┘      └──────────┘ └────────┘  │
    └──────────────────────────────────────────────────────────┘
```

---

## 2. Architettura a strati e reti Docker

Docker Compose definisce **3 reti virtuali** separabili. Questo è fondamentale per la sicurezza.

### Le 3 reti

| Rete Docker | Nome | `internal: true`? | Chi ci vive |
|---|---|---|---|
| `backend-tier` | `platform-backend-tier` | ✅ Sì — **nessun accesso esterno** | postgres, keycloak, partita-service, torneo-service, statistiche-service, service-gateway |
| `locale1-tier` | `platform-locale1-tier` | No | mosquitto-locale1, edge-locale1, keycloak, service-gateway |
| `locale2-tier` | `platform-locale2-tier` | No | mosquitto-locale2, edge-locale2, keycloak, service-gateway |

### Perché questa separazione?

- Il `backend-tier` è **completamente isolato dall'esterno**: i microservizi Java non sono raggiungibili dall'host, solo da altri container sulla stessa rete.
- Il `service-gateway` è il **unico punto di ingresso** al backend: sta sia su `backend-tier` (per parlare ai microservizi) che su `locale1-tier` e `locale2-tier` (per ricevere le chiamate degli Edge Node).
- Keycloak è in tutte e 3 le reti perché tutti devono poterlo contattare per la validazione dei token.
- I due locali sono **completamente separati** tra di loro: `edge-locale1` non può mai parlare con `mosquitto-locale2` e viceversa.

---

## 3. Cos'è MQTT e come viene usato

### Cos'è MQTT

**MQTT** (Message Queuing Telemetry Transport) è un protocollo di messaggistica **leggero, publish/subscribe**, progettato per dispositivi IoT con banda limitata.

Funziona così:
- C'è un **broker** centrale (Mosquitto) che riceve e instrada i messaggi
- I **publisher** mandano messaggi su un **topic** (es. `locale/BAR_BELVEDERE/calcetto/goal`)
- I **subscriber** si iscrivono a uno o più topic e ricevono i messaggi

```
  [Simulatore]  --publish--> [Broker Mosquitto] --deliver--> [Edge Node]
    "goal segnato"           topic: locale/X/calcetto/goal    "ricevo evento"
```

### Come viene usato nel progetto

In questo progetto MQTT simula i **sensori fisici** delle macchine arcade che inviano eventi di gioco (inizio partita, gol, fine partita, punteggi).

#### Struttura dei topic MQTT

```
locale/{LOCALE_ID}/{giocoId}/{tipoEvento}
```

Esempio: `locale/BAR_BELVEDERE/calcetto/goal`

#### Due ruoli distinti per utente MQTT

Ogni broker ha **due utenti** con permessi diversi (vedi `acl.conf`):

| Utente | Permesso | Chi lo usa | Perché |
|--------|----------|------------|--------|
| `simulator` | **write** su `locale/BAR_BELVEDERE/+/+` | Simulatore di giochi | Pubblica gli eventi delle macchine |
| `edge-client` | **read** su `locale/BAR_BELVEDERE/+/+` | Edge Node | Ascolta gli eventi e li processa |

Il `+` nelle ACL è un **wildcard** MQTT che significa "qualsiasi stringa a quel livello".

#### MQTTS — MQTT con TLS

Il progetto usa **MQTTS** (MQTT over TLS, porta **8883** invece di 1883). Questo cifra tutto il traffico. Il certificato TLS è autogenerato dall'`entrypoint.sh` al boot del container.

#### Il codice nell'Edge Node

Nel file [`mqtt-client.js`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/mqtt-client.js):
- Si creano **due client MQTT separati**: uno subscriber e uno publisher
- Il subscriber si iscrive con pattern wildcard: `locale/{LOCALE_ID}/+/+`
- Quando arriva un messaggio, viene parsato il topic per estrarre `giocoId` e `tipoEvento`
- L'evento viene emesso internamente tramite `EventEmitter` per essere processato dal game engine

---

## 4. Cos'è Keycloak e cosa fa nel progetto

### Cos'è Keycloak

**Keycloak** è un **Identity Provider** (IdP) open source di Red Hat. È un server dedicato interamente alla gestione di:
- Autenticazione (login degli utenti)
- Autorizzazione (chi può fare cosa)
- Gestione degli utenti (registrazione, password, ruoli)
- Emissione di token (JWT)

Implementa lo standard **OpenID Connect (OIDC)** che è un layer di identità sopra OAuth 2.0.

### Il Realm: `pissir-realm`

In Keycloak, un **realm** è uno spazio isolato con i propri utenti, client e configurazioni. Il progetto usa il realm `Connected-Games`.

### I ruoli definiti nel realm

Definiti in [`realm-export.json`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/keycloak/realm-export.json):

| Ruolo | Descrizione |
|-------|-------------|
| `giocatore` | Ruolo base assegnato a tutti i nuovi utenti |
| `admin_locale` | Amministratore di un locale fisico |
| `admin_piattaforma` | Amministratore globale della piattaforma |

### Il Client OIDC: `edge-client`

Un **client OIDC** è un'applicazione registrata in Keycloak. Il progetto registra `edge-client`:
- **publicClient: true** — non ha una chiave segreta (appropriato per app server-side)
- **standardFlowEnabled** — permette il flusso Authorization Code (login browser)
- **directAccessGrantsEnabled** — permette il Resource Owner Password Credentials (login diretto username+password, usato per il secondo giocatore)

### Il Protocol Mapper: `locale_id`

Un **protocol mapper** aggiunge claim custom ai token JWT. In questo progetto viene aggiunto `locale_id` (il locale fisico a cui appartiene l'admin) direttamente nel token.

### Due URL di Keycloak: Split-Brain

> [!IMPORTANT]
> Questo è uno dei concetti più sottili del progetto.

Keycloak è accessibile con **due URL diverse**:
- **URL interna** (Docker): `http://keycloak:8080` — usata dai container per chiamate server-to-server
- **URL pubblica** (host): `http://localhost:9080` — usata dai browser per il redirect di login

Il problema: quando il browser reindirizza al login di Keycloak, deve usare un URL raggiungibile dall'utente (`localhost:9080`). Ma quando il server vuole validare un token, deve usare l'URL Docker interna per non uscire dalla rete.

Il codice in [`oidc-client.js`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/oidc-client.js) gestisce questo con la tecnica dello "split-brain":

```js
// Scarica la config OIDC dall'URL interna (Docker)...
const metadata = await fetch(`${KEYCLOAK_INTERNAL_URL}/.well-known/openid-configuration`);
// ...ma sostituisce l'issuer con l'URL pubblica (per i browser)
metadata.issuer = KEYCLOAK_PUBLIC_URL;
metadata.authorization_endpoint = metadata.authorization_endpoint
    .replace(KEYCLOAK_INTERNAL_URL, KEYCLOAK_PUBLIC_URL);
```

---

## 5. Cos'è JWT e perché è centrale

### Cos'è JWT

**JWT** (JSON Web Token) è un formato standard per trasmettere informazioni in modo **sicuro e verificabile**.
Un JWT è una stringa con 3 parti separate da `.`:

```
eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.SIGNATURE
      HEADER                  PAYLOAD              FIRMA
```

- **Header**: tipo di token e algoritmo di firma (RS256 = RSA + SHA256)
- **Payload**: i **claim** — informazioni sull'utente (ID, username, ruoli, scadenza...)
- **Signature**: firma digitale creata da Keycloak con la sua chiave privata

### Perché non si può falsificare

Solo Keycloak conosce la **chiave privata** usata per firmare. Chiunque può verificare la firma usando la **chiave pubblica** di Keycloak (disponibile all'endpoint `JWK_SET_URI`). I microservizi Spring scaricano questa chiave pubblica e la usano per verificare ogni token in arrivo.

### Come fluisce il JWT nel progetto

```
1. Utente fa login su Edge Node
2. Edge Node reindirizza a Keycloak
3. Keycloak autentica e rilascia JWT (Access Token)
4. JWT viene salvato nella sessione dell'Edge Node
5. Quando l'Edge chiama il Gateway: Authorization: Bearer <JWT>
6. Gateway verifica la firma del JWT tramite JWK Set URI di Keycloak
7. Gateway instrada la richiesta al microservizio
8. Microservizio verifica anch'esso il JWT
```

### JWT nel codice

**Microservizi Spring** — tutti gli `application.yml` hanno:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:9080/realms/Connected-Games   # verifica claim "iss"
          jwk-set-uri: http://keycloak:8080/realms/Connected-Games/protocol/openid-connect/certs
```

**Edge Node** — decodifica manuale del JWT per estrarre ruoli e `locale_id`:

```js
const payloadBase64 = tokenSet.access_token.split('.')[1];
const decoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
const accessClaims = JSON.parse(decoded);
accessRoles = accessClaims.realm_access?.roles || [];
localeId = accessClaims.locale_id || null;
```

### Tipi di grant (flussi di autenticazione) usati

| Grant Type | Dove usato | Descrizione |
|---|---|---|
| **Authorization Code + PKCE** | Login utente normale | L'utente viene reindirizzato a Keycloak, fa login, torna all'app con un "codice" che viene scambiato con il JWT |
| **Direct Access Grant (Password)** | Login del 2° giocatore inline | Username e password mandati direttamente all'API di Keycloak, riceve JWT direttamente |
| **Client Credentials** | Sincronizzazione automatica | Il servizio (non un utente) si autentica con `client_id` + `client_secret` per ottenere un token di servizio |

---

## 6. Cosa fa Spring Boot — i microservizi Java

**Spring Boot** è un framework Java che permette di costruire microservizi REST in modo rapido, con configurazione minima. Ogni microservizio è una **piccola applicazione indipendente** che gestisce un dominio specifico.

### I 4 microservizi Java

#### `partita-service` — porta interna 8082

Gestisce tutto ciò che riguarda le partite e la struttura dei dati.

File principali:
- [`PartitaController.java`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/partita-service/src/main/java/com/connectedgames/core/controller/PartitaController.java) — endpoint REST per leggere partite, ricevere bulk sync
- `PartitaService.java` — logica di business (validazione, salvataggio)
- `PartitaRepository.java` — interfaccia JPA per accedere al database
- `SecurityConfig.java` — configura quali endpoint richiedono JWT e quali no
- `PartitaSyncInput.java` — il DTO che riceve i dati di sincronizzazione dall'Edge

**Endpoint principale**: `POST /api/v1/locali/{localeId}/partite/sincronizza`
Riceve le partite accumulate negli Edge Node e le persiste nel database centrale.

Modelli principali: `Partita`, `Gioco`, `InstallazioneGioco`, `Locale`, `Utente`, `Torneo`

#### `torneo-service` — porta interna 8083

Gestisce la logica dei tornei.

File principali:
- `TorneoController.java` — CRUD tornei e iscrizioni
- `TorneoService.java` — logica creazione tornei, calcolo classifiche
- `IscrizioneTorneo.java` + `IscrizioneTorneoId.java` — entità con chiave composita per le iscrizioni

**Endpoint principali**:
- `GET/POST /api/v1/tornei` — lista e creazione tornei
- `POST /api/v1/tornei/{id}/iscrizioni` — iscrizione a un torneo
- `GET /api/v1/tornei/{id}/classifica` — classifica del torneo

#### `statistiche-service` — porta interna 8084

L'unico microservizio con anche un'**interfaccia web** (non solo API REST).

File principali:
- `StatisticheRestController.java` — API REST per dati statistici
- `DashboardController.java` — controller MVC che serve le pagine HTML
- `AuthController.java` — gestisce il login/logout per la dashboard web
- `StatisticheBackendService.java` — chiama altri servizi per aggregare dati
- `StatisticheRepository.java` — query SQL custom per statistiche aggregate

Accessibile pubblicamente attraverso il Gateway a `/`, `/dashboard`, `/utenti`, ecc.

**Nota speciale**: questo servizio ha configurato `app.keycloak` per poter fare il login diretto (non solo validare JWT), perché serve una dashboard web con UI di autenticazione.

#### `service-gateway` — porta **pubblica 8081** → interna 8081

E' il **punto di ingresso unico** al backend. Non contiene logica di business, ma:
- **Verifica il JWT** di ogni richiesta in arrivo
- **Instrada** le richieste al microservizio corretto in base al path
- Applica **filtri** custom (come `TenantVerificationGatewayFilterFactory`)
- Gestisce **CORS**
- Espone la **Swagger UI** a `/docs`

Usa **Spring Cloud Gateway** (reattivo, basato su WebFlux — non il classico MVC).

**Routing configurato in** [`application.yml`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-gateway/src/main/resources/application.yml):

| Path | Destinazione |
|------|-------------|
| `POST /api/v1/locali/{localeId}/partite/sincronizza` | partita-service:8082 |
| `GET /api/v1/locali/{localeId}/giochi` | partita-service:8082 |
| `/api/v1/utenti/**`, `/api/v1/partite/**` | partita-service:8082 |
| `/api/v1/tornei/**` | torneo-service:8083 |
| `/api/v1/statistiche/**` | statistiche-service:8084 |
| `/`, `/dashboard`, `/utenti`, ecc. | statistiche-service:8084 |

### Pattern comune a tutti i microservizi

Ogni microservizio Spring Boot segue la stessa struttura a strati:

```
Controller  (espone REST API)
    ↓ chiama
Service     (logica di business)
    ↓ chiama
Repository  (interfaccia database, JPA/Hibernate)
    ↓ parla con
PostgreSQL
```

**Hibernate / JPA**: è l'ORM (Object-Relational Mapper) usato. Mappa le classi Java sulle tabelle SQL. `ddl-auto: validate` significa che non crea le tabelle (le crea lo script SQL), ma verifica che siano compatibili con le entità Java.

---

## 7. Cos'è un Edge Node e cosa fa

### Il concetto di "Edge Computing"

Nell'IoT, **edge computing** significa portare parte dell'elaborazione vicino alla sorgente dei dati (il "bordo" della rete), invece di mandare tutto al cloud centrale. Questo permette:
- **Funzionamento offline**: se cade la connessione al server centrale, il locale continua a funzionare
- **Bassa latenza**: le decisioni in tempo reale (es. registrare un goal) sono immediate
- **Riduzione del traffico**: si sincronizzano solo i dati consolidati, non ogni singolo evento

### Cosa fa l'Edge Node nel progetto

L'Edge Node è un'applicazione **Node.js + Express** che gira in ogni locale fisico.

I suoi servizi interni in [`/edge/services/`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services):

| Servizio | File | Cosa fa |
|---------|------|---------|
| **game-engine** | `game-engine.js` | Gestisce lo stato delle partite in corso in memoria, processa gli eventi MQTT |
| **mqtt-client** | `mqtt-client.js` | Si connette al broker Mosquitto locale, riceve eventi dai sensori |
| **sqlite-db** | `sqlite-db.js` | Database SQLite locale — buffer offline per le partite terminate |
| **oidc-client** | `oidc-client.js` | Gestisce l'autenticazione OIDC con Keycloak |
| **sync-service** | `sync-service.js` | Sincronizza le partite dal buffer SQLite al server centrale ogni 2 minuti |

Le route HTTP in `/edge/routes/`:

| Route | File | Cosa fa |
|-------|------|---------|
| `/auth/*` | `auth.js` | Login, logout, callback OIDC, login diretto 2° giocatore |
| `/game/*` | `game.js` | Avvia/termina partite, pubblica eventi MQTT |
| `/sync/*` | `sync.js` | Trigger manuale sincronizzazione |
| `/` | `dashboard.js` | Dashboard locale (interfaccia web) |

### Il buffer offline: SQLite

Quando una partita termina, i dati vengono salvati in un database **SQLite locale** (un singolo file). SQLite è leggero, non richiede un server, ed è perfetto per edge.

Tabelle SQLite nel file [`sqlite-db.js`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/sqlite-db.js):
- `partite_attive` — stato in memoria delle partite in corso (persiste tra restart)
- `partite_buffer` — partite terminate in attesa di sync, con flag `sincronizzata`
- `installazioni_cache` — cache locale dei giochi installati

### Il cron di sincronizzazione

Ogni **2 minuti**, il [`sync-service.js`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/sync-service.js) automaticamente:
1. Legge dalla tabella `partite_buffer` tutte le partite con `sincronizzata = 0`
2. Ottiene un token JWT (da service account Keycloak)
3. Manda tutte le partite al Gateway con `POST /api/v1/locali/{LOCALE_ID}/partite/sincronizza`
4. Se il server risponde OK, segna le partite come `sincronizzata = 1`

Questo garantisce la **delivery at-least-once**: anche se la rete cade, le partite vengono inviate non appena la connessione torna.

---

## 8. Il database PostgreSQL

### Struttura

Due database separati sullo stesso server PostgreSQL:

| Database | Usato da | Accesso |
|----------|----------|---------|
| `platform_db` | partita-service, torneo-service, statistiche-service | utente `platform_user` |
| `keycloak_db` | Keycloak | utente `keycloak_user` |

Questo è **isolamento della sicurezza**: Keycloak non può accedere ai dati della piattaforma e viceversa.

### Il `init-db.sh`

Lo script [`postgres/init-db.sh`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/postgres/init-db.sh) viene eseguito **automaticamente al primo avvio** di PostgreSQL (viene copiato in `/docker-entrypoint-initdb.d/`). Crea:
- I due database
- I due utenti con le relative password (lette dalle variabili d'ambiente)
- I permessi corretti su schema e tabelle
- L'estensione `uuid-ossp` per la generazione di UUID

Poi vengono eseguiti `DDL.sql` (definizione tabelle) e `DML.sql` (dati iniziali di esempio).

### Accesso da fuori Docker

Il server PostgreSQL **non ha porte esposte** verso l'host. Vive solo nella rete `backend-tier`. È accessibile solo dai container nella stessa rete.

---

## 9. `entrypoint.sh` — cosa fa e perché esiste

L'[`entrypoint.sh`](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/mosquitto/entrypoint.sh) è lo script che viene eseguito **all'avvio del container Mosquitto**, prima del broker stesso.

### Il problema che risolve

Le credenziali MQTT (username/password) e i certificati TLS devono essere **generati dinamicamente** partendo dalle variabili d'ambiente definite nel `.env`. Non si possono includere nella Docker image perché:
1. Le password sarebbero hardcoded nell'immagine (violazione di sicurezza)
2. I certificati TLS devono essere unici per ogni istanza del broker

### Cosa fa passo dopo passo

```bash
#!/bin/sh

# 1. VERIFICA le variabili obbligatorie
if [ -z "$MQTT_PUB_USER" ] || [ -z "$MQTT_PUB_PASSWORD" ]; then
    exit 1  # Fail fast: se mancano le credenziali, il container non parte
fi

# 2. CREA il password file per Mosquitto
# -c = crea nuovo file con il primo utente
mosquitto_passwd -c -b "$PASSWORD_FILE" "$MQTT_PUB_USER" "$MQTT_PUB_PASSWORD"
# Senza -c = aggiunge al file esistente
mosquitto_passwd -b "$PASSWORD_FILE" "$MQTT_SUB_USER" "$MQTT_SUB_PASSWORD"
# Le password vengono hashate automaticamente da mosquitto_passwd

# 3. GENERA il certificato TLS auto-firmato con OpenSSL
# -x509 = certificato auto-firmato
# -nodes = chiave privata senza passphrase
# -days 365 = valido un anno
# -newkey rsa:2048 = nuova chiave RSA 2048 bit
# Il CN (Common Name) include il LOCALE_ID per distinguere i certificati
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_KEY" -out "$CERT_CRT" \
    -subj "/CN=mosquitto-${LOCALE_ID:-locale}"

# 4. AVVIA il broker Mosquitto con la configurazione specifica del locale
exec mosquitto -c "$CONFIG_FILE"
```

> [!NOTE]
> `exec` alla fine è importante: sostituisce il processo shell con mosquitto, in modo che mosquitto diventi il processo principale (PID 1) del container. Questo è necessario per ricevere correttamente i segnali Docker (es. SIGTERM per lo shutdown).

### Perché ogni locale ha il proprio certificato

Il `LOCALE_ID` viene inserito nel **CN del certificato** (`CN=mosquitto-BAR_BELVEDERE`). Questo permette di distinguere i certificati dei diversi broker in un ambiente multi-locale. In sviluppo con certificati auto-firmati, l'Edge Node si connette con `rejectUnauthorized: false`.

---

## 10. Porte aperte e porte private in Docker

### Mappa completa delle porte

| Servizio | Porta interna | Porta host esposta | Accessibile da fuori? |
|----------|--------------|-------------------|----------------------|
| **service-gateway** | 8081 | **8081** | ✅ Sì |
| **keycloak** | 8080 | **9080** | ✅ Sì |
| **edge-locale1** | 3001 | **3001** | ✅ Sì |
| **edge-locale2** | 3002 | **3002** | ✅ Sì |
| partita-service | 8082 | nessuna | 🔒 Solo rete interna |
| torneo-service | 8083 | nessuna | 🔒 Solo rete interna |
| statistiche-service | 8084 | nessuna | 🔒 Solo rete interna |
| postgres-db | 5432 | nessuna | 🔒 Solo rete interna |
| mosquitto-locale1 | 8883 | nessuna | 🔒 Solo locale1-tier |
| mosquitto-locale2 | 8883 | nessuna | 🔒 Solo locale2-tier |

### Perché questa scelta?

**Porte esposte** (accessibili dall'esterno):
- `:8081` — Gateway: è il punto di ingresso API per qualsiasi client esterno
- `:9080` — Keycloak: il browser deve poterci raggiungere per il redirect di login
- `:3001/:3002` — Edge Node: ogni locale ha la sua dashboard web accessibile localmente

**Porte private** (non esposte):
- I microservizi Spring (8082, 8083, 8084) non sono mai contattati direttamente dall'esterno. Solo il Gateway li raggiunge attraverso la rete Docker interna.
- PostgreSQL (5432) non deve mai essere esposto in produzione
- I broker MQTT (8883) sono accessibili solo agli Edge Node della stessa rete locale

### Schema di accesso per tipo di client

```
Browser utente  --> :9080         (Keycloak, per login)
Browser utente  --> :8081/gateway (API e dashboard statistiche)
Browser locale1 --> :3001         (Edge Node locale 1)
Browser locale2 --> :3002         (Edge Node locale 2)

Edge Node 1 --> mosquitto-locale1:8883  (MQTT interno, stessa rete)
Edge Node 1 --> service-gateway:8081    (sync partite)
Edge Node 1 --> keycloak:8080           (validazione token, URL interna Docker)
```

---

## 11. Flusso completo di una partita

### Scenario: due giocatori giocano a calcetto al Bar Belvedere

```
1. AUTENTICAZIONE
   Giocatore 1 apre browser su http://localhost:3001
   → Edge Node reindirizza a Keycloak (localhost:9080)
   → Keycloak chiede username/password
   → Emette JWT firmato con ruolo "giocatore"
   → Edge Node salva JWT in sessione

2. LOGIN SECONDO GIOCATORE
   Edge Node chiama Keycloak con Direct Access Grant
   POST http://keycloak:8080/.../token  {username, password}
   → Keycloak risponde con JWT del secondo giocatore
   → Edge Node ha ora i JWT di entrambi

3. INIZIO PARTITA
   Edge Node crea oggetto partita in memoria (game-engine.js)
   Salva lo stato in SQLite (partite_attive) per resistere a restart
   Il simulatore pubblica su MQTT: locale/BAR_BELVEDERE/calcetto/inizio
   Edge Node riceve l'evento MQTT e aggiorna lo stato

4. DURANTE LA PARTITA
   Sensori pubblicano goal, timeout, ecc. su MQTT
   Formato: locale/BAR_BELVEDERE/calcetto/goal → {punteggio: ...}
   Edge Node aggiorna lo stato locale in tempo reale

5. FINE PARTITA
   Edge Node chiude la partita nel game-engine
   Crea record nel buffer SQLite (partite_buffer, sincronizzata=0)
   Rimuove la partita attiva da partite_attive

6. SINCRONIZZAZIONE (automatica ogni 2 minuti o manuale)
   sync-service.js legge partite con sincronizzata=0
   Ottiene token JWT del service account da Keycloak
   POST http://service-gateway:8081/api/v1/locali/BAR_BELVEDERE/partite/sincronizza
     Authorization: Bearer <JWT service account>
     Body: [{id, installazioneId, giocatore1Id, punteggio1, ...}, ...]

7. GATEWAY RICEVE LA RICHIESTA
   Verifica JWT: firma valida? issuer corretto? token scaduto?
   Applica filtro TenantVerification (verifica che localeId nel JWT coincida)
   Instrada a partita-service:8082

8. PARTITA-SERVICE PERSISTE I DATI
   Riceve il bulk di partite
   Valida e salva nel database PostgreSQL (platform_db)
   Risponde con {salvate: [...], fallite: [...]}

9. SYNC COMPLETA
   Edge Node riceve la risposta
   Segna le partite come sincronizzata=1 in SQLite
   Le partite sono ora nel database centrale
```

---

## 12. Riepilogo dei concetti chiave

### Glossario rapido

| Termine | Definizione rapida |
|---------|-------------------|
| **MQTT** | Protocollo publish/subscribe leggero per IoT; i sensori pubblicano eventi, l'Edge li riceve |
| **Mosquitto** | Il broker MQTT open source usato (implementa il server MQTT) |
| **MQTTS** | MQTT su TLS (cifrato, porta 8883) |
| **Topic MQTT** | Stringa gerarchica tipo `locale/BAR/calcetto/goal` che identifica il canale del messaggio |
| **ACL** | Access Control List — regola chi può pubblicare/leggere su quali topic |
| **Keycloak** | Identity Provider: gestisce utenti, login e rilascia JWT |
| **Realm** | Spazio isolato in Keycloak con propri utenti e client (`pissir-realm`) |
| **OIDC** | OpenID Connect — protocollo di autenticazione sopra OAuth2 |
| **JWT** | Token firmato che contiene identità e ruoli dell'utente, verificabile senza chiamare Keycloak |
| **JWK Set URI** | Endpoint dove Keycloak espone le chiavi pubbliche per verificare i JWT |
| **PKCE** | Meccanismo anti-intercettazione per il flusso Authorization Code |
| **Direct Access Grant** | Flusso OIDC per login diretto username+password (usato per il 2° giocatore) |
| **Client Credentials** | Flusso OIDC machine-to-machine senza utente (usato per il sync service) |
| **Spring Boot** | Framework Java per microservizi REST |
| **Spring Cloud Gateway** | Gateway API reattivo (basato su WebFlux) che instrada le richieste |
| **JPA/Hibernate** | ORM Java — mappa oggetti Java su tabelle SQL |
| **Edge Node** | Server Node.js che gira fisicamente nel locale, gestisce MQTT e buffer offline |
| **Edge Computing** | Elaborazione vicino ai dati, non solo nel cloud centrale |
| **SQLite** | Database file-based leggero, usato come buffer offline nell'Edge Node |
| **Buffer offline** | Partite salvate localmente in SQLite quando il server centrale non è raggiungibile |
| **entrypoint.sh** | Script shell eseguito all'avvio del container Mosquitto per generare credenziali e certificati |
| **backend-tier** | Rete Docker `internal:true` — completamente isolata dall'esterno |
| **locale-tier** | Rete Docker per ogni locale fisico — isola i due locali tra di loro |
| **healthcheck** | Verifica periodica dello stato di salute di ogni container in Docker Compose |
| **Actuator** | Modulo Spring Boot che espone `/actuator/health` per i healthcheck Docker |
| **Split-brain URL** | Tecnica per usare URL diversi (interna/pubblica) per Docker e browser |

---

### Domande tipiche d'esame e risposte

**Q: Perché MQTT invece di HTTP per i sensori delle macchine?**
A: MQTT è progettato per IoT: consuma meno banda, supporta QoS (qualità del servizio), gestisce automaticamente le riconnessioni, e il modello publish/subscribe è naturale per eventi asincroni da sensori. HTTP richiederebbe polling continuo da parte dell'Edge Node.

**Q: Perché il Gateway è l'unico punto di ingresso al backend?**
A: Single Point of Entry semplifica la sicurezza: la validazione JWT avviene una sola volta, tutti i microservizi possono fidarsi delle richieste che arrivano dal Gateway. Evita di esporre direttamente ogni microservizio (che non avrebbe porte pubbliche).

**Q: Come funziona la resilienza offline dell'Edge?**
A: L'Edge accumula le partite terminate in SQLite con flag `sincronizzata=0`. Un cron job tenta la sincronizzazione ogni 2 minuti. Se il server non risponde, le partite rimangono in coda. Appena la connettività torna, la sync riprende. Questo è il pattern **store-and-forward**.

**Q: Perché due utenti MQTT separati (simulator e edge-client)?**
A: Principio del least privilege: il simulatore (che genera gli eventi) può solo **scrivere** (publish). L'Edge può solo **leggere** (subscribe). Se un componente venisse compromesso, non potrebbe fare più di quanto previsto.

**Q: Cos'è il TenantVerificationGatewayFilterFactory?**
A: Un filtro custom del Gateway che verifica che il `localeId` nell'URL della richiesta corrisponda al `locale_id` presente nel JWT dell'utente. Evita che un Edge Node del locale 1 possa sincronizzare partite spacciandosi per il locale 2 (sicurezza multi-tenant).

**Q: Perché i broker MQTT non sono esposti sull'host?**
A: Perché non serve: solo l'Edge Node dello stesso locale deve parlarci, e lo fa attraverso la rete Docker isolata `locale-tier`. Esporre la porta MQTT sull'host aprirebbe un vettore di attacco inutile.

**Q: Cosa succederebbe se Keycloak fosse irraggiungibile?**
A: L'Edge Node parte comunque (il fallimento OIDC è gestito con `try/catch` — vedi `server.js`). Ma nessun utente potrebbe fare login, e il sync automatico userebbe il service account in cache. Dopo la scadenza del token cache, anche il sync fallirebbe, ma le partite resterebbero nel buffer SQLite in attesa.

---

*Fine documento — generato il 27/08/2026*
