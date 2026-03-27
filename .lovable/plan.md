

# Fix Plan: Logo, Rendering, Views & Building Information

## Issues Identified

1. **Logo Name**: Currently shows "JaagaX" — user wants "JAAGA X" (with space)
2. **Sneak Peek → Property Detail**: Clicking a Sneak Peek card opens the preview modal correctly, but the "Explore All New Arrivals" button navigates to `/search?verified=false` which may show "not found" for unverified properties. The user wants verified property detail pages to open in a **new browser tab** so users don't lose their place.
3. **Building Information is hardcoded**: All values (15 floors, 120 parking, 85,500 sqft, 3 elevators, 2 retail centres) are static — they should come from the `properties` table.
4. **Rendering issues**: The site has visual polish issues to address.

---

## 1. Logo Name → "JAAGA X"

Update in 3 places:
- **`src/components/Navigation.tsx`** line 87: `JaagaX` → `JAAGA X`
- **`src/components/Footer.tsx`** line 14: `JaagaX` → `JAAGA X`
- **`index.html`** title and meta tags: Update brand name

---

## 2. Property Detail opens in new tab

- **`src/components/home/SneakPeekListings.tsx`**: For verified properties in the listing, clicking a card should call `window.open(/property/${id}, '_blank')` instead of inline navigation. Unverified properties continue to open the SneakPeek preview modal.
- **`src/components/home/SneakPeekPreviewModal.tsx`**: Add a "View Full Listing" button that opens `/property/${id}` in a new tab (only if the property is verified).
- **Search results & other property cards**: Any property card click that navigates to `/property/:id` should use `target="_blank"` or `window.open` so the user doesn't lose context.

---

## 3. Dynamic Building Information

**Database migration**: Add building-related columns to `properties` table:
```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_parking integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_area_sqft numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS elevators integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS retail_centres integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_name text;
```

**Update seed data**: Set building info for existing test properties.

**Update `BuildingInformation.tsx`**: Accept full building data as props instead of hardcoded values. Show "Not available" or hide fields when data is missing. The component interface becomes:
```typescript
interface BuildingInformationProps {
  buildingName: string;
  totalFloors: number | null;
  totalParking: number | null;
  buildingArea: number | null;
  elevators: number | null;
  retailCentres: number | null;
  verified: boolean;
}
```

**Update `PropertyDetail.tsx`**: Pass the new building fields from the fetched property data to `BuildingInformation`.

---

## 4. Rendering Polish

- Ensure the SneakPeek modal dialog renders cleanly without layout shift
- Fix any z-index or overflow issues on the homepage sections
- Verify the "Property Not Found" page only shows for truly missing properties, not for unverified ones that exist in the DB

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/Navigation.tsx` | Logo text → "JAAGA X" |
| `src/components/Footer.tsx` | Logo text → "JAAGA X" |
| `index.html` | Title/meta brand name |
| `src/components/property/BuildingInformation.tsx` | Dynamic props instead of hardcoded |
| `src/pages/PropertyDetail.tsx` | Pass building data, map new columns |
| `src/components/home/SneakPeekListings.tsx` | Verified cards open in new tab |
| `src/components/home/SneakPeekPreviewModal.tsx` | Add "View Full Listing" new-tab button |
| Migration SQL | Add building columns to properties |

