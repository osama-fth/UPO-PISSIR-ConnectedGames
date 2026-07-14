# ============================================================
# Dockerfile — service-gateway
# Connected Games Platform (PISSIR A.A. 2025/2026)
# ============================================================
# Build stage: compila l'applicazione con Maven
# ============================================================
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

# ============================================================
# Runtime stage: JRE minimale per eseguire il fat-jar
# ============================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copia il jar prodotto dalla build
COPY --from=builder /build/target/service-gateway-1.0.0.jar app.jar

# Porta esposta per il gateway
EXPOSE 8081

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
