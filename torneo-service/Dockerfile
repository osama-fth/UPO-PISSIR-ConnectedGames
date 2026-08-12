# Dockerfile multi-stage per torneo-service (Spring Boot).

FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/torneo-service-1.0.0.jar app.jar
EXPOSE 8083

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8083/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
