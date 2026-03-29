## Backend container for Render (Docker plan)
## Build and run Spring Boot app from this backend/ folder.

FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY . .

# Ensure wrapper script is runnable in Linux container
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw

RUN ./mvnw -q -DskipTests clean package

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 5001

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
