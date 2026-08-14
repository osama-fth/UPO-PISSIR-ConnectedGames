# Dockerfile multi-stage per service-gateway

# Stage 1: Build & Test
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn test -Dtest="!*IntegrationTest" -B
RUN mvn package -DskipTests -B

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=builder /app/target/service-gateway-1.0.0.jar app.jar

EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8081/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
