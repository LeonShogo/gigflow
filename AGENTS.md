# GigFlow – Development Guidelines

## Project Structure

```
gigflow/
├── backend/       # Spring Boot REST API (Java 21)
├── frontend/      # Angular 21 SPA
└── docs/          # Documentation
```

## Backend (Spring Boot 4.1.1 / Java 21)

### Package Layout

All source code lives under `de.gigflow.backend`. Each domain feature gets its own sub-package:

```
de.gigflow.backend
├── {domain}/          # One package per feature (band, musician, event, …)
│   ├── Entity.java        # JPA entity (@Entity, @Table)
│   ├── Repository.java    # Spring Data JPA repository
│   ├── Service.java       # Business logic
│   ├── Controller.java    # REST controller (@RestController)
│   ├── Request.java       # Inbound DTO
│   ├── Response.java      # Outbound DTO
│   └── ExceptionHandler.java  # Optional @RestControllerAdvice
├── user/             # Auth, JWT, security (special rules)
├── DataInitializer.java   # Demo data seeder
└── SchemaInitializer.java # DDL migration helper
```

### Conventions

- **Entities**: Use traditional getters/setters (no Lombok). Always annotate `@Table(name = "...")` explicitly. Use `GenerationType.IDENTITY` for PKs.
- **DTOs**: Separate Request/Response DTOs per entity. Never expose entities directly in controller return types.
- **Controllers**: Constructor injection (no `@Autowired`). Return `ResponseEntity` for status code control. Use `@Valid` on `@RequestBody`.
- **Services**: Pure business logic, no HTTP concerns. Throw `IllegalArgumentException` for not-found cases (caught by controllers).
- **Validation**: Use Jakarta Bean Validation annotations (`@NotBlank`, `@NotNull`, etc.) on Request DTOs.
- **Error messages**: Write in German to match the UI.

### Security Model

- JWT-based, stateless sessions (7-day expiry, HMAC-SHA)
- **Public**: `/api/auth/**`, OPTIONS
- **Authenticated musician**: `POST /api/events/*/join`, `PUT/DELETE /api/event-participations/*` (own only)
- **Organizer role**: All other POST/PUT/DELETE
- **Any authenticated user**: All GET/read operations

### Testing

- Use `@SpringBootTest` with `@AutoConfigureMockMvc` for controller tests
- Use Mockito for service-level unit tests
- Test file location: `src/test/java/de/gigflow/backend/` mirroring main package structure

## Frontend (Angular 21 / TypeScript 5.9)

See `frontend/AGENTS.md` for Angular-specific rules.

Key points:
- Standalone components, signals for state, OnPush everywhere
- All routes lazy-loaded via `loadComponent()`
- German locale for all user-facing text
- Proxy: `/api` → `http://localhost:8080` (see `proxy.conf.json`)
