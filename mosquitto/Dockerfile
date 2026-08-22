# Broker MQTTS Mosquitto con TLS ed ACL per isolamento locali.

FROM eclipse-mosquitto:2.0

COPY locale1/mosquitto.conf /mosquitto/config/mosquitto-locale1.conf
COPY locale1/acl.conf /mosquitto/config/acl-locale1.conf
COPY locale2/mosquitto.conf /mosquitto/config/mosquitto-locale2.conf
COPY locale2/acl.conf /mosquitto/config/acl-locale2.conf
COPY entrypoint.sh /mosquitto/config/entrypoint.sh

USER root
RUN apk add --no-cache openssl
RUN chmod +x /mosquitto/config/entrypoint.sh
RUN chown -R mosquitto:mosquitto /mosquitto/config
RUN chmod 0700 /mosquitto/config/*.conf
RUN mkdir -p /mosquitto/data && chown -R mosquitto:mosquitto /mosquitto/data

USER mosquitto
ENTRYPOINT ["/bin/sh", "/mosquitto/config/entrypoint.sh"]
