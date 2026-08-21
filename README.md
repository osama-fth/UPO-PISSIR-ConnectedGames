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

La password per tutti gli account interattivi di test è: **`password`**  
*(eccezione fatta per `edge_sync_service` la cui password è `syncpassword`)*.

| Username | Email | Ruolo Keycloak | Vista Dashboard / Ambito Test |
| :--- | :--- | :--- | :--- |
| `SuperMario` | `mario.rossi@example.com` | `giocatore` | Area scansione QR avvio partite e storico vittorie. |
| `Gigio` | `luigi.bianchi@example.com` | `giocatore` | Area scansione QR avvio partite e storico vittorie. |
| `SantAnna` | `anna.verdi@example.com` | `giocatore` | Area scansione QR avvio partite e storico vittorie. |
| `Paul` | `paolo.neri@example.com` | `giocatore` | Area scansione QR avvio partite e storico vittorie. |
| `LukeSkywalker` | `luca.gialli@example.com` | `giocatore` | Area scansione QR avvio partite e storico vittorie. |
| `Saretta` | `sara.viola@example.com` | `giocatore` | Area scansione QR avvio partite e storico vittorie. |
| `admin_belvedere` | `admin.belvedere@example.com` | `admin_locale` | Console di monitoraggio e manutenzione tavoli (Bar Belvedere - `http://localhost:3001`). |
| `admin_roma` | `admin.roma@example.com` | `admin_locale` | Console di monitoraggio e manutenzione tavoli (Sala Giochi Roma - `http://localhost:3002`). |
| `admin_piattaforma` | `admin.platform@example.com` | `admin_piattaforma` | Dashboard di supervisione globale piattaforma (`http://localhost:8081/dashboard`). |


*(Per collaudare le varie Dashboard, è sufficiente effettuare il Login dall'Edge Node con uno degli username indicati).*

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
