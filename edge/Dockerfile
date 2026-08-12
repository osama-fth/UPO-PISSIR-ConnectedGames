# Dockerfile multi-stage per Edge Node (Node.js/Express) con dipendenze native per SQLite.

FROM node:20-alpine AS builder
WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm install --production

FROM node:20-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package.json ./
COPY . .
RUN mkdir -p /usr/src/app/data

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]
