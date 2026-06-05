# Remove "₹ / unit" From Area & Pricing Edit Block

## Scope
The review/edit panel in `src/pages/SellProperty.tsx` currently shows three inputs in the **Area & Pricing** section: Area, ₹/unit (price_per_unit), Unit. The user wants only **Area + Unit**. The total price already flows in from the AI conversation via `editForm.total_price`, so the per-unit field is redundant.

## Database
No DB migration needed. The `properties` table has only `price` and `area_sqft` — there is no `price_per_unit` or `area_unit` column. `price_per_unit` lives only in the in-memory conversation state. Removing it from the UI does not change the schema.

## Frontend changes (`src/pages/SellProperty.tsx`)

1. **Edit form UI (lines ~4365–4407)** — remove the middle `<div>` containing the `₹ / unit` Input. Change the grid from `grid-cols-3` to `grid-cols-2` so Area + Unit fill the row. Update the visibility guard from `(areaN > 0 || ppuN > 0 || totalPrice > 0)` to `(areaN > 0 || totalPrice > 0)`.

2. **Review screen total computation (lines ~3655–3660)** — drop the `area × ppu` path. Use:
   ```ts
   const totalPrice = Number(editForm.total_price) || Number(editForm.monthly_rent) || 0;
   ```
   Remove the now-unused `ppuN` local.

3. **Submit handler (lines ~2884–2887, 2955–2958)** — stop deriving `price` from `area × ppu`. Compute:
   ```ts
   const totalPrice =
     parseFloat(String(editForm.total_price || state.total_price || "").replace(/[^\d.]/g, "")) ||
     parseFloat(String(editForm.monthly_rent || "").replace(/[^\d.]/g, "")) ||
     null;
   ```
   and use `price: totalPrice`. Keep the `area_unit → area_sqft` conversion (it still drives `area_sqft`).

4. **Leave intact**: AI conversation collection of `price_per_unit` (it's still useful upstream as one input the AI uses to derive `total_price`), the `PRICE_FIELDS` list, and the canonical state mapping. Only the manual edit UI and submit calculation stop relying on it.

## Submit error verification
After the change, confirm a publish flow end-to-end:
- AI captures `total_price` (or computes it from area × price_per_unit during conversation).
- Edit panel shows Area + Unit only; user can adjust without breaking total.
- `price` saved to `properties.price` is `total_price` (non-null when the AI captured pricing).
- If `total_price` is missing, current required-field guard already blocks submit; surface a clear toast ("Enter total property price") via the existing `ruleError` path — no new validation needed since `total_price` is already required in the field config.

## Acceptance
- Edit panel Area & Pricing row contains only Area input + Unit select.
- `Total: ₹…` line continues to render from `editForm.total_price`.
- Publish succeeds without runtime/DB errors for both sale and rent flows.
- No references to `editForm.price_per_unit` remain in the edit UI or submit math (the field can still exist in conversational state without affecting persistence).
