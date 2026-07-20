// ============================================================
// services/mqtt-client.js — Client MQTT (Mosquitto)
// Connected Games Platform (PISSIR A.A. 2025/2026)
// ============================================================
// Gestisce la connessione al broker Mosquitto locale.
// Si sottoscrive al topic `locale/{LOCALE_ID}/eventi` per
// ricevere gli eventi dai sensori/simulatori.
// ============================================================

const mqtt = require('mqtt');
const EventEmitter = require('events');

const LOCALE_ID = process.env.LOCALE_ID || 'LOCALE_SCONOSCIUTO';
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

// Credenziali Edge (Sola lettura/sottoscrizione)
const MQTT_SUB_USER = process.env.MQTT_SUB_USER || 'edge-client';
const MQTT_SUB_PASSWORD = process.env.MQTT_SUB_PASSWORD || '';

// Credenziali Simulatore (Sola scrittura/pubblicazione)
const MQTT_PUB_USER = process.env.MQTT_PUB_USER || 'simulator';
const MQTT_PUB_PASSWORD = process.env.MQTT_PUB_PASSWORD || '';

const TOPIC = `locale/${LOCALE_ID}/eventi`;

// Event emitter per distribuire gli eventi MQTT ai consumer interni
const mqttEvents = new EventEmitter();

let clientSub = null;
let clientPub = null;
let connectionStatusSub = 'disconnected';
let connectionStatusPub = 'disconnected';

/**
 * Connette ai broker MQTT locali con due client separati:
 * uno per la subscribe (Edge) e uno per la publish (Simulatore).
 */
function connectMqtt() {
    console.log(`[MQTT] Connessione a ${MQTT_BROKER_URL} (SUB come '${MQTT_SUB_USER}', PUB come '${MQTT_PUB_USER}')...`);

    // --- CLIENT SUBSCRIBE (Edge) ---
    clientSub = mqtt.connect(MQTT_BROKER_URL, {
        username: MQTT_SUB_USER,
        password: MQTT_SUB_PASSWORD,
        clientId: `edge-sub-${LOCALE_ID}-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 10000
    });

    clientSub.on('connect', () => {
        connectionStatusSub = 'connected';
        console.log(`[MQTT SUB] Connesso al broker come ${MQTT_SUB_USER}`);

        // Sottoscrizione al topic del locale (Edge è solo lettore)
        clientSub.subscribe(TOPIC, { qos: 1 }, (err) => {
            if (err) {
                console.error(`[MQTT SUB] Errore sottoscrizione a ${TOPIC}:`, err.message);
            } else {
                console.log(`[MQTT SUB] Sottoscritto a: ${TOPIC}`);
            }
        });
    });

    clientSub.on('message', (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            console.log(`[MQTT SUB] Messaggio ricevuto su ${topic}:`, payload);
            mqttEvents.emit('evento', { topic, payload });
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

    // --- CLIENT PUBLISH (Simulatore) ---
    clientPub = mqtt.connect(MQTT_BROKER_URL, {
        username: MQTT_PUB_USER,
        password: MQTT_PUB_PASSWORD,
        clientId: `edge-pub-${LOCALE_ID}-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 10000
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

/**
 * Pubblica un messaggio sul topic del locale.
 * Usa il client PUB (con ruolo 'simulator').
 */
function publishEvent(eventData) {
    if (!clientPub || connectionStatusPub !== 'connected') {
        console.warn('[MQTT PUB] Impossibile pubblicare: client PUB non connesso');
        return false;
    }

    const message = JSON.stringify(eventData);
    clientPub.publish(TOPIC, message, { qos: 1 }, (err) => {
        if (err) {
            console.error('[MQTT PUB] Errore pubblicazione:', err.message);
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
        topic: TOPIC
    };
}

function getMqttEvents() {
    return mqttEvents;
}

module.exports = {
    connectMqtt,
    publishEvent,
    getMqttStatus,
    getMqttEvents
};
