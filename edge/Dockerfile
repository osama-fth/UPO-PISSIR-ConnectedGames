# ============================================================
# Dockerfile — Edge Gateway (Node.js)
# Connected Games Platform (PISSIR A.A. 2025/2026)
# ============================================================
FROM node:20-alpine

WORKDIR /usr/src/app

# Installa dipendenze native per better-sqlite3
RUN apk add --no-cache python3 make g++

# Copia package files e installa dipendenze
COPY package.json package-lock.json* ./
RUN npm install --production

# Copia il codice sorgente
COPY . .

# Crea la directory per il database SQLite
RUN mkdir -p /usr/src/app/data

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health || exit 1

CMD ["node", "server.js"]
