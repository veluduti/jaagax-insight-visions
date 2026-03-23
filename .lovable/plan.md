

# Implementation Plan

## Summary
Four features requested: (1) Social media video reels for property listings, (2) "Partner with Us" button on Hotels page, (3) Mobile-optimized view with essential buttons only, (4) Partial property details for non-authenticated users.

---

## 1. Property Video Reels from YouTube Shorts / Instagram Reels

**What**: Add a `video_urls` column to the `properties` table to store YouTube Shorts and Instagram Reel links. Display these as embedded video content on property detail pages and in the Promotions reels feed.

**Database Migration**:
- Add `video_urls text[] DEFAULT '{}'` column to `properties` table

**Code Changes**:
- **`src/components/property/MediaHub.tsx`**: Update to accept and render video URLs. Detect YouTube/Instagram URLs and render appropriate embed iframes (YouTube `youtube.com/embed/SHORT_ID`, Instagram embed via `instagram.com/p/ID/embed`).
- **`src/components/property/PropertyVideoReels.tsx`** (new): A dedicated vertical-scroll reels component that fetches properties with `video_urls` and displays them in a TikTok-style feed with property info overlays. Reuse the existing `ReelCard` animation patterns from the promotions feed.
- **`src/pages/PropertyDetail.tsx`**: Pass `property.video_urls` to `MediaHub` component's `videos` prop (currently hardcoded as `[]`).
- **`src/pages/Promotions.tsx`**: Add a "Property Reels" tab/section that queries properties with non-empty `video_urls` and displays them alongside advertisement reels.
- **Admin/Builder**: Add video URL input fields in property upload forms so builders can paste YouTube Shorts / Instagram Reel links.

---

## 2. "Partner with Us" Button on Hotels Page

**What**: Add a prominent CTA button in the Hotels page hero section that navigates to `/dashboard/hotel-manager`.

**Code Change**:
- **`src/pages/Hotels.tsx`** (~line 152): Add a "Partner with Us" button below the search bar that calls `navigate("/dashboard/hotel-manager")`. Style with `variant="premium"` for visual prominence.

---

## 3. Mobile View - Essential Buttons Only

**What**: Simplify the mobile UI across key pages to show only the most important action buttons, hiding secondary actions behind a "More" menu or removing them entirely on small screens.

**Code Changes**:
- **`src/pages/PropertyDetail.tsx`**: The mobile sticky CTA (lines 471-486) already shows only "Book" and "AI Expert" -- keep this. Hide the desktop action bar's secondary buttons (Share, Save) on mobile using `hidden md:flex`.
- **`src/pages/Hotels.tsx`**: On mobile, collapse filter controls behind the existing filter toggle. Show only search + primary hotel cards.
- **`src/components/Navigation.tsx`**: Audit mobile nav to ensure only critical navigation items show (Home, Search, Hotels, Profile).

---

## 4. Partial Property Details for Non-Authenticated Users

**What**: Non-logged-in users can see basic property info (title, locality, images, BHK, type) but detailed sections (price, agent contact, AI advisor, EMI calculator, booking) are blurred/gated with a "Sign in to view full details" prompt.

**Code Changes**:
- **`src/pages/PropertyDetail.tsx`**: 
  - Import `useAuth` hook to check authentication state.
  - Wrap price display, agent card, EMI calculator, payment plans, booking modal trigger, AI advisor, and nearby agents sections in an auth gate component.
- **`src/components/property/AuthGate.tsx`** (new): A wrapper component that blurs its children and overlays a "Sign in to unlock" CTA with a button linking to `/auth`. Accepts `user` prop to decide visibility.
- Sections visible without auth: images, title, locality, BHK/type, map, amenities, building info.
- Sections gated: exact price (show range like "₹XX L - ₹XX L"), agent details, EMI calculator, payment plans, AI advisor, booking, micro-comparables.

---

## 5. Database Note

The project already uses Lovable Cloud (Supabase) as the primary database. No change needed -- all data operations already go through Supabase client. The `fromTable` helper in `src/lib/supabaseHelper.ts` is just a type-bypass utility, not a separate DB.

---

## Technical Details

| Change | Files | Migration |
|--------|-------|-----------|
| Video URLs column | `properties` table | `ALTER TABLE properties ADD COLUMN video_urls text[] DEFAULT '{}'` |
| Video embeds | `MediaHub.tsx`, new `PropertyVideoReels.tsx` | -- |
| Partner button | `Hotels.tsx` | -- |
| Mobile cleanup | `PropertyDetail.tsx`, `Hotels.tsx` | -- |
| Auth gate | New `AuthGate.tsx`, `PropertyDetail.tsx` | -- |

