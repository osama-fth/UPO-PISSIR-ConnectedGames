# Checklist di Avanzamento Progetto (Connected Games Platform)

Basandomi sulle specifiche progettuali e architetturali (`connected-games-platform-spec.md` e `specifiche-progetto.md`), ho stilato questa checklist che riassume lo stato dell'arte del nostro sistema.

## ✅ Completato (Fatto)

### Infrastruttura e Architettura Base
- [x] **Topologia Docker Multi-Tier:** Configurazione di `docker-compose.yml` con reti isolate (`backend-tier` e `edge-tier`).
- [x] **Hot Reloading:** Configurazione di `docker-compose.override.yml` per supportare il live-reload (Node.js via `sync` e Spring Boot via `rebuild`).

### Database e Identity Provider
- [x] **PostgreSQL Setup:** Inizializzazione degli schemi `platform_db` e `keycloak_db` via `init-db.sql`.
- [x] **Keycloak OIDC Flow:** Configurazione del Realm (`realm-export.json`), del client pubblico e del flusso *Authorization Code Flow con PKCE*.
- [x] **Seed Dati Sincronizzato:** Mappatura esatta degli UUID tra Keycloak e Postgres per 5 profili di test fissi.

### Nodi Edge (Gateway Locali)
- [x] **Routing e Server Express:** Istanziazione dei container Node.js per `edge-locale1` e `edge-locale2`.
- [x] **Autenticazione OIDC Client:** Integrazione della libreria `openid-client` per gestire Login, Logout e sessioni.
- [x] **Dashboard Role-Based:** Interfaccia dinamica differenziata per Giocatore, Admin Locale e Admin Piattaforma.

---

## 🚧 Da Fare (To Do)

### Logica dei Nodi Edge (IoT & Offline Buffer)
- [ ] **Motore MQTT (Calciobalilla):** Sottoscrizione al topic `locale/{locale_id}/eventi` e logica di incremento punteggio (fino a 10 gol) alla ricezione dei payload JSON.
- [ ] **Simulatore Interattivo (Freccette):** Creazione dell'interfaccia SVG (`dashboard.ejs` o view dedicata) che intercetti i click e li trasformi in eventi MQTT via backend.
- [ ] **Buffer Offline (SQLite):** Configurazione di `better-sqlite3` per salvare l'oggetto Partita generato (con UUID univoco client-side) a fine match.
- [ ] **Fallback Guest Mode:** Gestione del timeout di rete verso Keycloak per permettere il login rapido "Ospite" (le cui partite vengono scartate o salvate con `player_id = null` in base alle specifiche).

### Sincronizzazione Dati (Edge ↔ Cloud)
- [ ] **Semaforo Anti Race-Condition:** Logica Node.js per impedire doppie sync simultanee.
- [ ] **Cron-Job & Trigger Manuale:** Processo in background (ogni 5 min) che estrae i record da SQLite e fa una POST verso l'API Centrale.

### Backend Centrale (Spring Boot 3.x)
- [ ] **Service Gateway:** Configurazione del Resource Server per validare i token JWT di Keycloak e inoltrare le richieste al Core (Proxy REST).
- [ ] **Service Core (Business Logic & JPA):** 
    - Entità JPA per `Utente`, `Partita`, `Torneo`, ecc.
    - API Bulk per ricevere le partite (`salvate`/`fallite`) e garantire l'idempotenza tramite l'UUID client-side.
- [ ] **Logica Tornei (Modello A):** Implementazione della query aggregata (lazy) per calcolare la classifica dei tornei attivi, filtrando le partite per `torneo_id` e finestra temporale.

### Testing e Scripting
- [ ] **Healthcheck Keycloak:** Aggiungere un healthcheck robusto per Keycloak nel Docker Compose.
- [ ] **Script Bash Preliminari:** Creazione del `check-env.sh` (con il `.env.example`).
- [ ] **Test di Integrazione Blackout:** Verificare cosa succede scollegando temporaneamente la rete tra Edge e Cloud (Blackout test).
