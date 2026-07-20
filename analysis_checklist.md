# 🔍 Analisi Gap — Connected Games Platform


## ❌ Funzionalità Mancanti

### Edge — Tornei (UC5)
- [ ] **Selezione torneo all'avvio partita** — L'Edge non mostra i tornei attivi e non permette di associare una partita a un `torneo_id`. Il campo è hardcoded a `null` in [sync-service.js:L72](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/sync-service.js#L72).
- [ ] **Fetch tornei attivi dal gateway** — L'Edge non chiama `GET /api/v1/tornei?stato=ATTIVO` per popolare la selezione tornei nella UI.
- [ ] **Visualizzazione classifica torneo** — Nessuna pagina/rotta nell'Edge per consultare `GET /api/v1/tornei/{id}/classifica`.
- [ ] **Seed torneo di test in `init-db.sql`** — Nessun torneo di esempio nel database, quindi le API tornei non restituiranno dati utili alla demo.

### Edge — Guest Mode / Fallback Offline (UC1.1)
- [x] **Pulsante "Accedi come Ospite"** — La specifica prevede un fallback esplicito con pulsante "Accedi come Ospite" quando Keycloak è irraggiungibile (timeout > 1s). Attualmente non implementato nelle views.
- [x] **Partita come Ospite dalla UI** — Non c'è un flusso che permetta di giocare con `player_id = NULL` (la rotta `/game/start` richiede sempre credenziali).
- [x] **Banner "partita non salvata"** — In Guest Mode, la specifica richiede un banner persistente per avvertire che la partita non verrà salvata su SQLite.

### Edge — ACL MQTT
- [ ] **ACL `edge-client` con permesso `readwrite`** — In [acl.conf](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/mosquitto/locale1/acl.conf#L17) l'edge ha `readwrite`, ma la specifica §4 dice: "*uno `publish` (usato dai simulatori), uno `subscribe` (usato dall'Edge)*". Il simulatore pubblica dall'Edge stesso (`publishEvent`), quindi l'Edge ha bisogno di `readwrite`, ma questo viola le ACL come specificate. Va chiarito o separato il flusso.

### Statistiche — Dashboard Globale (UC8)
- [ ] **Statistiche globali incomplete** — L'API `GET /api/v1/statistiche` restituisce solo conteggi grezzi (`count`). L'OpenAPI spec richiede `localiPiuAttivi` e `giochiPiuUtilizzati` come array aggregati. [StatisticheService.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/partita-service/src/main/java/com/connectedgames/core/service/StatisticheService.java) fa solo `count()`.
- [ ] **Dashboard `statistiche-service` quasi vuota** — La [dashboard.ejs](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/statistiche-service/views/dashboard.ejs) mostra solo 3 card numeriche. Mancano: tabelle dettagliate, grafici, drill-down per locale/gioco.

### Classifica Torneo — Logica Incompleta
- [ ] **Aggregazione su entrambi i giocatori** — [TorneoService.java:L65](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/torneo-service/src/main/java/com/connectedgames/core/service/TorneoService.java#L65) aggrega solo su `giocatore1`. Il commento dice "*In uno scenario reale si userebbero entrambi i giocatori*" — va completato.
- [ ] **Metrica normalizzata per calciobalilla** — La specifica richiede "% vittorie" o "media gol/partita" per non favorire chi gioca più partite. Attualmente usa solo conteggio raw.

### Sicurezza & Autorizzazione
- [ ] **Autorizzazione role-based sulle rotte Gateway** — [SecurityConfig.java](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/service-gateway/src/main/java/com/connectedgames/gateway/config/SecurityConfig.java) non filtra per ruolo. Le statistiche globali dovrebbero essere accessibili solo a `admin_piattaforma` (403 Forbidden per altri ruoli come da OpenAPI).
- [ ] **Utente `edge_sync_service` in Keycloak** — Il cron di sync usa `directPasswordAuth('edge_sync_service', 'syncpassword')` in [sync-service.js:L89](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/edge/services/sync-service.js#L89), ma non c'è evidenza che questo utente esista nel realm-export.json.

### Testing (Piano di Test §11)
- [ ] **Test idempotenza sync** — Stesso UUID inviato due volte → nessun duplicato. Non presente.
- [ ] **Test semaforo anti race-condition** — Due sync concorrenti → una sola eseguita. Non presente.
- [ ] **Test Guest Mode** — Keycloak irraggiungibile → partita non scritta su SQLite. Non presente.
- [ ] **Test ACL Mosquitto** — Utente `subscribe` non può pubblicare. Non presente.
- [ ] **Test scenario blackout** — `docker network disconnect` → gioco offline → buffer → riconnessione → no duplicati. Non testato.

### Documentazione / Delivery
- [ ] **Healthcheck Keycloak** — Il [docker-compose.yml](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/docker-compose.yml#L74) usa un healthcheck con `exec 3<>/dev/tcp/...` che è fragile e documentato come "da definire" nelle specifiche §10.
- [ ] **Healthcheck Edge** — Nessun `healthcheck` nel docker-compose per i container Edge.
- [ ] **Piano di popolamento dati pre-demo** — Nessun script o seed di partite giocate per non avere dashboard vuote all'esame.
- [ ] **README non aggiornato** — Menziona ancora `service-core` (ormai eliminato/sostituito da `partita-service` e `torneo-service`).

---

## 🟡 Parzialmente Implementato

| Funzionalità | Stato | Note |
|:---|:---|:---|
| Sync Edge→Cloud | ✅ Funzionante | Ma `torneoId` hardcoded a `null` |
| MQTT event loop | ✅ Connessione OK | Ma gli eventi vengono processati in-line (`processaEvento`), non tramite callback MQTT reale |
| Dashboard Admin Locale | ✅ Vista presente | Manca il pulsante "Sincronizza Ora" collegato alla rotta esistente? (verificare nella view) |
| Freccette SVG | ✅ Logica backend OK | Il tabellone SVG interattivo è nel template `game-play.ejs` |

---

## 🔐 TLS per MQTT — Fattibilità Zero-Config

> [!IMPORTANT]
> Le specifiche dichiarano esplicitamente **"Nessun TLS"** come scelta consapevole. Aggiungere TLS è un plus che migliora la valutazione, ma deve restare **zero-config**.

### Approccio proposto: CA auto-generata nell'entrypoint

Si può estendere l'[entrypoint.sh](file:///Users/osamafoutih/Desktop/Università/3anno/pissir/progetto/connectedgames/mosquitto/entrypoint.sh) del container Mosquitto per:

1. **Generare una CA root self-signed** al primo avvio (se non esiste già)
2. **Emettere certificati server** per ogni broker Mosquitto
3. **Emettere certificati client** per ogni Edge
4. **Montare i certificati** via volume condiviso Docker

Tutto in un **singolo script** eseguito prima di `mosquitto -c ...`, con i certificati scritti su un volume Docker condiviso tra broker ed edge. Il risultato:

- `docker compose up --build` → parte tutto, TLS incluso
- Nessuna configurazione manuale di certificati
- Certificati rigenerati ad ogni `docker compose down -v && up`

### Checklist implementazione TLS

- [ ] Creare script `generate-certs.sh` che genera CA + cert server + cert client con `openssl`
- [ ] Aggiungere un container `init` (o un `depends_on` + volume) che genera i certificati prima dell'avvio dei broker
- [ ] Aggiornare `mosquitto.conf` per abilitare `listener 8883` con `certfile`, `keyfile`, `cafile`
- [ ] Aggiornare `mqtt-client.js` per connettersi via `mqtts://` con il cert client
- [ ] Aggiornare le env var nel `docker-compose.yml` (`MQTT_BROKER_URL=mqtts://...`)
- [ ] Mantenere retrocompatibilità: flag env `MQTT_TLS_ENABLED=true|false`

