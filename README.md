# 🎮 Connected Games Platform

**Progetto di Laboratorio PISSIR - A.A. 2025/2026 - Università del Piemonte Orientale**

La **Connected Games Platform** è un'architettura distribuita basata su microservizi e nodi Edge per la gestione, il monitoraggio e la fruizione di giochi fisici (es. Calciobalilla, Freccette) distribuiti in locali geograficamente separati (Bar, Sale Giochi). L'infrastruttura unisce il mondo IoT (Sensori MQTT) a un solido sistema Cloud-based per il calcolo delle statistiche, tornei globali e l'autenticazione centralizzata.

---

## 🏗 Architettura del Sistema

Il progetto si articola su un'architettura ibrida **Edge-to-Cloud**, orchestrata interamente tramite Docker Compose. 

### 1. Livello Centrale (Cloud / Platform)
- **Service Gateway (Spring Boot 3 + Java 21)**: Punto di ingresso (API Gateway) per tutte le comunicazioni dall'Edge verso la piattaforma centrale.
- **Partita Service & Torneo Service (Spring Boot 3 + Java 21)**: I motori di business. Gestiscono il salvataggio delle partite, la validazione, le statistiche e l'organizzazione dei tornei.
- **Keycloak (Identity Provider)**: Gestore centralizzato delle identità (SSO) tramite protocollo OIDC (OpenID Connect). Gestisce i ruoli (`giocatore`, `admin_locale`, `admin_piattaforma`).
- **PostgreSQL Database**: Sede di due database logici isolati: `platform_db` per il dominio di business e `keycloak_db` per la sicurezza.

### 2. Livello Locale (Edge / Locali)
I nodi Edge vengono installati fisicamente nei locali aderenti alla piattaforma. Nel nostro ambiente di sviluppo ne simuliamo due: **Bar Belvedere** (`edge-locale1`) e **Sala Giochi Roma** (`edge-locale2`).
- **Edge Node (Node.js + Express)**: Espone la Dashboard interattiva per i giocatori e per gli amministratori locali. Interagisce con Keycloak tramite **Authorization Code Flow con PKCE** per garantire massima sicurezza (essendo un client pubblico). Bufferizza offline i dati su **SQLite** in caso di disconnessione dalla piattaforma centrale.
- **Broker MQTT (Mosquitto)**: Raccoglie in tempo reale gli eventi generati dai sensori IoT hardware (es. sensori break-beam nelle porte del calciobalilla) e li inoltra all'Edge Node.

---

## 🚀 Come avviare il progetto (Stato Attuale)

L'intero stack è containerizzato e facilmente avviabile con un solo comando.

1. **Avvio dell'infrastruttura**
   Assicurati di non avere porte occupate (3001, 3002, 9080, 5432, 1883, 1884) ed esegui:
   ```bash
   docker compose down -v  # (Opzionale: formatta vecchi dati)
   docker compose up --build
   ```

2. **Accesso alle Dashboard Locali (Edge)**
   L'interfaccia utente è fornita dai nodi Edge. Apri il browser a:
   - 📍 **Bar Belvedere:** [http://localhost:3001](http://localhost:3001)
   - 📍 **Sala Giochi Roma:** [http://localhost:3002](http://localhost:3002)

3. **Accesso alla Dashboard Amministrativa Centrale (Piattaforma)**
   - 📊 **URL:** [http://localhost:8081/dashboard](http://localhost:8081/dashboard) *(Accetta solo utenti con ruolo `admin_piattaforma`, es. `admin_piattaforma` / `password`)*
   - *Nota Architetturale:* Esposta dal Gateway in trasparenza da `statistiche-service`. Gestisce una sessione cookie-based OIDC per gli amministratori di piattaforma, affiancandosi al modello Bearer JWT utilizzato dalle API REST dei microservizi.

4. **Accesso alla Console Keycloak (Piattaforma)**
   - 🔐 **URL:** [http://localhost:9080](http://localhost:9080)
   - **Credenziali Admin:** `admin` / `admin`

---

## 👥 Credenziali di Test (Hardcoded Seed)

Per facilitare lo sviluppo e testare la *Role-Based Dashboard*, il database (`postgres/init-db.sql`) e Keycloak (`realm-export.json`) sono pre-popolati con vari utenti fissi i cui UUID coincidono perfettamente tra le due piattaforme.

**La password per tutti gli account interattivi di test è:** `password` (mentre per `edge_sync_service` è `syncpassword`)

| Username | Email | Ruolo Keycloak | Vista Dashboard |
| :--- | :--- | :--- | :--- |
| `SuperMario` | `mario.rossi@example.com` | `giocatore` | Area di scansione QR per avvio partite e storico vittorie. |
| `Gigio` | `luigi.bianchi@example.com` | `giocatore` | Area di scansione QR per avvio partite e storico vittorie. |
| `SantAnna` | `anna.verdi@example.com` | `giocatore` | Area di scansione QR per avvio partite e storico vittorie. |
| `Paul` | `paolo.neri@example.com` | `giocatore` | Area di scansione QR per avvio partite e storico vittorie. |
| `LukeSkywalker` | `luca.gialli@example.com` | `giocatore` | Area di scansione QR per avvio partite e storico vittorie. |
| `Saretta` | `sara.viola@example.com` | `giocatore` | Area di scansione QR per avvio partite e storico vittorie. |
| `admin_belvedere` | `admin.belvedere@example.com` | `admin_locale` | Console di monitoraggio e manutenzione tavoli (Bar Belvedere). |
| `admin_roma` | `admin.roma@example.com` | `admin_locale` | Console di monitoraggio e manutenzione tavoli (Roma). |
| `admin_piattaforma` | `admin.platform@example.com` | `admin_piattaforma` | Dashboard di supervisione globale (traffico MQTT, stato sink). |
| `edge_sync_service` | `sync.service@example.com` | `admin_piattaforma` | Account di servizio interno per demone di sincronizzazione. |

*(Per testare le varie Dashboard, fai semplicemente Login dall'Edge con gli username sopra elencati).*

---

## 📋 Stato del Progetto (Checklist)

Per conoscere l'avanzamento dei lavori, verificare quali moduli architetturali sono stati completati e consultare la lista delle implementazioni ancora mancanti, fai riferimento al file **[project_checklist.md](project_checklist.md)** presente nella root del progetto.

---
