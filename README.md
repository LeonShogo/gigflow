# GigFlow

Band-Management-App für Livemusiker:innen – Konzerte, Proben, Setlisten, Equipment und Zeitplan an einem Ort.

## Tech Stack

| Layer | Technologie |
|-------|------------|
| Backend | Java 21, Spring Boot 4.1.1, Spring Security (JWT), Spring Data JPA, PostgreSQL |
| Frontend | Angular 21, TypeScript 5.9, SCSS, Vitest |
| Build | Maven (Backend), npm (Frontend) |

## Voraussetzungen

- Java 21
- Node.js ≥ 20 + npm
- PostgreSQL (Standard-Port 5432, Datenbank `gigflow`)

## Setup

### 1. Datenbank anlegen

```sql
CREATE DATABASE gigflow;
```

### 2. Backend starten

```bash
cd backend
./mvnw spring-boot:run
```

Die Anwendung läuft unter `http://localhost:8080`. Hibernate erstellt Tabellen automatisch (`ddl-auto=update`).

### 3. Frontend starten

```bash
cd frontend
npm install
npm start
```

Der Dev-Server läuft unter `http://localhost:4200`. API-Aufrufe werden via Proxy (`proxy.conf.json`) auf `localhost:8080` weitergeleitet.

### Demo-Daten

Beim ersten Start werden automatisch Demo-Bands, Musiker:innen und Events per `DataInitializer` angelegt.

## API-Überblick

| Pfad | Beschreibung |
|------|-------------|
| `/api/auth` | Registrierung, Login, Profil (`/me`) |
| `/api/bands` | Bands verwalten |
| `/api/memberships` | Band-Mitgliedschaften |
| `/api/events` | Konzerte & Proben, Teilnahmen, Panel-Layout |
| `/api/musicians` | Musiker:innen-Profile |
| `/api/setlists` & `/api/pieces` | Setlisten, Stücke, Noten-PDFs |
| `/api/equipment` & `/api/equipment-requirements` | Equipment-Katalog & Eventspezifische Anforderungen |
| `/api/schedule-items` | Zeitplan / Ablauf eines Events |

## Lizenz

Keine Lizenz angegeben.
