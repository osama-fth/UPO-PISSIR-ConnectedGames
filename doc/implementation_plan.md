# Analisi Moduli Esistenti + Implementazione Edge & Broker MQTT

## Analisi dei Due Moduli Esistenti

### ✅ service-gateway — Stato: BUONO (1 fix minore)

Il gateway è ben strutturato: Spring Cloud Gateway reattivo su porta 8081, routing corretto verso service-core, validazione JWT Keycloak, CORS globale configurato, actuator health. Architettura WebFlux coerente con `@EnableWebFluxSecurity`.

**Problemi trovati:**
- Nessun problema bloccante. Le route copre tutte le API dell'OpenAPI spec (sync, giochi, tornei, classifica, statistiche).

---

### ⚠️ service-core — Stato: BUONO con 2 BUG di compilazione

Il modulo è completo: 6 entities, 5 repositories, 4 services, 4 controllers, 3 DTOs, exception handler globale. La logica di bulk sync con idempotenza UUID è corretta e coerente con le specifiche.

**Bug di compilazione da fixare:**

> [!CAUTION]
> **BUG 1 — [Torneo.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-core/src/main/java/com/connectedgames/core/entity/Torneo.java#L25): manca `import jakarta.persistence.ManyToOne`**
> L'annotazione `@ManyToOne` è usata (riga 25) ma l'import è assente. Il codice NON compila.

> [!CAUTION]
> **BUG 2 — [PartitaSyncInput.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-core/src/main/java/com/connectedgames/core/dto/PartitaSyncInput.java): `@NotNull` su primitivo `int`**
> Le annotation `@NotNull @Min @Max` sono applicate su `int punteggio1` e `int punteggio2` (tipo primitivo). `@NotNull` non ha senso su un `int` (non può essere null). Dovrebbero essere `Integer` oppure rimuovere `@NotNull`.

**Nota di coerenza:**
- Lo schema DDL usa `platform_db` come **database name**, non come schema PostgreSQL. Ma le entities JPA usano `schema = "platform_db"`. Questo funziona solo se PostgreSQL ha effettivamente uno schema chiamato `platform_db` dentro il database `platform_db`. Bisognerà gestirlo nel `init-db.sql`. Lo segno ma non lo cambio ora — lo si verifica al primo `docker compose up`.

---

## Piano di Implementazione: Edge Node + Broker MQTT

L'obiettivo è creare un Edge Node funzionante in Node.js/Express con:
1. **Autenticazione via Keycloak** (OIDC Authorization Code Flow)
2. **Registrazione utente** (redirect a Keycloak registration)
3. **Guest Mode** (fallback quando Keycloak è irraggiungibile)
4. **Broker MQTT Mosquitto** configurato per locale con ACL
5. **Infrastruttura Docker** (Mosquitto config, init-db.sql, Keycloak realm)

> [!IMPORTANT]
> La logica dei giochi (calciobalilla/freccette, eventi MQTT, partite) **non viene implementata in questa fase**, come esplicitamente richiesto.

---

## Proposed Changes

### Componente 1: Fix Bug service-core

#### [MODIFY] [Torneo.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-core/src/main/java/com/connectedgames/core/entity/Torneo.java)
- Aggiungere `import jakarta.persistence.ManyToOne;`

#### [MODIFY] [PartitaSyncInput.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-core/src/main/java/com/connectedgames/core/dto/PartitaSyncInput.java)
- Cambiare `int punteggio1` → `Integer punteggio1` e `int punteggio2` → `Integer punteggio2` per rendere `@NotNull` significativo.

---

### Componente 2: Broker MQTT (Mosquitto)

#### [NEW] mosquitto/locale1/mosquitto.conf
- Listener porta 1883 (no TLS, scelta documentata)
- Autenticazione con password file generato dall'entrypoint
- ACL file per isolare topic `locale/BAR_BELVEDERE/eventi`

#### [NEW] mosquitto/locale1/acl.conf
- User `simulator` → `write` su `locale/BAR_BELVEDERE/eventi`
- User `edge-client` → `read` su `locale/BAR_BELVEDERE/eventi`

#### [NEW] mosquitto/locale2/mosquitto.conf
- Identico a locale1, diverso `LOCALE_ID`

#### [NEW] mosquitto/locale2/acl.conf
- User `simulator` → `write` su `locale/SALA_GIOCHI_ROMA/eventi`
- User `edge-client` → `read` su `locale/SALA_GIOCHI_ROMA/eventi`

#### [NEW] mosquitto/entrypoint.sh
- Script bash che genera `password_file` con `mosquitto_passwd` leggendo variabili d'ambiente, poi avvia mosquitto.

---

### Componente 3: Edge Node (Node.js/Express)

#### [NEW] edge/package.json
- Dependencies: `express`, `express-session`, `openid-client` (OIDC), `mqtt`, `better-sqlite3`, `uuid`, `ejs`

#### [NEW] edge/Dockerfile
- `FROM node:20-alpine`, copia sorgenti, `npm ci`, expone porta variabile, avvia con `node server.js`

#### [NEW] edge/server.js
- Express app principale
- Configurazione sessione (memory store, ok per prototipo)
- Middleware di autenticazione (verifica sessione)
- Connessione al broker MQTT locale
- Routes mounting

#### [NEW] edge/routes/auth.js
- `GET /auth/login` → redirect a Keycloak (Authorization Code Flow)
- `GET /auth/callback` → scambio authorization code → JWT in sessione
- `GET /auth/logout` → distruzione sessione + logout Keycloak
- `POST /auth/guest` → accesso Guest Mode (senza rete)
- Logica di fallback: se Keycloak non risponde entro 1s → Guest Mode disponibile

#### [NEW] edge/routes/dashboard.js
- `GET /` → Dashboard con stato connessione, utente loggato, banner offline
- Pagina minimale per testare il flusso auth senza logica giochi

#### [NEW] edge/middleware/auth.js
- Middleware `requireAuth`: controlla se la sessione ha un utente autenticato o guest
- Middleware `requireOnlineAuth`: solo utenti autenticati via Keycloak (non guest)

#### [NEW] edge/services/mqtt-client.js
- Connessione al broker Mosquitto locale
- Subscribe al topic `locale/{LOCALE_ID}/eventi`
- Event emitter per i messaggi ricevuti (pronto per la logica dei giochi futura)

#### [NEW] edge/views/login.ejs
- Pagina di login con bottoni "Accedi con Keycloak" e "Accedi come Ospite" (quest'ultimo visibile solo se Keycloak è irraggiungibile)

#### [NEW] edge/views/dashboard.ejs
- Dashboard con info utente, stato connessione, stato MQTT

#### [NEW] edge/views/layout.ejs
- Layout EJS base con header e footer

---

### Componente 4: Infrastruttura Docker

#### [NEW] init-db.sql
- Crea i database `platform_db` e `keycloak_db`
- Crea lo schema `platform_db` dentro il database `platform_db`
- Esegue lo schema DDL dal doc (tabelle, indici)
- Seed dati iniziali: 2 locali, 2 giochi, 4 installazioni

#### [NEW] keycloak/realm-export.json
- Realm `pissir-realm` con:
  - Client `edge-app` (confidential, authorization code flow)
  - Realm roles: `giocatore`, `admin_locale`, `admin_gioco`, `admin_piattaforma`
  - Un utente di test (`giocatore1` / `password123`)
  - Redirect URIs: `http://localhost:3001/*`, `http://localhost:3002/*`

#### [MODIFY] [docker-compose.yml](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/docker-compose.yml)
- Mosquitto: semplificare la config (no TLS, porta 1883 esposta, montare entrypoint.sh, env vars per credenziali)
- Edge: aggiornare env vars (OIDC client ID/secret, togliere TLS mqtt), aggiungere `KEYCLOAK_INTERNAL_URL`

#### [MODIFY] [.env.example](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/.env.example)
- Aggiungere variabili OIDC: `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
- Aggiungere `SESSION_SECRET`

---

## Open Questions

> [!IMPORTANT]
> **Schema PostgreSQL vs Database**: Le entities JPA usano `schema = "platform_db"`. La mia proposta è di creare nell'`init-db.sql` uno schema `platform_db` dentro il database `platform_db`, così il mapping JPA funziona senza modifiche. Sei d'accordo con questo approccio?

> [!IMPORTANT]  
> **Registrazione utente**: Keycloak in dev mode ha la self-registration disabilitata di default. Vuoi che la abiliti nel realm export (aggiungere il pulsante "Registrati" nella pagina di login di Keycloak)? Oppure per ora creiamo solo utenti di test pre-configurati?

---

## Verification Plan

### Test Automatici
```bash
# Verifica che l'edge compila e si avvia
docker compose up --build edge-locale1

# Verifica che Mosquitto si avvia con le credenziali generate
docker compose up --build mosquitto-locale1
```

### Verifica Manuale
1. `docker compose up --build` → tutti i container si avviano senza errori
2. Navigare su `http://localhost:3001` → pagina login Edge
3. Click "Accedi" → redirect a Keycloak (`http://localhost:9080`)
4. Registrazione/Login con credenziali → redirect di ritorno all'Edge con sessione attiva
5. Verificare la dashboard mostra: username, ruolo, stato MQTT (connesso)
6. Simulare blackout: `docker network disconnect platform-edge-tier edge-locale1` → "Accedi come Ospite" disponibile
