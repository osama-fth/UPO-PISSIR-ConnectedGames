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

### Logica dei Nodi Edge (IoT & Offline Buffer)
- [x] **Routing e Server Express:** Istanziazione dei container Node.js per `edge-locale1` e `edge-locale2`.
- [x] **Autenticazione OIDC Client:** Integrazione della libreria `openid-client` per gestire Login e Isolamento (`admin_locale`).
- [x] **Dashboard Role-Based:** Interfaccia dinamica differenziata per Giocatori e Admin Locali.
- [x] **Simulatore Giochi (MQTT):** Creazione dell'interfaccia e rotte che simulano gli eventi di gioco (Calciobalilla, Freccette, Ping-Pong).
- [x] **Buffer Offline (SQLite):** Configurazione di `better-sqlite3` per salvare l'oggetto Partita in locale.

### Sincronizzazione Dati (Edge ↔ Cloud)
- [x] **Semaforo Anti Race-Condition:** Logica Node.js per impedire doppie sync simultanee.
- [x] **Cron-Job & Trigger Manuale:** Processo in background (ogni 2 min) e pulsante manuale (Backend-for-Frontend via `edge_sync_service`).

### Microservizi Backend (Spring Boot 3.x)
- [x] **`service-gateway`:** Configurazione del Gateway (Spring Cloud Gateway) per instradare le chiamate REST ai nuovi microservizi.
- [x] **`partita-service`:** Microservizio Spring Boot dedicato alla gestione delle Partite e Sincronizzazione.
- [x] **`torneo-service`:** Microservizio Spring Boot dedicato alla logica dei Tornei e Classifiche.
- [x] **Rimozione `service-core`:** Eliminazione definitiva del vecchio monolite.

### Dashboard Centrale (Piattaforma)
- [x] **`platform-dashboard`:** Microservizio Node.js/Express + EJS per offrire l'interfaccia grafica "Kiosk Globale" dedicata al Super Admin (`admin_piattaforma`).

### Testing e Scripting
- [x] **Script Bash Preliminari:** Creazione del `check-env.sh` (con il `.env.example`).
- [ ] **Test di Integrazione Blackout:** Verificare cosa succede scollegando temporaneamente la rete tra Edge e Cloud (Blackout test). (Da testare manualmente).
