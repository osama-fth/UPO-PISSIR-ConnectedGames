# ============================================================
# Dockerfile — partita-service
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

COPY --from=builder /build/target/partita-service-1.0.0.jar app.jar

EXPOSE 8082

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8082/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
