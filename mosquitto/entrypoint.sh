#!/bin/sh
# Generazione dinamica del password file Mosquitto e certificati TLS mTLS al boot del container.

set -e

PASSWORD_FILE="/mosquitto/data/password_file"

echo "=== Mosquitto Entrypoint: generazione credenziali ==="

if [ -z "$MQTT_PUB_USER" ] || [ -z "$MQTT_PUB_PASSWORD" ]; then
    echo "ERRORE: MQTT_PUB_USER e MQTT_PUB_PASSWORD devono essere definite"
    exit 1
fi

if [ -z "$MQTT_SUB_USER" ] || [ -z "$MQTT_SUB_PASSWORD" ]; then
    echo "ERRORE: MQTT_SUB_USER e MQTT_SUB_PASSWORD devono essere definite"
    exit 1
fi

mkdir -p /mosquitto/data

mosquitto_passwd -c -b "$PASSWORD_FILE" "$MQTT_PUB_USER" "$MQTT_PUB_PASSWORD"
mosquitto_passwd -b "$PASSWORD_FILE" "$MQTT_SUB_USER" "$MQTT_SUB_PASSWORD"

echo "Password file generato in $PASSWORD_FILE con utenti: $MQTT_PUB_USER, $MQTT_SUB_USER"

CERT_KEY="/mosquitto/data/server.key"
CERT_CRT="/mosquitto/data/server.crt"

echo "=== Generazione certificati TLS dedicati per '${LOCALE_ID:-default}' ==="
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_KEY" \
    -out "$CERT_CRT" \
    -subj "/C=IT/ST=Piemonte/L=Vercelli/O=PISSIR/OU=ConnectedGames/CN=mosquitto-${LOCALE_ID:-locale}"
chmod 0600 "$CERT_KEY"
chmod 0644 "$CERT_CRT"

CONFIG_FILE="/mosquitto/config/mosquitto-${LOCALE_ID}.conf"
exec mosquitto -c "$CONFIG_FILE"
