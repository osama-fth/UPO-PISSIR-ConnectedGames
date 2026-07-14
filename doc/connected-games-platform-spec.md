# Connected Games Platform — Specifiche Architetturali

**Progetto di Laboratorio PISSIR — A.A. 2025/2026**

---

## 1. Panoramica

Piattaforma software per connettere a Internet giochi fisici tradizionali, raccogliendo e analizzando dati sullo svolgimento delle partite mantenendone la natura fisica.

**Giochi supportati:** Calciobalilla, Freccette (scope ridotto rispetto all'elenco esteso delle specifiche — bocce e monopoli esclusi per contenere la complessità del prototipo).

**Partite:** solo individuali, non a squadre (semplificazione consapevole rispetto alle specifiche originali, che prevedono anche partite a squadre).

---

## 2. Utenti e Ruoli

| Ruolo | Capacità |
|---|---|
| Giocatore | Partecipa a partite, consulta statistiche proprie, visualizza giochi disponibili, partecipa a tornei |
| Amministratore del Locale | Gestisce i giochi del proprio locale, configura dispositivi, monitora partite, visualizza statistiche locali |
| Amministratore del Gioco | Definisce tipologie di gioco, associa sensori, configura regole di registrazione partite |
| Amministratore della Piattaforma | Gestisce utenti/locali, monitora il sistema, accede a statistiche globali |

Autenticazione via **Keycloak** (Authorization Code Flow) — classificato correttamente come **componente accessorio/facoltativo** rispetto alle specifiche originali, non requisito core. Ruoli gestiti come realm roles su Keycloak; `platform_db` referenzia l'utente tramite `keycloak_sub`, non duplica credenziali.

---

## 3. Architettura Generale

### 3.1 Backend Centrale (`backend-tier`)

- **`service-gateway`** (Java 21, Spring Boot 3.x): entry-point REST, autenticazione JWT, routing, proxy verso `service-core`. Unico nodo connesso sia a `backend-tier` sia a `edge-tier`.
- **`service-core`** (Java 21, Spring Boot 3.x): logica di business (partite, tornei, statistiche), accesso diretto alla persistenza. Comunica solo internamente col gateway.
- **Postgres**: container singolo, due schemi logici isolati — `platform_db` (dati applicativi) e `keycloak_db` (dati Keycloak).

Architettura a microservizi mantenuta come requisito esplicito delle specifiche (gateway + core separati, non accorpati in un unico container).

### 3.2 Componenti Edge (`edge-tier`)

- Node.js/Express, **2 container** dalla stessa immagine Docker, differenziati via variabili d'ambiente (`LOCALE_ID`), per dimostrare i tornei multi-locale.
- Coordinano i giochi del locale, raccolgono dati dai sensori via MQTT, inviano informazioni al server centrale via **REST** (canale Edge↔Server scelto esplicitamente su REST, non su MQTT, tra le due opzioni consentite dalle specifiche).
- Buffer locale offline: **SQLite** via `better-sqlite3` (libreria bloccante, evita errori di concorrenza), su volume Docker, senza container dedicato.

### 3.3 Simulatori

- Container separati (o processi Node con entrypoint dedicato) che sostituiscono l'hardware reale (ESP32/Arduino) per calciobalilla e freccette.
- Comunicano con l'Edge via MQTT (publish di eventi), rispettando il pattern architetturale sensori↔edge.
- Calciobalilla: eventi JSON temporizzati (goal). Freccette: interfaccia interattiva (es. tabellone SVG nel browser Edge) che genera eventi punteggio.

### 3.4 Topologia Docker

7 container totali su due reti isolate:

| Rete | Container |
|---|---|
| `backend-tier` | `service-gateway`, `service-core`, `postgres`, `keycloak` |
| `edge-tier` | `edge-locale1`, `edge-locale2`, `mosquitto-locale1`, `mosquitto-locale2` |

`service-gateway` è l'unico ponte tra le due reti. Blackout simulato con `docker network disconnect` per isolare istantaneamente un Edge senza spegnere l'intero stack.

*(Nota: il conteggio "7 container" storico non include Keycloak e i 2 broker separatamente — va riconciliato numericamente in fase di stesura definitiva del `docker-compose.yml`.)*

---

## 4. MQTT — Sensori ↔ Edge

- **Un broker Mosquitto per locale** (non condiviso), per coerenza con l'isolamento fisico dei locali e per non compromettere lo scenario di blackout simulato.
- **Nessun TLS** — scelta esplicita per contenere la complessità di setup (gestione certificati, CA, scadenze) in un prototipo universitario. Da dichiarare esplicitamente in relazione come compromesso consapevole, non omissione.
- **ACL con due utenti per broker**: uno `publish` (usato dai simulatori), uno `subscribe` (usato dall'Edge). Non si separano le credenziali per singolo gioco (evitando 4 utenti per locale) — la distinzione calciobalilla/freccette avviene nel payload JSON, non nel topic o nelle credenziali.
- **Namespace topic unico per locale**: `locale/{locale_id}/eventi`.
- **Credenziali**: generate a runtime da uno script eseguito nell'entrypoint del container Mosquitto (`mosquitto_passwd`), leggendo variabili da un file `.env` **non versionato**. Il repository include solo `.env.example` con placeholder espliciti (`CHANGE_ME`) da compilare prima dell'avvio.
- **File ACL** (regole di permesso, senza segreti) versionato normalmente nel repo.

---

## 5. Identity & Sicurezza

- **Keycloak**, Authorization Code Flow: l'utente sull'Edge viene reindirizzato a Keycloak, si autentica, riceve un JWT che l'Edge invia al `service-gateway` per autorizzare le operazioni.
- **Scadenza token estesa (~60 minuti)** invece di implementare un refresh flow, per coprire la durata di una partita senza introdurre stati e casi limite aggiuntivi.
- Nessuna gestione esplicita del refresh token — limitazione nota, dichiarata come scelta di scope per il prototipo.

---

## 6. Funzionamento Offline e Guest Mode

- Se l'Edge non riesce a contattare **Keycloak** (timeout): login inibito, sistema passa in **Guest Mode**. Le partite si giocano normalmente ma **non vengono salvate** su SQLite (nessun buffer, dato scartato a runtime). Banner persistente nell'interfaccia Edge segnala esplicitamente "partita non salvata".
- Se l'utente è **autenticato** (Keycloak raggiungibile) ma il **Server Centrale** è irraggiungibile: la partita viene bufferizzata normalmente in SQLite con `player_id` valorizzato, e sincronizzata al ripristino della connessione — stesso comportamento sia in contesto di torneo sia fuori torneo.
- Non c'è distinzione di trattamento tra partita di torneo e partita normale per questo scenario: essendo il Modello A dei tornei (§8) privo di partite dirette cross-locale, non esiste uno scenario di "partita interrotta a metà tra due locali" da gestire — ogni locale gioca sempre in autonomia.

---

## 7. Sincronizzazione Edge → Server

- **Strategia ibrida**: cron job automatico (ogni 5 minuti) + pulsante manuale "Sincronizza Ora".
- **Anti race-condition**: semaforo booleano in-memory su Node.js per evitare invii duplicati simultanei tra cron e trigger manuale.
- **API bulk con successi/fallimenti separati** (`salvate` / `fallite`): un record corrotto non blocca l'intera coda locale.
- **Idempotenza**: ogni partita ha un **UUID generato lato client** (Edge) al momento del salvataggio in SQLite, usato come chiave `UNIQUE` in `platform_db`. Una sync ripetuta con lo stesso UUID viene riconosciuta come "già presente" e non genera duplicati — copre il caso di risposta persa durante il blackout con conseguente retry.

---

## 8. Tornei

**Modello adottato: Modello A — Classifica Aggregata.**

Coerente col vincolo fisico dei giochi (calciobalilla/freccette richiedono i giocatori nello stesso locale — non è possibile un confronto diretto in tempo reale tra locali diversi). Ogni locale gioca le proprie partite localmente; il torneo aggrega i risultati in un'unica classifica, senza bracket a eliminazione diretta.

Caratteristiche:
- Coinvolge un insieme di locali (`torneo_locale`).
- Riguarda un solo tipo di gioco per torneo (mai misto calciobalilla/freccette).
- Composto da un insieme di partite individuali con `torneo_id` valorizzato.
- **Finestra temporale fissa** (`data_inizio`, `data_fine`), calibrata sulla durata reale disponibile per la demo d'esame.
- **Nessuno scheduler/job attivo per la chiusura**: lo stato "aperto/chiuso" è calcolato **lazy** a query-time confrontando `now()` con `data_fine`. Elimina il rischio di race condition tra un job di chiusura e la sync ritardata di partite bufferizzate.
- **Classifica in tempo reale**: l'endpoint di classifica è interrogabile sia durante la finestra aperta sia dopo la chiusura, calcolata ogni volta come query aggregata su `partita` filtrata per `torneo_id`. Il frontend Edge effettua polling periodico (no WebSocket/SSE, giudicati complessità non necessaria per un prototipo).
- Una partita autenticata bufferizzata offline e sincronizzata in ritardo **entra comunque nella classifica** se il suo timestamp di gioco è `<= data_fine`, indipendentemente da quando la sync è effettivamente avvenuta — elimina la necessità di un "grace period" esplicito.
- Metrica di classifica: per freccette il punteggio è direttamente confrontabile; per calciobalilla va normalizzata (es. media goal/partita o % vittorie), non goal totali grezzi, per non favorire chi gioca semplicemente più partite.

---

## 9. Schema Dati — `platform_db`

Tabelle previste:

- `utente` — riferimento `keycloak_sub`, ruolo
- `locale`
- `gioco`
- `sensore_gioco` — definizione sensori/eventi per tipo di gioco (livello minimo di astrazione per rendere plausibile il ruolo Amministratore del Gioco, anche senza implementare giochi aggiuntivi)
- `installazione_gioco` — associazione gioco↔locale, identificativo univoco nel locale
- `partita` — con colonna `UUID` (chiave univoca lato client, idempotenza sync), `player_id` nullable (per compatibilità storica con guest mode, sebbene le partite guest non vengano più salvate nella versione corrente), `torneo_id` nullable, timestamp
- `evento_partita` — opzionale, solo se si vuole tracciare il dettaglio evento-per-evento oltre al risultato finale
- `torneo`
- `torneo_locale`

Le statistiche (partite giocate, % vittorie, punteggi medi) sono calcolate **live** via query aggregata, non materializzate in una tabella separata — coerente con l'approccio lazy scelto per la classifica torneo.

`keycloak_db`: schema gestito automaticamente da Keycloak, non modellato manualmente.

---

## 10. Avvio e Ordine dei Container

- **Script di verifica pre-avvio** (`check-env.sh`), eseguito dall'utente prima di `docker compose up`: controlla che `.env` esista e che le variabili richieste (credenziali MQTT, Keycloak, Postgres) siano presenti e non ancora al valore placeholder.
- **`depends_on` con `condition: service_healthy`** nel `docker-compose.yml` per ogni servizio critico (Mosquitto, Postgres, service-core) — non solo dichiarazione di ordine di avvio, ma attesa di readiness effettiva.
- Healthcheck Mosquitto: publish di test su topic dedicato via `mosquitto_pub`.
- Healthcheck Postgres: `pg_isready`.
- Healthcheck Keycloak: **da definire** — verificare quale endpoint di readiness espone la versione utilizzata prima di considerarlo chiuso.

Flusso di consegna: `git clone` → `cp .env.example .env` → compilazione manuale delle variabili → `./check-env.sh` → `docker compose up --build`.

---

## 11. Piano di Test

- **Unit test — idempotenza sync**: stesso UUID inviato due volte → seconda chiamata riconosciuta come "già presente", nessun duplicato.
- **Unit test — semaforo anti race-condition**: due sync concorrenti (cron + manuale) → una sola eseguita, l'altra fallisce esplicitamente.
- **Integration test — Guest Mode**: Keycloak irraggiungibile (mock/timeout) → partita non scritta su SQLite, stato di risposta esplicito.
- **Integration test — ACL Mosquitto**: utente `subscribe` non può pubblicare; utente di un locale non accede ai topic di un altro locale.
- **Test manuale scriptato — scenario blackout**: `docker network disconnect` → gioco offline → buffer SQLite → riconnessione → sync → verifica assenza duplicati. Da eseguire più volte prima dell'esame.

---

## 12. Limitazioni Note e Scelte Dichiarate (da esplicitare in relazione)

- Nessun supporto partite a squadre (solo individuali).
- Nessun gioco oltre calciobalilla/freccette implementato concretamente (astrazione minima presente via `sensore_gioco`).
- Nessun refresh token: scadenza JWT estesa come workaround.
- Nessun TLS su MQTT: giustificato dal perimetro di rete Docker isolato, non da assenza di rischio in assoluto.
- Credenziali Mosquitto generate a runtime, mai committate; solo `.env.example` con placeholder nel repository.
- Nessuna gestione esplicita di partite di torneo con locale offline oltre al normale meccanismo di buffer/sync — nessuno scenario di "interruzione" a metà partita da gestire, dato il Modello A.

---

## 13. Elementi Ancora Aperti

- Healthcheck Keycloak non definito.
- Reciprocità numerica tra "7 container" dichiarati storicamente e l'elenco effettivo (che include Keycloak e 2 broker separati) da riconciliare nel `docker-compose.yml` definitivo.
- Durata esatta della finestra temporale del torneo, da calibrare sul tempo reale disponibile in sede d'esame.
- Piano di popolamento dati pre-demo (partite giocate manualmente in anticipo per non partire da una classifica vuota) non ancora dettagliato in una checklist operativa.
