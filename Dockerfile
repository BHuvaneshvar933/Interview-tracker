## Backend container for Render (no Java runtime needed on plan)
## Builds Spring Boot app from ./backend and runs it.

FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy only backend sources
COPY backend/.mvn/ backend/.mvn/
COPY backend/mvnw backend/pom.xml backend/

# Ensure wrapper script is runnable in Linux container
RUN sed -i 's/\r$//' backend/mvnw && chmod +x backend/mvnw

# Pre-fetch dependencies (better layer caching)
RUN backend/mvnw -q -f backend/pom.xml -DskipTests dependency:go-offline

# Copy application sources and build
COPY backend/src/ backend/src/
RUN backend/mvnw -q -f backend/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/backend/target/*.jar /app/app.jar

# Render sets PORT; app uses server.port=${PORT:5001}
EXPOSE 5001

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
