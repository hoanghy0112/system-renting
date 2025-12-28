---
trigger: model_decision
description: When working with frontend
---

# Frontend Style Guide

## 1. The Golden Rule: Shared Types

**MANDATORY:** Always import entities, DTOs, and Enums from `@distributed-compute/shared-types`.

* **Do:** `import { HostNode, CreateRentalDto } from '@distributed-compute/shared-types';`
* **Don't:** Redefine interfaces locally.
* **Usage:** Apply shared types to all API requests, responses, and Zod schemas.

---

## 2. Tech Stack & Structure

* **Framework:** Next.js 14+ (App Router), TypeScript 5+
* **UI:** Tailwind CSS, Shadcn/UI, Lucide Icons
* **State/Data:** TanStack Query, React Hook Form + Zod
* **Auth:** Clerk

**Directory Structure:**

* `app/`: Pages grouped by domain (e.g., `dashboard/host/`).
* `components/`: Feature components in domain folders; primitives in `ui/`.
* `lib/api/`: One API file per domain (e.g., `nodes.ts`).
* `hooks/`: Custom hooks (e.g., `use-nodes.ts`).

---

## 3. Component Patterns

* **Server Components:** Default. Use for fetching initial data.
* **Client Components:** Use `'use client'` only for event listeners, hooks (`useState`), or browser APIs.
* **File:** One component per file, `PascalCase`, named export.
* **Performance:** Use `next/image`, `next/dynamic` for heavy modules, and `useMemo`/`useCallback` appropriately.

---

## 4. Data Fetching (TanStack Query)

Encapsulate all fetching logic in custom hooks located in `hooks/`.

* **Keys:** Use hierarchical arrays: `['domain', 'scope', id]` (e.g., `['nodes', 'list']`).
* **Polling:** Use `refetchInterval` for real-time data.
* **Mutations:** Invalidate queries on success.

```typescript
// hooks/use-nodes.ts
export function useNodes() {
  return useQuery({ queryKey: ['nodes', 'list'], queryFn: fetchHostNodes });
}

```

---

## 5. Forms & Validation

Use **React Hook Form** with **Zod**.

* **Schema:** Define Zod schemas that satisfy shared DTOs.

```typescript
const schema = z.object({ ... }) satisfies z.ZodType<CreateRentalDto>;

```

---

## 6. API & Auth

* **Client:** Use the centralized axios instance in `lib/api/client.ts` (Auto-injects Clerk token).
* **Definition:** 1 file per domain. Type strictly using `shared-types`.

```typescript
// lib/api/nodes.ts
export async function getNodes(): Promise<ApiResponse<Node[]>> { ... }

```

---

## 7. Conventions

* **Naming:**
* Files: `kebab-case.tsx`
* Components: `PascalCase`
* Hooks/Functions: `camelCase`


* **Import Order:**
1. React / Next.js
2. External Libs (`@tanstack/...`)
3. **Shared Types** (`@distributed-compute/shared-types`)
4. Internal Absolute (`@/components/...`)
5. Relative (`./...`)


* **Git:** Conventional Commits (`feat(rent): add filter`).

---

## 8. UX Requirements

* **Loading:** Use Skeleton loaders.
* **Errors:** Handle error states gracefully.
* **Empty:** Show empty states when list data is missing.