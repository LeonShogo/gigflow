FROM node:22-alpine AS frontend-build

WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21-alpine AS backend-build

WORKDIR /workspace/backend
COPY backend/pom.xml ./
RUN mvn --batch-mode dependency:go-offline
COPY backend/src ./src
COPY --from=frontend-build /workspace/frontend/dist/frontend/browser ./src/main/resources/static
RUN mvn --batch-mode package -DskipTests

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
RUN addgroup -S gigflow \
    && adduser -S gigflow -G gigflow \
    && mkdir -p /app/uploads/sheet-music \
    && chown -R gigflow:gigflow /app

COPY --from=backend-build --chown=gigflow:gigflow /workspace/backend/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar
COPY --chown=gigflow:gigflow deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER gigflow
EXPOSE 10000

ENTRYPOINT ["/app/entrypoint.sh"]
