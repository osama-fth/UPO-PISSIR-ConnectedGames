// Gestione delle connessioni MQTTS al broker Mosquitto locale (subscriber per sensori, publisher per simulazione).
// Topic strutturati: locale/{LOCALE_ID}/{giocoId}/{tipoEvento} — wildcard +/+ per ricevere tutti i giochi.

const fs = require('fs');
const mqtt = require('mqtt');
const EventEmitter = require('events');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtts://localhost:8883';
const MQTT_CA_PATH = process.env.MQTT_CA_PATH || null;

const MQTT_SUB_USER = process.env.MQTT_SUB_USER || 'edge-client';
const MQTT_SUB_PASSWORD = process.env.MQTT_SUB_PASSWORD || '';
const MQTT_PUB_USER = process.env.MQTT_PUB_USER || 'simulator';
const MQTT_PUB_PASSWORD = process.env.MQTT_PUB_PASSWORD || '';

// Base topic del locale — i topic specifici hanno forma: BASE_TOPIC/{giocoId}/{tipoEvento}
const BASE_TOPIC = `locale/${LOCALE_ID}`;
// Pattern wildcard per ricevere tutti gli eventi di tutti i giochi del locale
const SUB_TOPIC_PATTERN = `${BASE_TOPIC}/+/+`;

const mqttEvents = new EventEmitter();

let clientSub = null;
let clientPub = null;
let connectionStatusSub = 'disconnected';
let connectionStatusPub = 'disconnected';

// Costruisce il topic MQTT specifico per un gioco e tipo evento
function buildTopic(giocoId, tipoEvento) {
    return `${BASE_TOPIC}/${giocoId.toLowerCase()}/${tipoEvento.toLowerCase()}`;
}

// Estrae giocoId e tipoEvento dal topic in arrivo (locale/{ID}/{gioco}/{evento})
function parseTopic(topic) {
    const segments = topic.split('/');
    // Formato atteso: locale / {LOCALE_ID} / {giocoId} / {tipoEvento}
    if (segments.length >= 4) {
        return { giocoId: segments[2], tipoEvento: segments[3] };
    }
    return { giocoId: null, tipoEvento: null };
}

// Crea due client MQTTS distinti (lettore sensori e scrittore simulatori) con opzioni TLS
function connectMqtt() {
    console.log(`[MQTT] Connessione a ${MQTT_BROKER_URL} (SUB come '${MQTT_SUB_USER}', PUB come '${MQTT_PUB_USER}')...`);

    const tlsOptions = {
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 10000
    };

    if (MQTT_CA_PATH && fs.existsSync(MQTT_CA_PATH)) {
        console.log(`[MQTT TLS] Caricamento certificato CA da ${MQTT_CA_PATH}`);
        tlsOptions.ca = [fs.readFileSync(MQTT_CA_PATH)];
        tlsOptions.rejectUnauthorized = true;
    } else {
        tlsOptions.rejectUnauthorized = process.env.MQTT_REJECT_UNAUTHORIZED === 'true';
    }

    clientSub = mqtt.connect(MQTT_BROKER_URL, {
        ...tlsOptions,
        username: MQTT_SUB_USER,
        password: MQTT_SUB_PASSWORD,
        clientId: `edge-sub-${LOCALE_ID}-${Date.now()}`
    });

    clientSub.on('connect', () => {
        connectionStatusSub = 'connected';
        console.log(`[MQTT SUB] Connesso al broker come ${MQTT_SUB_USER}`);

        // Sottoscrizione wildcard: riceve tutti i giochi e tutti i tipi di evento del locale
        clientSub.subscribe(SUB_TOPIC_PATTERN, { qos: 1 }, (err) => {
            if (err) {
                console.error(`[MQTT SUB] Errore sottoscrizione a ${SUB_TOPIC_PATTERN}:`, err.message);
            } else {
                console.log(`[MQTT SUB] Sottoscritto a: ${SUB_TOPIC_PATTERN}`);
            }
        });
    });

    clientSub.on('message', (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            // Arricchisce il payload con i metadati estratti dal topic
            const { giocoId, tipoEvento } = parseTopic(topic);
            if (giocoId && tipoEvento) {
                payload._giocoIdFromTopic = giocoId;
                payload._tipoEventoFromTopic = tipoEvento;
            }
            console.log(`[MQTT SUB] Messaggio ricevuto su ${topic}:`, payload);
            mqttEvents.emit('evento', { topic, payload, giocoId, tipoEvento });
        } catch (err) {
            console.warn(`[MQTT SUB] Messaggio non JSON su ${topic}:`, message.toString());
        }
    });

    clientSub.on('error', (err) => {
        console.error(`[MQTT SUB] Errore:`, err.message);
        connectionStatusSub = 'error';
    });

    clientSub.on('reconnect', () => { connectionStatusSub = 'reconnecting'; });
    clientSub.on('close', () => { connectionStatusSub = 'disconnected'; });
    clientSub.on('offline', () => { connectionStatusSub = 'offline'; });

    clientPub = mqtt.connect(MQTT_BROKER_URL, {
        ...tlsOptions,
        username: MQTT_PUB_USER,
        password: MQTT_PUB_PASSWORD,
        clientId: `edge-pub-${LOCALE_ID}-${Date.now()}`
    });

    clientPub.on('connect', () => {
        connectionStatusPub = 'connected';
        console.log(`[MQTT PUB] Connesso al broker come ${MQTT_PUB_USER}`);
    });

    clientPub.on('error', (err) => {
        console.error(`[MQTT PUB] Errore:`, err.message);
        connectionStatusPub = 'error';
    });

    clientPub.on('reconnect', () => { connectionStatusPub = 'reconnecting'; });
    clientPub.on('close', () => { connectionStatusPub = 'disconnected'; });
    clientPub.on('offline', () => { connectionStatusPub = 'offline'; });

    return { clientSub, clientPub };
}

// Pubblica un evento sul topic specifico del gioco (locale/{ID}/{giocoId}/{tipoEvento})
function publishEvent(eventData, giocoId, tipoEvento) {
    if (!clientPub || connectionStatusPub !== 'connected') {
        console.warn('[MQTT PUB] Impossibile pubblicare: client PUB non connesso');
        return false;
    }

    const topic = buildTopic(giocoId, tipoEvento);
    const message = JSON.stringify(eventData);
    clientPub.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
            console.error(`[MQTT PUB] Errore pubblicazione su ${topic}:`, err.message);
        }
    });
    return true;
}

function getMqttStatus() {
    return {
        status: (connectionStatusSub === 'connected' && connectionStatusPub === 'connected') ? 'connected' : 'degraded',
        statusSub: connectionStatusSub,
        statusPub: connectionStatusPub,
        broker: MQTT_BROKER_URL,
        baseTopic: BASE_TOPIC,
        subPattern: SUB_TOPIC_PATTERN
    };
}

function getMqttEvents() {
    return mqttEvents;
}

module.exports = {
    connectMqtt,
    publishEvent,
    getMqttStatus,
    getMqttEvents,
    buildTopic
};
