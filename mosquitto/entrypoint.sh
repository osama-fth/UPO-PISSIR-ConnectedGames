#!/bin/sh
# ============================================================
# entrypoint.sh — Mosquitto con credenziali generate a runtime
# Connected Games Platform (PISSIR A.A. 2025/2026)
# ============================================================
# Questo script viene eseguito come entrypoint del container
# Mosquitto. Genera il password file a partire dalle variabili
# d'ambiente (mai committate nel repo) e avvia il broker.
#
# NOTA: Il password file viene scritto in /mosquitto/data/
# perché /mosquitto/config/ non è scrivibile dall'utente
# mosquitto (UID 1883) nel container ufficiale eclipse-mosquitto.
# ============================================================

set -e

PASSWORD_FILE="/mosquitto/data/password_file"

echo "=== Mosquitto Entrypoint: generazione credenziali ==="

# Verifica che le variabili d'ambiente necessarie siano presenti
if [ -z "$MQTT_PUB_USER" ] || [ -z "$MQTT_PUB_PASSWORD" ]; then
    echo "ERRORE: MQTT_PUB_USER e MQTT_PUB_PASSWORD devono essere definite"
    exit 1
fi

if [ -z "$MQTT_SUB_USER" ] || [ -z "$MQTT_SUB_PASSWORD" ]; then
    echo "ERRORE: MQTT_SUB_USER e MQTT_SUB_PASSWORD devono essere definite"
    exit 1
fi

# Assicura che la directory esista e sia scrivibile
mkdir -p /mosquitto/data

# Genera il password file con mosquitto_passwd
# -c crea un nuovo file, -b usa la password da riga di comando
mosquitto_passwd -c -b "$PASSWORD_FILE" "$MQTT_PUB_USER" "$MQTT_PUB_PASSWORD"
mosquitto_passwd -b "$PASSWORD_FILE" "$MQTT_SUB_USER" "$MQTT_SUB_PASSWORD"

echo "Password file generato in $PASSWORD_FILE con utenti: $MQTT_PUB_USER, $MQTT_SUB_USER"

# Determina il file di configurazione in base al locale
CONFIG_FILE="/mosquitto/config/mosquitto-${LOCALE_ID:-locale1}.conf"

# Avvia Mosquitto con la configurazione
exec mosquitto -c "$CONFIG_FILE"
