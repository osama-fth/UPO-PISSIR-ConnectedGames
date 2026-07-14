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
const MQTT_USER = process.env.MQTT_USER || 'edge-client';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';

const TOPIC = `locale/${LOCALE_ID}/eventi`;

// Event emitter per distribuire gli eventi MQTT ai consumer interni
const mqttEvents = new EventEmitter();

let client = null;
let connectionStatus = 'disconnected';

/**
 * Connette al broker MQTT locale.
 * La connessione è resiliente: si riconnette automaticamente
 * in caso di disconnessione temporanea.
 */
function connectMqtt() {
    console.log(`[MQTT] Connessione a ${MQTT_BROKER_URL} come '${MQTT_USER}'...`);

    client = mqtt.connect(MQTT_BROKER_URL, {
        username: MQTT_USER,
        password: MQTT_PASSWORD,
        clientId: `edge-${LOCALE_ID}-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000, // Riconnessione ogni 5 secondi
        connectTimeout: 10000
    });

    client.on('connect', () => {
        connectionStatus = 'connected';
        console.log(`[MQTT] Connesso al broker`);

        // Sottoscrizione al topic del locale
        client.subscribe(TOPIC, { qos: 1 }, (err) => {
            if (err) {
                console.error(`[MQTT] Errore sottoscrizione a ${TOPIC}:`, err.message);
            } else {
                console.log(`[MQTT] Sottoscritto a: ${TOPIC}`);
            }
        });
    });

    client.on('message', (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            console.log(`[MQTT] Messaggio ricevuto su ${topic}:`, payload);

            // Emette l'evento per i consumer interni (logica giochi futura)
            mqttEvents.emit('evento', { topic, payload });
        } catch (err) {
            console.warn(`[MQTT] Messaggio non JSON su ${topic}:`, message.toString());
        }
    });

    client.on('error', (err) => {
        console.error(`[MQTT] Errore:`, err.message);
        connectionStatus = 'error';
    });

    client.on('reconnect', () => {
        connectionStatus = 'reconnecting';
        console.log(`[MQTT] Riconnessione in corso...`);
    });

    client.on('close', () => {
        connectionStatus = 'disconnected';
    });

    client.on('offline', () => {
        connectionStatus = 'offline';
    });

    return client;
}

/**
 * Pubblica un messaggio sul topic del locale.
 * Usato dal simulatore SVG (freccette) per generare eventi
 * che vengono poi riconsumati dall'Edge stesso via MQTT
 * (rispettando il pattern architetturale sensori→broker→edge).
 */
function publishEvent(eventData) {
    if (!client || connectionStatus !== 'connected') {
        console.warn('[MQTT] Impossibile pubblicare: client non connesso');
        return false;
    }

    const message = JSON.stringify(eventData);
    client.publish(TOPIC, message, { qos: 1 }, (err) => {
        if (err) {
            console.error('[MQTT] Errore pubblicazione:', err.message);
        }
    });
    return true;
}

function getMqttStatus() {
    return {
        status: connectionStatus,
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
