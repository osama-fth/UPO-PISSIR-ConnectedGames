# Connected Games

**Autori:** Foutih Osama, Bellotti Lorenzo, Riccardo Negrini

---

## 1. Descrizione del prodotto

### 1.1 Scopo del prodotto
Connected Games è una piattaforma software ideata per connettere a Internet giochi che per loro natura tradizionale non sarebbero online (ad esempio calciobalilla, freccette, biliardo).

Lo scopo principale è mantenere la natura fisica dei giochi, integrandoli con dispositivi elettronici ed IoT per rilevare e raccogliere in tempo reale le varie dinamiche della partita (es. gol, punteggi, lanci).

Queste informazioni vengono elaborate localmente e successivamente inviate a una piattaforma centrale cloud per analizzare lo svolgimento delle partite, gestire tornei e fornire statistiche avanzate.

### 1.2 Destinatario del prodotto
Il sistema è progettato per soddisfare le esigenze di tre tipologie principali di utenti:

* **Giocatori**: Utenti finali che partecipano alle partite nei locali fisici ed interagiscono con la piattaforma per consultare i propri punteggi, le statistiche personali, i giochi disponibili ed iscriversi ai tornei.
* **Amministratori del Locale**: Soggetti responsabili di un raggruppamento di giochi all'interno di uno specifico luogo fisico (es. gestore del bar o sala giochi). Si occupano di organizzare i turni di gioco, configurare i dispositivi locali e monitorare le statistiche del proprio locale.
* **Amministratori della Piattaforma**: Soggetti "super admin" del sistema cloud che gestiscono l'intera piattaforma, nominano e gestiscono altri amministratori, amministrano utenti e locali e monitorano le statistiche globali.

### 1.3 Ambito di utilizzo del prodotto
Il prodotto viene utilizzato in contesti fisici denominati "locali", i quali possono essere luoghi pubblici (es. bar, sale giochi) o luoghi privati (es. abitazioni). Ogni gioco deve essere identificabile univocamente all'interno di questi spazi. I dati raccolti sono sincronizzati su un server centrale per un accesso globale via rete pubblica.

### 1.4 Obiettivi del prodotto
I principali obiettivi strategici ed operativi della piattaforma sono:

1. **Centralizzazione dei dati**: Raccogliere e centralizzare i dati di gioco provenienti da più sedi fisiche per la generazione di statistiche avanzate, classifiche e storico delle partite.
2. **Gestione Tornei Strutturati**: Permettere la creazione e l'organizzazione di tornei che coinvolgono locali differenti anche su scala regionale o nazionale.
3. **Accessibilità ed Integrazione di Rete**: Garantire l'accessibilità sicura al sistema centrale dalla rete pubblica, pur collegando dispositivi IoT installati all'interno di reti locali private.
4. **Resilienza e Continuità Offline**: Assicurare il funzionamento continuo e resiliente del gioco anche in assenza temporanea o prolungata di connettività internet nel locale.

### 1.5 Funzionalità principali
* **Architettura Edge-Cloud**: Presenza di un Componente Edge locale che coordina i giochi, raccoglie i dati e li invia al server centrale comunicando tramite API REST o Broker MQTT.
* **Funzionamento Offline**: I giochi si collegano al Componente Edge formando una mini rete locale; in caso di perdita di connessione il sistema memorizza temporaneamente i dati e li sincronizza al ripristino della rete.
* **Interfaccia Utente Multipla**: Previsione di un'interfaccia utente locale per il gioco e un'interfaccia personale (web) per consultare le statistiche.
* **Gestione Tornei**: Possibilità di generare tornei per un singolo tipo di gioco, raccogliendo i risultati di diverse partite in una classifica finale.

---

## 2. Glossario utente

| Termine | Definizione nel contesto |
| :--- | :--- |
| **Locale** | Luogo fisico, pubblico o privato, in cui sono installati uno o più giochi tradizionali identificati in modo univoco. |
| **Componente Edge** | Dispositivo intermedio presente in ogni locale che crea una rete locale tra i giochi, raccoglie i dati sensoriali e li invia al server centrale. |
| **Sensori e Attuatori** | Dispositivi reali o simulati applicati al gioco fisico: i sensori rilevano gli eventi di gioco (es. gol nel calciobalilla), mentre gli attuatori eseguono azioni o segnalazioni fisiche (es. sblocco palline o LED). |
| **Broker MQTT** | Tecnologia basata su pubblicazione/sottoscrizione utilizzata per lo scambio messaggi tra il server cloud, il nodo edge e i dispositivi hardware. |

---

## 3. Vincoli
* Il server centrale deve necessariamente esporre API REST per l'integrazione globale dei client e dei nodi Edge.
* Gli utenti devono autenticarsi tramite un servizio dedicato di Gestione Identità (Identity Provider / Keycloak) basato su standard OpenID Connect / OAuth2.
* Il Database Cloud centrale deve essere interfacciato esclusivamente dai microservizi della piattaforma centrale; i nodi Edge gestiscono un proprio storage/buffer locale temporaneo.
* I giochi fisici devono integrare sensori reali o emulati tramite software di simulazione per la generazione dei dati di partita.

---

## 4. Obiettivi e criteri di successo
* **Resilienza (Offline)**: Il sistema deve garantire il salvataggio dei dati delle partite in locale tramite Edge e la successiva corretta sincronizzazione col server, permettendo all'utente di giocare anche in assenza di rete senza perdite di informazioni.
* **Funzionamento Real-time**: I dati sensoriali prelevati dal gioco devono poter aggiornare l'interfaccia utente locale del gioco in modo tempestivo, mostrando statistiche e punteggi della partita corrente.
* **Integrazione Dimostrata**: Durante l'esame finale, la demo dovrà mostrare con successo l'integrazione di tutti i componenti (sensori/emulatori, edge, server, UI) in scenari realistici di utilizzo.

---

## 5. Stakeholder

| Stakeholder | Ruolo e Interesse |
| :--- | :--- |
| **Giocatori** | Utenti finali interessati a tracciare i propri progressi, consultare statistiche e comparare i punteggi tramite classifiche e tornei. |
| **Gestori di Locali** | Proprietari dei locali interessati a valorizzare e incentivare l'utilizzo dei giochi fisici nelle proprie strutture. |
| **Amministratori della Piattaforma** | Responsabili della gestione globale del sistema, della creazione dei tornei e del controllo degli accessi. |
| **Team di Sviluppo** | Responsabili dell'architettura software a microservizi, dell'integrazione dei protocolli e della realizzazione delle interfacce. |

---

## 6. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
| :--- | :---: | :---: | :--- |
| **Caduta Connessione Internet del Locale** | Alta | Medio | Il sistema delega la logica locale al Componente Edge, che crea una mini rete isolata e funge da buffer dati (Funzionamento Offline). |
| **Malfunzionamento / Assenza Hardware Reale** | Media | Alto | Implementazione di applicazioni software di simulazione capaci di generare eventi realistici per emulare il comportamento dei sensori e attuatori durante lo sviluppo e test. |
| **Discrepanze di Sincronizzazione Dati** | Bassa | Alto | Solo il Server Centrale detiene l'accesso esclusivo e diretto al Database Cloud, agendo come un'unica fonte di verità ed evitando inconsistenze di concorrenza. |
