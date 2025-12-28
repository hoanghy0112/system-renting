---
trigger: model_decision
description: When working with backend
---

# NestJS Monorepo Code Style Guide

## 1. Project Structure

### Monorepo & Backend Layout

```text
/
├── apps/
│   ├── backend/             # NestJS App
│   │   └── src/modules/<name>/
│   │       ├── <name>.module.ts
│   │       ├── <name>.controller.ts
│   │       ├── <name>.service.ts
│   │       ├── dto/         # Class-based DTOs (Validation)
│   │       ├── entities/    # Prisma/TypeORM Entities
│   │       └── __tests__/
│   ├── frontend/            # Next.js/React
│   └── agent/               # Host Agent
├── packages/
│   ├── shared-types/        # Interfaces (Pure Data)
│   └── shared-utils/

```

---

## 2. Data Transfer Objects (DTOs) & Types

### Shared Types (`packages/shared-types`)

* **Format:** Pure TypeScript **Interfaces** (No classes).
* **Entities:** `PascalCase` interfaces, `SCREAMING_SNAKE` enum values.
* **Events:** Discriminated unions. Group by direction (e.g., `AgentToBackend`).

### Backend DTOs (`apps/backend`)

* **Format:** **Classes** implementing shared interfaces.
* **Validation:** Use `class-validator` (`@IsString()`, `@Min()`, `@IsOptional()`).
* **Transformation:** Use `class-transformer` (`@Type()`) for nested objects.
* **Config:** Global ValidationPipe must have `whitelist: true`, `transform: true`.

**Naming Convention:**

* Request: `Create<Entity>Dto`, `Update<Entity>Dto`
* Response: `<Entity>Response` (Always wrap in `ApiResponse<T>`)
* Dates: Use `string` (ISO format) in responses, not `Date` objects.

---

## 3. Architecture Patterns

### Controllers

* **Decorators:** Use `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`.
* **Returns:** Always return wrapped `ApiResponse<T>`.
* **Status Codes:** Precise usage (201 Created, 400 Bad Request, 403 Forbidden).

### Services

* **Logic:** All business logic lives here, never in controllers.
* **Mapping:** Implement private `to<Entity>Response()` methods for entity-to-DTO conversion.
* **Logging:** Use NestJS `Logger` (never `console.log`).

### Configuration

* Use `@nestjs/config`.
* Validate environment variables on startup (using `joi` or `class-validator`).

---

## 4. Naming Conventions

| Type | Pattern | Example |
| --- | --- | --- |
| **Files** | `kebab-case` | `user-profile.controller.ts` |
| **Classes** | `PascalCase` | `UserProfileController` |
| **Variables/Methods** | `camelCase` | `getUserById` |
| **Constants/Enums** | `SCREAMING_SNAKE` | `MAX_RETRY_COUNT` |
| **Booleans** | `is/has/can` prefix | `isActive`, `hasPermission` |
| **Interfaces** | `PascalCase` | `UserPayload` |

---

## 5. Import Order

1. **Node Built-in** (`crypto`, `fs`)
2. **External (NPM)** (`@nestjs/common`, `@prisma/client`)
3. **Monorepo Packages** (`@distributed-compute/shared-types`)
4. **Internal Absolute** (`../../prisma/prisma.service`)
5. **Relative** (`./user.service`)

---

## 6. Best Practices

### Security

* **Sanitization:** Validate all inputs via DTOs; never trust user input.
* **Auth:** Validate JWT on protected routes; check resource ownership before updates.
* **Secrets:** Never expose internal IDs in errors; use Envs for secrets.

### Performance

* **Database:** Use pagination, indexes, and connection pooling. Avoid N+1 queries.
* **Caching:** Implement Redis for frequently accessed data/sessions.
* **General:** Use compression and request timeouts.