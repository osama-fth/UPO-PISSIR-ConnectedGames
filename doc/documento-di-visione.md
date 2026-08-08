# 🎮 Documento di Visione (Vision Document)
## Connected Games Platform
**Progetto di Laboratorio PISSIR — A.A. 2025/2026 — Università del Piemonte Orientale**

---

## 1. Introduzione & Scopo del Documento

Il presente **Documento di Visione** definisce le specifiche generali, gli obiettivi di business e i requisiti di alto livello per la **Connected Games Platform**, un'infrastruttura software distribuita progettata per connettere dispositivi di gioco fisici (es. Calciobalilla, Freccette, Ping-Pong) distribuiti in locali commerciali (Bar, Sale Giochi, Circoli) a una piattaforma centrale basata su microservizi e cloud.

L'obiettivo principale del sistema è trasformare i classici giochi da bar in un ecosistema **digitale, interattivo e social**, permettendo:
- Ai **Giocatori** di autenticarsi, tracciare le proprie partite e punteggi in tempo reale, competere in tornei regionali/nazionali e consultare classifiche e statistiche globali.
- Agli **Amministratori Locali** di monitorare l'utilizzo e lo stato delle installazioni nei propri locali.
- Agli **Amministratori della Piattaforma** di gestire l'intero ecosistema, creare tornei centralizzati e supervisionare il traffico dati.

---

## 2. Definizione del Problema e Opportunità di Mercato

### 2.1 Il Problema
Nei locali commerciali, i tavoli da gioco tradizionali (calciobalilla, freccette) soffrono dei seguenti limiti:
1. **Nessuna Tracciabilità**: I risultati delle partite sono effimeri e non memorizzati.
2. **Isolamento**: Non esiste un modo strutturato per collegare giocatori di locali diversi in competizioni o tornei trasversali.
3. **Dipendenza dalla Connettività**: I sistemi digitali tradizionali falliscono completamente in caso di disconnessione della rete internet del locale.

### 2.2 La Soluzione Proposta
La **Connected Games Platform** adotta un'architettura ibrida **Edge-to-Cloud**:
- **Tracciamento Automazione IoT**: Sensori hardware installati sui tavoli da gioco inviano eventi istantanei (gol segnati, tiri freccette) via protocollo **MQTTS** a un broker locale (**Mosquitto**).
- **Elaborazione Locale ed Resilienza Offline**: Un nodo **Edge** (Node.js/Express) elabora la partita in tempo reale, bufferizza lo stato e i risultati su un DB SQLite locale e permette il prosieguo del gioco anche in assenza di connessione internet.
- **Piattaforma Centrale e SSO**: Quando la connessione è attiva, i nodi Edge sincronizzano i dati verso la piattaforma centrale (**Spring Boot 3 / Java 21**) tramite un **Service Gateway** protetto da **Keycloak (OIDC/OAuth2)**.

---

## 3. Portatori di Interesse (Stakeholders) ed Utenti

| Portatore di Interesse | Descrizione | Bisogni Principali |
|:---|:---|:---|
| **Giocatore** | Utente finale che gioca nei locali fisici. | Autenticazione rapida via QR/OIDC, tracciamento punteggio in tempo reale, iscrizione ai tornei, storico statistiche. |
| **Admin Locale (Gestore Bar)** | Proprietario/gestore del singolo locale. | Monitoraggio tavoli installati, visualizzazione partite giocate nel locale, gestione manutenzione. |
| **Admin Piattaforma (Super Admin)** | Gestore globale dell'infrastruttura Cloud. | Creazione tornei nazionali, supervisione sincronizzazioni Edge, analisi aggregata delle statistiche globali. |
| **Gestore Infrastruttura (DevOps/SRE)** | Resp. dell'infrastruttura containerizzata. | Resilienza del sistema, isolamento multi-tenant, sicurezza dei dati in transito (TLS/JWT), alta disponibilità. |

---

## 4. Requisiti di Alto Livello del Sistema

### 4.1 Requisiti Funzionali
- **RF-1 Autenticazione Unificata (SSO)**: Autenticazione sicura tramite Keycloak basata su OpenID Connect (Authorization Code Flow con PKCE per Edge public clients, Bearer JWT per API REST).
- **RF-2 Gestione Partita in Tempo Reale**: Ricezione degli eventi sensore via MQTTS e avanzamento del punteggio tramite motore di gioco in-memory sul nodo Edge.
- **RF-3 Resilienza Offline & Sync Bulk**: Salvataggio automatico delle partite su buffer SQLite locale e sincronizzazione atomica verso il Cloud al ripristino della connettività.
- **RF-4 Gestione Tornei Globali**: Creazione di tornei con finestre temporali, iscrizione giocatori (con auto-registrazione sul DB centrale se l'utente non ha mai giocato partite), e calcolo dinamico delle classifiche.
- **RF-5 Dashboard Server-Rendered e API**: Esposizione di dashboard amministrative (Thymeleaf/BFF) e API REST per l'integrazione di client web/mobile.

### 4.2 Requisiti Non Funzionali
- **RNF-1 Sicurezza & Multi-Tenancy**: Isolamento rigoroso dei locali tramite verifica del claim `locale_id` al Service Gateway (Tenant Verification).
- **RNF-2 Resilienza al Crash (C1)**: Persistenza immediata dello stato della partita attiva in SQLite e meccanismi di timeout/TTL per pulizia di partite abbandonate.
- **RNF-3 Sicurezza delle Comunicazioni (C2/M5)**: Cifratura MQTTS con certificati SSL/TLS dedicati per locale e autenticazione service-to-service tramite Client Credentials Grant.
- **RNF-4 Prestazioni & Scalabilità**: Architettura a microservizi disaccoppiati, scalabili indipendentemente tramite containerizzazione Docker.

---

## 5. Panoramica dell'Architettura Globale

```
+-----------------------------------------------------------------------------------+
|                                LIVELLO LOCALE (EDGE)                              |
|                                                                                   |
|  +--------------------+      MQTTS      +-------------------+                     |
|  | Sensore IoT / Sim. | --------------> | Broker Mosquitto  |                     |
|  +--------------------+                 +-------------------+                     |
|                                                   | MQTTS                         |
|                                                   v                               |
|  +--------------------+  HTTP / HTML5   +-------------------+   SQLite Buffer     |
|  | Browser Giocatore  | <-------------> |  Edge Node (Node) | <--------------->   |
|  +--------------------+                 +-------------------+  (Partite attive /   |
|                                                   |             buffer sync)      |
+---------------------------------------------------|-------------------------------+
                                                    | REST / JWT (Bulk Sync)
                                                    v
+-----------------------------------------------------------------------------------+
|                              LIVELLO CENTRALE (CLOUD)                             |
|                                                                                   |
|                               +-----------------------+                           |
|                               |    Service Gateway    |                           |
|                               | (Spring Cloud Gateway)|                           |
|                               +-----------------------+                           |
|                                  /        |        \                              |
|                                 /         |         \                             |
|                                v          v          v                            |
|                     +------------+  +------------+  +-------------------+         |
|                     | Partita    |  | Torneo     |  | Statistiche       |         |
|                     | Service    |  | Service    |  | Service           |         |
|                     +------------+  +------------+  +-------------------+         |
|                           \               |               /                       |
|                            \              |              /                        |
|                             v             v             v                         |
|                           +-------------------------------+                       |
|                           | PostgreSQL (platform_db)      |                       |
|                           +-------------------------------+                       |
|                                           ^                                       |
|                                           | OIDC / Auth                           |
|                           +-------------------------------+                       |
|                           | Keycloak (keycloak_db)        |                       |
|                           +-------------------------------+                       |
+-----------------------------------------------------------------------------------+
```
