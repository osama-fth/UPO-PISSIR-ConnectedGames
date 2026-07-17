# ============================================================
# Dockerfile — Edge Gateway (Node.js) - Multi-Stage
# Connected Games Platform (PISSIR A.A. 2025/2026)
# ============================================================

# STAGE 1: Builder
# Include i tool C++ necessari per compilare le dipendenze native (es. better-sqlite3)
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm install --production

# STAGE 2: Runtime
# Immagine Alpine pulita, senza toolchain di compilazione, super leggera e sicura.
FROM node:20-alpine

WORKDIR /usr/src/app

# Copiamo le dipendenze compilate dal builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package.json ./

# Copia il codice sorgente
COPY . .

# Crea la directory per il database SQLite
RUN mkdir -p /usr/src/app/data


HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]
