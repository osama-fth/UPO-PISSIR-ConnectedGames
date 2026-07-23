# 🗺️ Piano di Implementazione — Connected Games Platform

**Versione:** 1.0 — 23 Luglio 2026  
**Stato:** Da approvare

> [!NOTE]
> Questo documento sostituisce `project_checklist.md` e `analysis_checklist.md` (eliminati).
> Contiene **tutto ciò che resta da implementare**, organizzato per modulo e per priorità.

---

## 0. Riepilogo Architettura Attuale

| Componente | Tecnologia | Stato |
|:---|:---|:---|
| `edge-locale1/2` | Node.js/Express + EJS | ✅ Funzionante (gioco, MQTT, SQLite buffer, sync) |
| `service-gateway` | Spring Boot 3.x (WebFlux) | ✅ Routing + JWT Keycloak |
| `partita-service` | Spring Boot 3.x (JPA) | ✅ API sync bulk |
| `torneo-service` | Spring Boot 3.x (JPA) | ⚠️ Parziale (solo GET, classifica incompleta) |
| `statistiche-service` | Spring Boot 3.x (Thymeleaf + JDBC) | ⚠️ Dashboard minimale, solo card numeriche |
| `postgres-db` | PostgreSQL 15 | ✅ Schema + seed di base |
| `keycloak` | Keycloak 24 | ✅ Realm, ruoli, utenti di test |
| `mosquitto-locale1/2` | Mosquitto (MQTTS) | ✅ TLS self-signed, ACL a due utenti |

---

## 1. API Core Spring Boot — Rotte mancanti da definire

> [!IMPORTANT]
> Attualmente le rotte Edge (simulazione IoT, gioco, partite) vivono tutte su Node.js.
> Le operazioni di **salvataggio partite, creazione torneo, iscrizione torneo, ecc.** devono transitare dalle **API REST dei microservizi Spring Boot** passando attraverso il `service-gateway`.
> La **simulazione del flusso IoT** (MQTT, game-engine, selezione gioco) **resta sulle rotte Edge**.

### 1.1 `partita-service` — Nuove API

| Metodo | Path | Descrizione | Stato |
|:---|:---|:---|:---|
| `POST` | `/api/v1/locali/{localeId}/partite/sincronizza` | Sync bulk dall'Edge | ✅ Esistente |
| `GET` | `/api/v1/locali/{localeId}/giochi` | Lista giochi installati | ✅ Esistente |
| `GET` | `/api/v1/partite` | **[NUOVO]** Lista di tutte le partite (con paginazione + filtri per locale/giocatore/gioco) | ❌ |
| `GET` | `/api/v1/partite/{partitaId}` | **[NUOVO]** Dettaglio singola partita | ❌ |
| `GET` | `/api/v1/utenti` | **[NUOVO]** Lista di tutti gli utenti registrati in platform_db | ❌ |
| `GET` | `/api/v1/utenti/{utenteId}` | **[NUOVO]** Dettaglio utente con statistiche | ❌ |
| `GET` | `/api/v1/utenti/{utenteId}/partite` | **[NUOVO]** Partite giocate dall'utente | ❌ |

#### Dettagli implementazione:

- [x] **`PartitaController`** — Aggiungere endpoint `GET /api/v1/partite` (con `@RequestParam` per filtri: `localeId`, `giocoId`, `giocatoreId`, paginazione `page`/`size`)
- [x] **`PartitaController`** — Aggiungere endpoint `GET /api/v1/partite/{partitaId}` (dettaglio singola partita)
- [x] **`UtenteController`** (nuovo) — `GET /api/v1/utenti`, `GET /api/v1/utenti/{id}`, `GET /api/v1/utenti/{id}/partite`
- [x] **`PartitaService`** — Aggiungere metodi per le nuove query (con `Specification` o query JPQL personalizzate)
- [x] **`PartitaRepository`** — Aggiungere query personalizzate:
  - `findByGiocatore1IdOrGiocatore2Id` (partite di un utente)
  - `findAll` con paginazione (`Pageable`)
  - Query per filtri combinati (locale + gioco + giocatore)
- [x] **`UtenteService`** (nuovo) — Logica di recupero utenti con statistiche aggregate

### 1.2 `torneo-service` — Nuove API

| Metodo | Path | Descrizione | Stato |
|:---|:---|:---|:---|
| `GET` | `/api/v1/tornei` | Lista tornei (con filtro `stato`) | ✅ Esistente |
| `GET` | `/api/v1/tornei/{torneoId}/classifica` | Classifica in tempo reale | ✅ Esistente (ma incompleto) |
| `POST` | `/api/v1/tornei` | **[NUOVO]** Creazione nuovo torneo | ❌ |
| `POST` | `/api/v1/tornei/{torneoId}/iscrizioni` | **[NUOVO]** Iscrizione giocatore al torneo | ❌ |
| `GET` | `/api/v1/tornei/{torneoId}/iscrizioni` | **[NUOVO]** Lista iscritti al torneo | ❌ |
| `GET` | `/api/v1/tornei/{torneoId}` | **[NUOVO]** Dettaglio singolo torneo | ❌ |

#### Dettagli implementazione:

- [x] **`TorneoController`** — Aggiungere `POST /api/v1/tornei` (body: nome, giocoId, dataInizio, dataFine, locali[])
- [x] **`TorneoController`** — Aggiungere `POST /api/v1/tornei/{id}/iscrizioni` (body: utenteId)
- [x] **`TorneoController`** — Aggiungere `GET /api/v1/tornei/{id}/iscrizioni`
- [x] **`TorneoController`** — Aggiungere `GET /api/v1/tornei/{id}` (dettaglio singolo torneo)
- [x] **Tabella `iscrizione_torneo`** (nuova) — Schema: `torneo_id UUID`, `utente_id UUID`, `data_iscrizione TIMESTAMP`, `PRIMARY KEY (torneo_id, utente_id)`
- [x] **Entity `IscrizioneTorneo`** — JPA entity per la nuova tabella
- [x] **`IscrizioneTorneoRepository`** — Repository con metodi `findByTorneoId`, `existsByTorneoIdAndUtenteId`
- [x] **Autorizzazione creazione torneo**: 
  - `admin_piattaforma`: può creare tornei per qualsiasi locale
  - `admin_locale`: può creare tornei solo per il proprio locale
- [x] **Validazione iscrizione**: verificare che il torneo sia ATTIVO, che il giocatore non sia già iscritto, e che il giocatore abbia il ruolo `giocatore`

### 1.3 `statistiche-service` — Nuove API

| Metodo | Path | Descrizione | Stato |
|:---|:---|:---|:---|
| `GET` | `/api/v1/statistiche` | Statistiche globali aggregate | ✅ Esistente (ma incompleto) |
| `GET` | `/api/v1/statistiche/locali/{localeId}` | **[NUOVO]** Statistiche per singolo locale | ❌ |
| `GET` | `/api/v1/statistiche/utenti/{utenteId}` | **[NUOVO]** Statistiche per singolo utente | ❌ |

#### Dettagli implementazione:

- [ ] **`StatisticheRepository`** — Completare le query aggregate (già parzialmente implementato, ma mancano per locale/utente)
- [ ] **`StatisticheRestController`** — Aggiungere endpoint per locale e per utente
- [ ] **`StatisticheBackendService`** — Aggiungere metodi `getStatistichePerLocale(localeId)` e `getStatistichePerUtente(utenteId)`
- [ ] **Nuove query SQL** per:
  - Partite per locale con breakdown per gioco
  - Top giocatori per locale
  - Statistiche utente: partite giocate, vinte, perse, % vittorie, giochi preferiti, tornei partecipati

### 1.4 `service-gateway` — Aggiornamento routing

- [x] Aggiungere rotte nel `application.yml` per i nuovi endpoint:
  - `/api/v1/partite/**` → `partita-service`
  - `/api/v1/utenti/**` → `partita-service`
  - `POST /api/v1/tornei` → `torneo-service`
  - `/api/v1/tornei/{id}/iscrizioni` → `torneo-service`
  - `/api/v1/statistiche/locali/**` → `statistiche-service`
  - `/api/v1/statistiche/utenti/**` → `statistiche-service`
- [x] **`SecurityConfig`** — Aggiungere autorizzazione role-based dove necessario:
  - `POST /api/v1/tornei` → `admin_piattaforma` o `admin_locale`
  - `GET /api/v1/utenti/**` → `admin_piattaforma`
  - `GET /api/v1/partite` (lista completa) → `admin_piattaforma`

### 1.5 OpenAPI — Aggiornamento `openapi-spec.yaml`

- [x] Aggiungere tutti i nuovi path definiti sopra (§1.1, §1.2, §1.3)
- [x] Aggiungere nuovi schema:
  - `TorneoCreateInput` (nome, giocoId, dataInizio, dataFine, locali[])
  - `IscrizioneTorneoInput` (utenteId)
  - `IscrizioneTorneoResponse` (torneoId, utenteId, dataIscrizione)
  - `PartitaDetailResponse` (tutti i campi partita + nomi giocatori + nome locale + nome gioco)
  - `UtenteResponse` (id, username, dataRegistrazione)
  - `UtenteDetailResponse` (id, username, dataRegistrazione, statistiche aggregate)
  - `StatisticheLocaleResponse` (per locale)
  - `StatisticheUtenteResponse` (per utente)
- [x] Aggiungere i nuovi campi `giocatore1Username` e `giocatore2Username` a `PartitaSyncInput`
- [x] Documentare le autorizzazioni richieste per ogni endpoint (403 per ruoli non autorizzati)

---

## 2. Gestione Utenti — Auto-registrazione da Keycloak

> [!IMPORTANT]
> **Requisito chiave**: quando arriva una partita al server, prima di salvarla deve controllare se l'utente (keycloak_sub) esiste in `platform_db.utente`. Se non esiste, lo inserisce con `id` (= keycloak sub) e `username`.
> Il payload della partita dall'Edge deve quindi contenere anche lo `username` per ciascun giocatore.

### 2.1 Modifiche allo schema DB

- [x] **`platform_db.utente`** — Rendere la colonna `email` nullable (o rimuoverla): l'email è già gestita da Keycloak, non serve duplicarla. Lo username è sufficiente come identificativo leggibile.
  ```sql
  ALTER TABLE platform_db.utente ALTER COLUMN email DROP NOT NULL;
  -- oppure DROP COLUMN email; (più pulito)
  ```
- [x] Aggiungere nel `init-db.sql` il DDL aggiornato
- [x] Aggiungere la tabella `iscrizione_torneo`:
  ```sql
  CREATE TABLE IF NOT EXISTS platform_db.iscrizione_torneo (
      torneo_id UUID REFERENCES platform_db.torneo(id) ON DELETE CASCADE NOT NULL,
      utente_id UUID REFERENCES platform_db.utente(id) ON DELETE CASCADE NOT NULL,
      data_iscrizione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      PRIMARY KEY (torneo_id, utente_id)
  );
  ```

### 2.2 Modifiche al DTO `PartitaSyncInput`

- [x] Aggiungere campi `giocatore1Username` e `giocatore2Username` al record Java:
  ```java
  public record PartitaSyncInput(
      @NotNull UUID id,
      @NotBlank String installazioneId,
      @NotBlank String localeId,
      UUID giocatore1Id,
      String giocatore1Username,  // NUOVO
      UUID giocatore2Id,
      String giocatore2Username,  // NUOVO
      @NotNull Integer punteggio1,
      @NotNull Integer punteggio2,
      @NotNull OffsetDateTime dataInizio,
      @NotNull OffsetDateTime dataFine,
      UUID torneoId
  ) {}
  ```

### 2.3 Modifiche a `PartitaService.sincronizzaPartite()`

- [x] Prima di salvare la partita, per ciascun giocatoreId non null:
  1. Cercare l'utente in `UtenteRepository.findById(giocatoreId)`
  2. Se non trovato → **inserirlo** con `id = giocatoreId`, `username = giocatoreXUsername`, `email = null`, `dataRegistrazione = now()`
  3. Se trovato → usare l'entity esistente
- [x] Aggiungere metodo `UtenteRepository.findById()` (già ereditato da JPA) + eventuale `saveAndFlush()`

### 2.4 Modifiche al payload Edge (sync-service.js)

- [x] Nel `sync-service.js`, il payload inviato al server deve includere `giocatore1Username` e `giocatore2Username`:

### 2.5 Modifiche al buffer SQLite Edge

- [x] Aggiungere colonne `giocatore_1_username` e `giocatore_2_username` nella tabella `partite_buffer` di `sqlite-db.js`
- [x] Aggiornare `salvaPartita()` per salvare anche gli username
- [x] Aggiornare `game-engine.js` → `terminaPartita()` per passare gli username al `salvaPartita()`

### 2.6 Modifiche all'entity `Utente.java`

- [x] Rendere il campo `email` nullable (rimuovere `nullable = false` e `unique = true`, oppure rimuovere il campo)
- [x] Stessa modifica su entrambi i moduli: `partita-service/entity/Utente.java` e `torneo-service/entity/Utente.java`

---

## 3. Tornei — Logica completa

### 3.1 Fix classifica esistente

- [x] **`TorneoService.getClassifica()`** — Aggregare su **entrambi i giocatori**, non solo `giocatore1`:
  - Per ogni partita, il giocatore1 e il giocatore2 devono entrambi contribuire alla classifica
  - Giocatore1 con punteggio1 > punteggio2 → vittoria per giocatore1, sconfitta per giocatore2
  - E viceversa
- [x] **Metrica normalizzata** — Calciobalilla: percentuale vittorie (già implementato su un lato). Freccette: punteggio cumulato (somma dei punti fatti)
- [x] **Risposta classifica** — Aggiungere `utenteId` (UUID) alla `VoceClassifica`, non solo il `giocatoreNome`

### 3.2 Flusso completo Edge ↔ Torneo

- [x] **Edge UI — Selezione torneo**: Nella pagina `game-select.ejs`, mostrare i tornei attivi per il locale corrente (fetch da `GET /api/v1/tornei?stato=ATTIVO`)
- [x] **Edge UI — Iscrizione torneo**: Permettere al giocatore di iscriversi a un torneo prima di giocare (`POST /api/v1/tornei/{id}/iscrizioni`)
- [x] **Edge — Verifica iscrizione**: Prima di associare una partita a un torneo, verificare che entrambi i giocatori siano iscritti
- [x] **Edge — Associa `torneoId`**: All'avvio della partita, se è selezionato un torneo, salvare il `torneo_id` nel buffer SQLite
- [x] **Aggiungere colonna `torneo_id`** nella tabella `partite_buffer` di SQLite
- [x] **Sync payload** — Valorizzare `torneoId` nel payload di sincronizzazione (attualmente hardcoded a `null`)
- [x] **Edge UI — Classifica torneo**: Aggiungere una pagina/sezione per visualizzare la classifica in tempo reale (`GET /api/v1/tornei/{id}/classifica`)

### 3.3 Validazione lato server

- [x] **`PartitaService`** — Se la partita ha un `torneoId`:
  - Verificare che il torneo esista e sia ancora nella finestra temporale (lazy: `data_inizio <= data_partita <= data_fine`)
  - Verificare che entrambi i giocatori siano iscritti al torneo
  - Se la validazione fallisce → partita salvata comunque come "amichevole" (torneoId = null) + warning nel log

---

## 4. Dashboard Super Admin — Espansione `statistiche-service`

> [!NOTE]
> Il `statistiche-service` diventa il pannello admin completo della piattaforma.
> Serve un **menu di navigazione laterale/superiore** con le seguenti sezioni.

### 4.1 Menu principale

- [ ] **Navigazione** — Implementare sidebar o topbar con le seguenti voci:
  - 📊 **Dashboard** (home, statistiche globali) — già parziale
  - 👥 **Utenti** (lista utenti registrati)
  - 🎮 **Partite** (lista tutte le partite)
  - 🏆 **Tornei** (lista tornei + dettaglio classifica)
  - 📈 **Statistiche** (drill-down per locale e per utente)

### 4.2 Sezione Utenti

- [x] **Lista utenti** — Tabella con: username, data registrazione, n. partite giocate, n. tornei partecipati
- [x] **Dettaglio utente** — Cliccando su un utente: statistiche personali (partite giocate, % vittorie, giochi preferiti, ultimi risultati)
- [x] Le API necessarie: `GET /api/v1/utenti` e `GET /api/v1/utenti/{id}` (da `partita-service` tramite gateway)

### 4.3 Sezione Partite

- [x] **Lista partite** — Tabella con: data, locale, gioco, giocatore1 vs giocatore2, punteggio, torneo (se presente)
- [x] **Filtri** — Per locale, per gioco, per data, per giocatore
- [x] **Paginazione** — Le partite possono essere molte
- [x] Le API necessarie: `GET /api/v1/partite` (da `partita-service` tramite gateway)

### 4.4 Sezione Tornei

- [x] **Lista tornei** — Tabella con: nome, gioco, stato (ATTIVO/CONCLUSO), date, n. partite, n. iscritti
- [x] **Dettaglio torneo** — Classifica in tempo reale + lista partite del torneo
- [x] **Creazione torneo** — Form per creare un nuovo torneo (solo admin piattaforma dalla dashboard)
- [x] Le API necessarie: `GET /api/v1/tornei`, `GET /api/v1/tornei/{id}/classifica`, `POST /api/v1/tornei`

### 4.5 Sezione Statistiche avanzate

- [ ] **Statistiche globali** — Espandere la dashboard attuale con:
  - Grafico partite nel tempo (giorno/settimana)
  - Top 10 giocatori (% vittorie)
  - Distribuzione giochi (pie chart calciobalilla vs freccette)
- [ ] **Statistiche per locale** — Selezionare un locale e vedere:
  - Partite giocate, giocatori attivi, gioco più popolare
  - Trend nel tempo
- [ ] **Statistiche per utente** — Selezionare un utente e vedere:
  - Partite giocate, % vittorie per gioco, storico risultati
  - Tornei a cui ha partecipato, posizionamenti

### 4.6 Implementazione tecnica

- [x] Il `statistiche-service` chiama le API degli altri microservizi **via gateway** usando `WebClient` o `RestTemplate` (O via frontend Fetch API)
- [x] I dati aggregati (statistiche) vengono calcolati via SQL diretto (`JdbcTemplate` — già usato)
- [x] I dati CRUD (lista utenti, partite, tornei) vengono recuperati via REST dalle API dei rispettivi microservizi
- [x] **Thymeleaf templates** — Nuovi template:
  - `utenti.html` — Lista utenti
  - `utente-dettaglio.html` — Dettaglio utente (modal)
  - `partite.html` — Lista partite
  - `tornei.html` — Lista tornei
  - `torneo-dettaglio.html` — Dettaglio torneo con classifica (modal)
  - `statistiche-locale.html` — Drill-down locale
  - `statistiche-utente.html` — Drill-down utente
- [x] Aggiornare `dashboard.html` con il menu di navigazione e più card/tabelle
- [x] Aggiungere `DashboardController` routes per ogni nuova pagina

---

## 5. Popolamento Database — Seed e Demo

> [!WARNING]
> Senza dati di seed la dashboard sarà vuota alla demo d'esame. Serve uno script SQL di popolamento.

### 5.1 Seed SQL

- [x] **Tornei di esempio** — Aggiungere nel `init-db.sql` almeno 2 tornei:
  - 1 torneo ATTIVO (date che coprano il periodo d'esame) di calciobalilla, coinvolgendo entrambi i locali
  - 1 torneo CONCLUSO di freccette, con un locale
- [x] **Associazioni torneo_locale** — Collegare i tornei ai locali
- [x] **Iscrizioni torneo** — Iscrivere i giocatori di test ai tornei
- [x] **Partite di esempio** — Aggiungere 10-20 partite giocate (mix calciobalilla e freccette, tra i vari locali, con e senza torneo) per avere dashboard non vuote
- [x] **Script separato** `seed-demo.sql` — Per non inquinare il DDL con troppi dati, creare uno script di seed separato montato come secondo init script

### 5.2 Nota tecnica

- Il seed deve rispettare le FK: inserire prima locali → giochi → installazioni → utenti → tornei → torneo_locale → iscrizioni → partite
- Le date delle partite devono cadere nella finestra temporale dei tornei associati

---

## 6. Testing

### 6.1 Test di integrazione automatizzati

- [ ] **Test idempotenza sync** — Inviare lo stesso UUID due volte → seconda volta riconosciuta come già presente, nessun duplicato, count partite invariato
- [ ] **Test semaforo anti race-condition** — Simulare due sync concorrenti → una sola eseguita, l'altra ritorna `inProgress: true`
- [ ] **Test auto-registrazione utente** — Inviare una partita con un `giocatoreId` che non esiste in `platform_db.utente` → utente creato automaticamente
- [ ] **Test iscrizione torneo** — Provare a iscrivere un giocatore a un torneo → successo. Provare a iscrivere lo stesso giocatore di nuovo → errore (duplicato)
- [ ] **Test partita con torneo** — Inviare una partita con `torneoId` valido, con giocatori iscritti → partita salvata con torneo associato
- [ ] **Test partita con torneo senza iscrizione** — Inviare partita con `torneoId` valido, ma giocatori non iscritti → comportamento definito (partita salvata come amichevole o rifiutata?)

### 6.2 Test manuali scriptati

- [ ] **Test Guest Mode** — Keycloak irraggiungibile (timeout) → partita non scritta su SQLite, banner visibile
- [ ] **Test ACL Mosquitto** — Utente `subscribe` non può pubblicare; utente di un locale non accede ai topic di un altro locale
- [ ] **Test scenario blackout** — `docker network disconnect` sulla rete del locale → gioco continua offline → buffer SQLite → `docker network connect` → sync → verifica assenza duplicati in PostgreSQL
- [ ] **Test autorizzazione API** — Giocatore non può accedere a `GET /api/v1/utenti` (403). Admin locale non può accedere a statistiche globali (403). Admin piattaforma può accedere a tutto.

### 6.3 Strumenti

- [ ] Script bash per i test manuali (nella cartella `scripts/`)
- [ ] Per i test di integrazione: usare `curl` o un framework di test (es. `rest-assured` per Java, o `supertest` per Node.js)

---

## 7. Riepilogo File da Modificare/Creare

### File da MODIFICARE

| File | Modifica |
|:---|:---|
| [init-db.sql](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/init-db.sql) | `email` nullable, tabella `iscrizione_torneo`, seed tornei/partite |
| [PartitaSyncInput.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/partita-service/src/main/java/com/connectedgames/core/dto/PartitaSyncInput.java) | Aggiungere `giocatore1Username`, `giocatore2Username` |
| [PartitaService.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/partita-service/src/main/java/com/connectedgames/core/service/PartitaService.java) | Auto-registrazione utente, nuove query |
| [PartitaController.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/partita-service/src/main/java/com/connectedgames/core/controller/PartitaController.java) | Nuovi endpoint GET |
| [PartitaRepository.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/partita-service/src/main/java/com/connectedgames/core/repository/PartitaRepository.java) | Nuove query |
| [Utente.java (partita)](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/partita-service/src/main/java/com/connectedgames/core/entity/Utente.java) | `email` nullable |
| [Utente.java (torneo)](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/torneo-service/src/main/java/com/connectedgames/core/entity/Utente.java) | `email` nullable |
| [UtenteRepository.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/partita-service/src/main/java/com/connectedgames/core/repository/UtenteRepository.java) | Nuove query |
| [TorneoController.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/torneo-service/src/main/java/com/connectedgames/core/controller/TorneoController.java) | Nuovi endpoint POST + GET dettaglio |
| [TorneoService.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/torneo-service/src/main/java/com/connectedgames/core/service/TorneoService.java) | Fix classifica, nuova logica |
| [TorneoRepository.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/torneo-service/src/main/java/com/connectedgames/core/repository/TorneoRepository.java) | Nuove query |
| [sync-service.js](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/sync-service.js) | Aggiungere username + torneoId nel payload |
| [sqlite-db.js](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/sqlite-db.js) | Colonne username + torneo_id |
| [game-engine.js](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/game-engine.js) | Passare username a salvaPartita, salvare torneoId |
| [game-select.ejs](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/views/game-select.ejs) | UI selezione torneo + iscrizione |
| [application.yml (gateway)](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-gateway/src/main/resources/application.yml) | Nuove rotte proxy |
| [SecurityConfig.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-gateway/src/main/java/com/connectedgames/gateway/config/SecurityConfig.java) | Autorizzazione per nuovi endpoint |
| [openapi-spec.yaml](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-gateway/src/main/resources/static/openapi-spec.yaml) | Tutti i nuovi path e schema |
| [StatisticheRepository.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/statistiche-service/src/main/java/com/connectedgames/statistiche/repository/StatisticheRepository.java) | Query per locale/utente |
| [StatisticheRestController.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/statistiche-service/src/main/java/com/connectedgames/statistiche/controller/StatisticheRestController.java) | Nuovi endpoint |
| [DashboardController.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/statistiche-service/src/main/java/com/connectedgames/statistiche/controller/DashboardController.java) | Nuove pagine |
| [dashboard.html](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/statistiche-service/src/main/resources/templates/dashboard.html) | Menu navigazione, più sezioni |

### File da CREARE

| File | Descrizione |
|:---|:---|
| `partita-service/.../controller/UtenteController.java` | API REST utenti |
| `partita-service/.../service/UtenteService.java` | Logica utenti |
| `torneo-service/.../entity/IscrizioneTorneo.java` | Entity iscrizione |
| `torneo-service/.../repository/IscrizioneTorneoRepository.java` | Repository iscrizione |
| `torneo-service/.../dto/TorneoCreateInput.java` | DTO creazione torneo |
| `torneo-service/.../dto/IscrizioneInput.java` | DTO iscrizione |
| `statistiche-service/.../templates/utenti.html` | Vista lista utenti |
| `statistiche-service/.../templates/utente-dettaglio.html` | Vista dettaglio utente |
| `statistiche-service/.../templates/partite.html` | Vista lista partite |
| `statistiche-service/.../templates/tornei.html` | Vista lista tornei |
| `statistiche-service/.../templates/torneo-dettaglio.html` | Vista dettaglio torneo |
| `statistiche-service/.../templates/statistiche-locale.html` | Vista statistiche per locale |
| `statistiche-service/.../templates/statistiche-utente.html` | Vista statistiche per utente |
| `seed-demo.sql` | Script seed con partite/tornei di demo |

### File da ELIMINARE

| File | Motivo |
|:---|:---|
| `project_checklist.md` | Sostituito da questo documento |
| `analysis_checklist.md` | Sostituito da questo documento |

---

## 8. Ordine di Esecuzione Consigliato

> [!TIP]
> Sequenza ottimale per evitare blocchi di dipendenze.

| Fase | Descrizione | Dipende da |
|:---|:---|:---|
| **Fase 1** | Schema DB: `email` nullable, tabella `iscrizione_torneo`, seed tornei | — | ✅ Completata |
| **Fase 2** | Entity JPA aggiornate (Utente, IscrizioneTorneo) + DTO aggiornati | Fase 1 | ✅ Completata |
| **Fase 3** | `PartitaService` — Auto-registrazione utente + nuove API partite/utenti | Fase 2 | ✅ Completata |
| **Fase 4** | `TorneoService` — Creazione torneo + iscrizione + fix classifica | Fase 2 | ✅ Completata |
| **Fase 5** | Edge — SQLite schema update + payload sync + UI selezione torneo | Fase 3, 4 | ✅ Completata |
| **Fase 6** | Gateway — Nuove rotte + autorizzazione | Fase 3, 4 | ✅ Completata |
| **Fase 7** | OpenAPI — Aggiornamento spec completa | Fase 3, 4, 6 | ✅ Completata |
| **Fase 8** | Dashboard Super Admin — Espansione `statistiche-service` | Fase 3, 4, 6 | ✅ Completata |
| **Fase 9** | Seed demo — Script `seed-demo.sql` con dati realistici | Fase 4 | ✅ Completata |
| **Fase 10** | Testing — Test di integrazione + test manuali | Fase 5, 8, 9 |
