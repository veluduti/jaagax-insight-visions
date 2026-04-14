

## Plan: Fix Builder Profile Creation

### Problem
1. **RLS blocks insert**: The `builder_profiles` table requires `auth.uid() = user_id` for inserts, but when no user is logged in, `user_id` is `null` and `auth.uid()` is also `null` — Postgres evaluates `null = null` as `false`, blocking the insert.
2. **Classification logic is wrong**: Currently uses price/amenities/videos to classify. User wants it based on `number_of_projects`: 100+ = luxury, 50+ = standard, 0+ = budget.

### Changes

**1. Database Migration — Add public insert policy**
- Add a new RLS policy: `Anyone can create builder profiles` for INSERT on `public` role with `true` as the check expression (allowing form submissions without login).
- This keeps existing authenticated policies intact.

**2. Fix `classifyBuilder` in `AddBuilderProfileForm.tsx`**
- Change classification logic:
  ```
  100+ projects → luxury
  50+ projects → standard
  0+ projects → budget
  ```
- Update the function signature to accept `numberOfProjects` instead of price/amenities/videos.
- Update all call sites (line 215 and line 306).

**3. Add error logging**
- Log the actual Supabase error in the catch block so future issues are visible in console.

**4. Test the full flow**
- Navigate to `/add-builder-profile`, fill required fields, submit, and verify profile is created and visible.

