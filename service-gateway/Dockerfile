# Dockerfile multi-stage per service-gateway (Spring Cloud Gateway WebFlux).

FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/service-gateway-1.0.0.jar app.jar
EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
