# 🎮 Connected Games Platform

**Progetto di Laboratorio PISSIR — A.A. 2025/2026 — Università del Piemonte Orientale**

### 👥 Membri del Gruppo (Autori)
* **Foutih Osama**
* **Bellotti Lorenzo**
* **Riccardo Negrini**

---

## 🏗️ Architettura di Sistema

L'infrastruttura si sviluppa su **due reti isolati** orchestrate tramite Docker Compose:

### 1. Rete Backend Cloud (`platform-backend-tier`)
Rete interna riservata ai servizi centrali ed alla persistenza:
- **`service-gateway`**: Porta `8081` (API Gateway centralizzato)
- **`keycloak`**: Porta `9080` (Server IdP OIDC — collegato anche alle reti dei locali)
- **`partita-service`**: Porta `8082` (Microservizio interno gestione ed ingestion partite)
- **`torneo-service`**: Porta `8083` (Microservizio interno gestione tornei ed iscrizioni)
- **`statistiche-service`**: Porta `8084` (Microservizio interno ed erogatore dashboard centrale)
- **`postgres-db`**: Porta `5432` (Database con schemi `platform_db` e `keycloak_db`)

### 2. Reti Locali Edge (`platform-locale1-tier` & `platform-locale2-tier`)
Reti private dei locali fisici per il collegamento dei sensori IoT e la gestione offline:
- **`edge-locale1` (Bar Belvedere)**: Porta `3001` (Node.js Express + SQLite local buffer)
- **`edge-locale2` (Sala Giochi Roma)**: Porta `3002` (Node.js Express + SQLite local buffer)
- **`mosquitto-locale1`**: Porta `8883` (Broker MQTTS TLS Locale 1)
- **`mosquitto-locale2`**: Porta `8884` (Broker MQTTS TLS Locale 2)
- **`keycloak`**: Porta `9080` (Ponte di rete per consentire l'autenticazione OIDC PKCE ai client locali)

---

## 🚀 Come Avviare il Progetto

### 1. Configurazione del file d'ambiente `.env`
Prima di avviare l'infrastruttura, è **obbligatorio** creare il file `.env` copiandolo dal template `.env.example`:

```bash
cp .env.example .env
```

### 2. Avvio dei Container Docker
Eseguire il comando di build ed avvio:

```bash
# Formatta eventuali container e volumi preesistenti (opzionale)
docker compose down -v

# Compila ed avvia l'intero stack in foreground
docker compose up --build
```

---

## 🔄 Ordine di Avvio ed Operazioni dei Container

L'avvio dell'intera piattaforma tramite `docker compose up --build` segue un ordine strettamente regolato dalle dipendenze (`depends_on`) e dallo stato di salute (`healthcheck`) di ciascun container:

```
[1. postgres-db] ──► [2. keycloak] ───────────────┬──► [5. service-gateway] ──► [6. statistiche-service]
                 ├──► [3. partita-service] ───────┤
                 └──► [4. torneo-service] ────────┘

[7. mosquitto-locale1 / locale2] ──► [8. edge-locale1 / locale2]
```

### 📋 Dettaglio Operativo per Container

| Ordine | Container | Tipologia / Immagine | Operazioni Eseguite all'Avvio |
| :---: | :--- | :--- | :--- |
| **1** | **`postgres-db`** | Database PostgreSQL 15 | • Inizializza il motore DB sulla porta `5432`.<br>• Esegue `01-init-db.sh`: crea i database `platform_db` e `keycloak_db` ed imposta gli utenti e le password lette da `.env`.<br>• Esegue `02-DDL.sql`: definisce lo schema, le tabelle e gli indici.<br>• Esegue `03-DML.sql`: inserisce i dati di base e le partite seed.<br>• Risponde `healthy` tramite `pg_isready`. |
| **2** | **`keycloak`** | IdP OIDC / Keycloak 26.1.0 | • Si connette a `keycloak_db` su PostgreSQL tramite JDBC.<br>• Importa il realm `Connected-Games` da `realm-export.json`.<br>• Registra utenti, ruoli (`giocatore`, `admin_locale`, `admin_piattaforma`) e client OIDC PKCE.<br>• Espone la console IdP sulla porta `9080` (healthcheck su `/health/ready`). |
| **3** | **`partita-service`** | Microservizio Spring Boot | • Si connette a `platform_db` via Spring Data JPA.<br>• Scarica le chiavi pubbliche JWK da Keycloak per validare i token JWT.<br>• Espone le API REST interne di ingestion e ricerca partite sulla porta `8082`. |
| **4** | **`torneo-service`** | Microservizio Spring Boot | • Si connette a `platform_db` via Spring Data JPA.<br>• Configura le regole di sicurezza OAuth2 Resource Server con Keycloak.<br>• Espone le API REST interne per gestione tornei, iscrizioni e classifiche sulla porta `8083`. |
| **5** | **`service-gateway`** | Spring Cloud Gateway | • Agisce da API Gateway / Reverse Proxy centrale sulla porta `8081`.<br>• Applica la verifica dei token OIDC e il filtro `TenantVerificationGatewayFilterFactory` per il controllo dell'header/claim `locale_id`.<br>• Inoltra il traffico verso `partita-service` e `torneo-service`.<br>• Espone la documentazione **Swagger UI** (`/doc`) e la **Dashboard Centrale** (`/dashboard`). |
| **6** | **`statistiche-service`** | Microservizio Spring Boot | • Agisce da Backend-For-Frontend (BFF) per the dashboard di super amministrazione.<br>• Esegue query analitiche aggregate su `platform_db` e valida le chiamate tramite Keycloak.<br>• Espone gli endpoint di reportistica e telemetria sulla porta `8084`. |
| **7** | **`mosquitto-locale1`<br>`mosquitto-locale2`** | Broker MQTTS Mosquitto | • Esegue `mosquitto/entrypoint.sh`.<br>• Genera il file password cifrato per gli utenti `simulator` (WRITE) ed `edge-client` (READ).<br>• Genera i certificati TLS X.509 self-signed dedicati al locale via OpenSSL.<br>• Avvia il servizio MQTTS sicuro sulla porta `8883` applicando le regole ACL. |
| **8** | **`edge-locale1`<br>`edge-locale2`** | Gateway Edge Node.js | • Inizializza il database locale SQLite (`edge.sqlite3`) in modalità WAL (`partite_attive` e `partite_buffer`).<br>• Si connette in MQTTS TLS al broker Mosquitto locale ascoltando gli eventi IoT del locale.<br>• Sincronizza dinamicamente la cache delle installazioni dal `service-gateway`.<br>• Avvia il cron-job che ogni 2 minuti invia in *bulk* le partite bufferizzate al Cloud via REST.<br>• Espone le dashboard locali su `http://localhost:3001` (Belvedere) e `http://localhost:3002` (Roma). |

---

## 🌐 Endpoint Contattabili

I principali punti di accesso ed interfacce web raggiungibili via browser sono:

| URL Endpoint | Servizio / Componente | Descrizione del Contenuto |
| :--- | :--- | :--- |
| `http://localhost:3001` | **Edge Node 1 (Bar Belvedere)** | Dashboard web locale per i giocatori ed i gestori del Bar Belvedere. Permette il login SSO OIDC, la scansione QR per avvio partite e la consultazione dello stato dei tavoli. |
| `http://localhost:3002` | **Edge Node 2 (Sala Giochi Roma)** | Dashboard web locale per i giocatori ed i gestori della Sala Giochi Roma. |
| `http://localhost:9080` | **Keycloak Identity Provider** | Console di amministrazione dell'IdP centralizzato (OIDC/OAuth2) per la gestione di utenti, credenziali, ruoli (`giocatore`, `admin_locale`, `admin_piattaforma`) e realm. (Admin credentials: `admin` / `admin`). |
| `http://localhost:8081/doc` | **Documentazione API Swagger UI** | Interfaccia Swagger/OpenAPI 3.0 interattiva per consultare, esplorare e collaudare gli endpoint REST esposti dal Service Gateway. |
| `http://localhost:8081/dashboard` | **Dashboard Amministrazione Centrale** | Console web riservata agli amministratori di piattaforma (`admin_piattaforma`) per la supervisione globale del traffico, monitoraggio nodi Edge e statistiche generali. |

---

## 🔑 Credenziali di Test (Hardcoded Seed Data)

La password per tutti gli account interattivi di test è: **`password`**.  
*(La sincronizzazione bulk dai nodi Edge al Cloud utilizza il Service Account Client Credentials `edge-sync-client` con segreto `edge-sync-secret-12345`)*.

| Username | Email | Ruolo Keycloak |
| :--- | :--- | :--- |
| `SuperMario` | `mario.rossi@example.com` | `giocatore` |
| `Gigio` | `luigi.bianchi@example.com` | `giocatore` |
| `SantAnna` | `anna.verdi@example.com` | `giocatore` |
| `Paul` | `paolo.neri@example.com` | `giocatore` |
| `LukeSkywalker` | `luca.gialli@example.com` | `giocatore` |
| `Saretta` | `sara.viola@example.com` | `giocatore` |
| `admin_belvedere` | `admin.belvedere@example.com` | `admin_locale` |
| `admin_roma` | `admin.roma@example.com` | `admin_locale` |
| `admin_piattaforma` | `admin.platform@example.com` | `admin_piattaforma` |

---

## 📚 Documentazione Ufficiale di Progetto (PDF)

Tutta la documentazione tecnica e formale prodotta per l'esame è disponibile in formato **PDF** nella cartella [`doc/`](/doc/):

1. 🎮 [`DocumentoDiVisione.pdf`](/doc/DocumentoDiVisione.pdf)  
   **Documento di Visione del Prodotto**: Descrizione del dominio, Glossario, Vincoli architetturali, Obiettivi di business, Stakeholders e Matrice di Valutazione dei Rischi.
2. 📘 [`DocumentoDiProgettazione.pdf`](/doc/DocumentoDiProgettazione.pdf)  
   **Documento di Specifica e Progettazione**: Modello dei Casi d'Uso, Tabelle descrittive formali (UC-01..UC-08), Diagramma UML delle Classi di Dominio, Modello Concettuale e Tabella delle Molteplicità.
3. 🛠️ [`DocumentoDiImplementazione.pdf`](/doc/DocumentoDiImplementazione.pdf)  
   **Documento di Implementazione Architetturale**: Diagramma di Deployment Docker con reti e porte, Diagramma dei Package, Diagramma delle Classi di Implementazione, 8 Diagrammi di Sequenza, Definizione API REST e Topic MQTT con sicurezza TLS ed ACL.
4. 📄 [`openapi.yaml`](/doc/openapi.yaml)

   **Specifica OpenAPI 3.0** eseguibile per Swagger UI.
