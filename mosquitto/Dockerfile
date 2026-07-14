# ============================================================
# Dockerfile — Broker MQTT Mosquitto Custom
# Connected Games Platform (PISSIR A.A. 2025/2026)
# ============================================================
FROM eclipse-mosquitto:2.0

# Copia i file di configurazione nell'immagine per bypassare
# i problemi di mount in Docker Desktop macOS
COPY locale1/mosquitto.conf /mosquitto/config/mosquitto-locale1.conf
COPY locale1/acl.conf /mosquitto/config/acl-locale1.conf
COPY locale2/mosquitto.conf /mosquitto/config/mosquitto-locale2.conf
COPY locale2/acl.conf /mosquitto/config/acl-locale2.conf

# Copia lo script di entrypoint custom
COPY entrypoint.sh /mosquitto/config/entrypoint.sh

# Assicura i permessi corretti come root, poi l'entrypoint
# ufficiale o il nostro script gestiranno l'avvio come mosquitto
USER root
RUN chmod +x /mosquitto/config/entrypoint.sh
RUN mkdir -p /mosquitto/data && chown mosquitto:mosquitto /mosquitto/data

USER mosquitto
ENTRYPOINT ["/bin/sh", "/mosquitto/config/entrypoint.sh"]
