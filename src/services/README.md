# Services Layer

Architecture: **UI → React Query hook (`src/hooks/queries/*`) → Service (`src/services/*`) → Supabase / Edge Functions**

## Rules

1. **Components**: render UI + minimal local UI state. They MUST NOT call `supabase.from(...)` directly.
2. **Hooks** (`src/hooks/queries/*`): wrap services with `useQuery` / `useMutation`. They handle caching, invalidation, loading states.
3. **Services** (`src/services/*`): pure async functions. They own all Supabase access and business logic. They throw on error and return typed data. They contain no React.

## Adding a new domain

1. Create `src/services/<domain>Service.ts` exporting plain async functions.
2. Create `src/hooks/queries/use<Domain>.ts` exporting React Query hooks.
3. Components import only the hook (or, rarely, the service for one-off mutations).

## Existing services

- `authService` — sign in/up, OTP, sign out, role resolution
- `propertyService` — list/search/detail, favorites, normalization
- `bookingService` — visit + hotel bookings
- `dashboardService` — role-specific aggregations
- `searchService` — text/filter search, autocomplete
- `aiService` — edge-function wrappers
- `notificationService` — list, mark read, realtime subscribe
