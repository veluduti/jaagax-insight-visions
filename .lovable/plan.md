## Goal

Make the conversational runtime read **exclusively** from `residential.ts` (and sibling flow configs). No hardcoded questions, prompts, suggestion lists, or visibility rules in the page or engines.

## Current state (audited)

- `residential.ts` (890 lines) now uses extended fields: `type`, `question`, `placeholder`, `smartSuggestions.{realtime,searchable,chips,examples,units,durations,behavior,...}`, `visibleIf`, `hierarchy`, `extraction.continueFromExtractedState`, `allowSkip`, plus AI flags like `persistSkippedFields`.
- `engines/types.ts` now permits these via index signatures (just to silence TS) — but the engines don't actually consume the new metadata.
- `engines/nextQuestionResolver.ts` resolves order but likely ignores `visibleIf` semantics from the new shape, and never returns `smartSuggestions`/`hierarchy` to the UI.
- `engines/ruleEngine.ts` handles dependency resets but not the new `visibleIf` block format consistently.
- `pages/SellProperty.tsx` (2033 lines) holds significant hardcoded logic: chip lists, suggestion calls, formatting, skip behavior, and question prompts that should now come from the schema.
- `utils/suggestionEngine.ts` exists but isn't wired to `smartSuggestions.{type, units, durations, examples, realtime}`.

## Changes

### 1. `src/engines/types.ts` — make new fields first-class

Replace the loose `[key: string]: unknown` index signatures with explicit typed properties so the engine can use them safely:

- `FieldDefinition`: add `type?` (semantic kind: `price`, `area`, `location`, `select`, `multi-select`, `text`, `date`, `media`, …), `placeholder?`, `allowSkip?`, `aiSuggestionHint?`.
- `SmartSuggestionsConfig`: add `realtime?`, `searchable?`, `chips?`, `typoFriendly?`, `gpsSupport?`, `mapSelection?`, `pincodeAutoFill?`, `dependentHierarchy?`, `currentLocation?`, `behavior?: Record<string, unknown>`.
- `ExtractionConfig`: add `continueFromExtractedState?`.
- `AIFlowConfig`: add `persistSkippedFields?`, `preventDuplicateQuestions?`, `realtimeSuggestions?`, `pricingNormalization?`, `locationAutocomplete?`.

### 2. `src/engines/ruleEngine.ts` — schema-driven visibility

- Treat `field.visibleIf` as the single source of truth. A field is visible iff every key in `visibleIf` matches an answer in `state.answers` against the allowed value list (including `"*"` wildcard).
- `fieldsToResetOnChange`: when answer X changes, reset any field whose `visibleIf[X]` no longer satisfies — exactly what the new schema expects.

### 3. `src/engines/nextQuestionResolver.ts` — duplicate prevention + skip persistence

- Iterate `flow.order`, skipping fields where:
  - already answered, OR
  - in `state.skipped` AND `flow.ai?.persistSkippedFields !== false`, OR
  - `visibleIf` not satisfied.
- Return `{ field, question }` where `question` is synthesized from the field itself: `{ prompt: field.question ?? field.label, helper: field.placeholder, quickReplies: field.options, multiSelect: field.type === 'multi-select' || field.input === 'multi' }`.
- This eliminates the need for a separate `questions` map and removes any duplicate prompts.

### 4. `src/utils/suggestionEngine.ts` — realtime + searchable hookup

Single entry: `getSuggestions(field, partialInput, state)` that returns `{ chips: string[], searchable: boolean, realtime: boolean }`:

- Pulls `examples`, `units`, `durations` from `field.smartSuggestions`.
- For `type: 'price'` / `'rental_price'` / `'price_per_unit'`: format Indian (₹, lakh/cr) and produce contextual rounded chips around the typed value.
- For `type: 'location'` with `hierarchy`: defer to `locationSuggestionEngine` (city → locality → sublocality → pincode).
- For `searchable: true`: filter examples by partial input substring.
- Return `realtime: true` when `field.smartSuggestions.realtime` so UI debounces & re-queries on each keystroke.

### 5. `src/engines/locationSuggestionEngine.ts` — wire hierarchy

- Accept `hierarchy: string[]` and current `state.answers`, return next-level suggestions. GPS / pincode auto-fill toggles read from `smartSuggestions`.

### 6. `src/ai/promptBuilder.ts` & `responseFormatter.ts` — schema-only prompts

- Build the LLM prompt from `flow.fields[currentFieldId]` plus `state.answers`/`extracted`. Pass `aiSuggestionHint` if present. No hardcoded copy.
- Normalize prices (lakh/cr/k → number) before applying answers when `flow.ai?.pricingNormalization`.

### 7. `src/engines/conversationEngine.ts` — use new helpers

- `applyAnswer` runs pricing normalization (delegated) when the field type warrants it.
- `skipField` is the only path to mark skipped; resolver handles persistence based on `persistSkippedFields`.
- Extracted-resume: when `extraction.continueFromExtractedState` is true on the current field, applied extracted values are not re-asked.

### 8. `src/pages/SellProperty.tsx` — strip hardcoded logic

Make the page a pure renderer over `engine.next()` output:

- Remove any local arrays of chips, prompts, formatting helpers that duplicate schema content.
- For each AI message bubble, render chips from `question.quickReplies` and live suggestions from `getSuggestions(field, inputValue, state)` when `realtime`.
- Searchable chip rendering: dropdown with filter when `smartSuggestions.searchable`.
- Skip button visible only when `field.allowSkip` or `!field.required`.
- Location field uses hierarchy step state from engine, not local state.
- Keep existing UI shell (input dock, scroll behavior, voice, upload, AI title) untouched.

### 9. `src/store/conversationStore.ts`

- Persist `answers`, `skipped`, `extracted`, `currentFieldId` only. No question text. Hydrate engine on mount, then drive UI from `engine.next()`.

## Out of scope

- No DB schema changes.
- No new edge functions.
- No changes to commercial/plots/agriculture/coworking flows in this pass (they remain functional via the same engine; only residential is verified end-to-end).
- No UI redesign — preserve current ChatGPT-style layout.

## Verification

- TypeScript build is clean.
- Open SellProperty → residential, walk through: listing type → price (with realtime ₹ chips) → property type → BHK → area (with unit chips) → bathrooms → condition (conditional follow-ups appear) → furnishing (conditional `furnishing_details` appears) → location (city → locality hierarchy) → amenities (multi-select max) → media upload → review.
- Skip an optional field, refresh — field stays skipped (persistSkippedFields).
- Change `property_type`, dependent fields reset.
- No duplicate questions across the session.

## Risk

This refactor touches ~7 files and the 2033-line page. I will keep the page's existing UI/layout JSX intact and only swap data sources; engines change behavior but keep their public interfaces (`getState`, `applyAnswer`, `next`, …).

---

**Confirm to proceed**, or tell me which sections to scope down (e.g. "engine + suggestionEngine only, leave the page for a follow-up").