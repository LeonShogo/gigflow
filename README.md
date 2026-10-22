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

## HTTPS-Testdeployment auf Render

Der Render-Blueprint baut Frontend und Backend in einen gemeinsamen Docker-Container. Render stellt eine HTTPS-URL und eine PostgreSQL-Datenbank bereit; dadurch bleiben alle Frontend-Aufrufe unter `/api` auf derselben Domain.

1. Den aktuellen Stand zu GitHub pushen.
2. Im [Render Dashboard](https://dashboard.render.com/blueprints) **New Blueprint Instance** auswählen.
3. Das Repository `LeonShogo/gigflow` verbinden und den Blueprint aus `render.yaml` anwenden.
4. Nach dem erfolgreichen Deployment die von Render angezeigte `https://...onrender.com`-URL öffnen.

Demo-Logins:

- Organizer: `organizer@gigflow.local` / `organizer123`
- Musiker: `musiker@gigflow.local` / `musiker1234`

Auf Android kann die App anschließend in Chrome über **App installieren**, auf iOS in Safari über **Teilen > Zum Home-Bildschirm** installiert werden.

Das kostenlose Testdeployment verwendet ein flüchtiges Container-Dateisystem. Hochgeladene PDFs und MP3s können deshalb bei einem Neustart oder Redeployment verloren gehen; die PostgreSQL-Daten liegen separat in Render Postgres.

## API-Überblick

| Pfad | Beschreibung |
|------|-------------|
| `/api/auth` | Registrierung, Login, Profil (`/me`) |
| `/api/bands` | Bands verwalten |
| `/api/memberships` | Band-Mitgliedschaften |
| `/api/events` | Konzerte & Proben, Teilnahmen, Panel-Layout |
| `/api/musicians` | Musiker:innen-Profile |
| `/api/setlists`, `/api/pieces` & `/api/piece-sheets` | Setlisten, Stücke, mehrere Noten-Stimmen pro Stück |
| `/api/equipment` & `/api/equipment-requirements` | Equipment-Katalog & Eventspezifische Anforderungen |
| `/api/schedule-items` | Zeitplan / Ablauf eines Events |

## Lizenz

Keine Lizenz angegeben.
