# Modular Page Pattern (Phase 3)

Large pages must be split into:

```
src/pages/<page>/
├── index.tsx          ← thin route component (≤150 LOC). Composes sections.
├── hooks/
│   └── use<Page>State.ts   ← all useState / useReducer / derived memos
├── sections/
│   ├── <Page>Hero.tsx
│   ├── <Page>Filters.tsx
│   └── <Page>Results.tsx
└── widgets/           ← page-specific small components
    └── <Widget>.tsx
```

## Migration order (one page per turn)

1. `Search` (993 LOC) — split into `SearchHero`, `SearchTabs`, `SearchFilters`, `SearchResults`, `useSearchState`
2. `SellProperty` (1822 LOC) — split per wizard step
3. `AgentDashboard` (1157 LOC) — split per tab
4. `BuilderDashboard` (782 LOC)
5. `HotelManagerDashboard` (778 LOC)

## Render-perf rules

- Wrap list-item components in `React.memo`. See `src/components/shared/PropertyGridCard.tsx`.
- Stable callbacks via `useCallback` so memoized children don't re-render.
- Heavy derived data via `useMemo` — never compute filters/sorts inline in JSX.
- Debounce free-text inputs with `useDebouncedValue` before pushing into query keys.

## Shared building blocks

- `@/components/shared/PropertyGridCard` — memoized card for any property grid
- `@/components/shared/SectionHeader` — animated section header
- `@/hooks/useDebouncedValue` — input debouncer
