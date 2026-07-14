connected-games-platform/
├── README.md                          # setup, flusso avvio, scenario demo, link a LIMITATIONS.md
├── LIMITATIONS.md                     # ← spostato qui, root, visibilità immediata
├── docker-compose.yml
├── .env.example
├── .gitignore
├── check-env.sh
│
├── docs/
│   └── ... (invariato)
│
├── service-gateway/
├── service-core/
├── edge/
├── simulators/
│
├── mosquitto/
│   ├── entrypoint.sh                  # ← unico, condiviso tra locale1 e locale2
│   ├── locale1/
│   │   ├── mosquitto.conf
│   │   └── acl.conf                   # versionato, nessun segreto
│   └── locale2/
│       ├── mosquitto.conf
│       └── acl.conf
│
├── keycloak/
│   └── realm-export.json              # montato in /opt/keycloak/data/import/, importato con --import-realm
│
└── tests/
    ├── unit/
    │   ├── sync-idempotenza.test.js
    │   └── semaforo-race-condition.test.js
    └── integration/
        ├── guest-mode.test.js
        └── acl-mosquitto.test.js
