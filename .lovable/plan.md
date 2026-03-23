

# Property Reels → Booking Flow

## Summary
Create a new full-screen "Property Reels" experience — a TikTok-style vertical feed that fetches properties with `video_urls` from the database, plays the embedded video, and provides a swipe-up or tap action to reveal property details + booking flow in a bottom sheet / separate tab panel.

---

## 1. New Page: `/reels` — Property Reels Discovery

**New file: `src/pages/PropertyReels.tsx`**

A dedicated full-screen vertical-swipe reels page that:
- Fetches all properties from `properties` table where `video_urls` is not empty
- Renders each property as a full-screen reel card with the YouTube/Instagram embed playing
- Overlays property info (title, locality, price, BHK) at the bottom
- Side action bar: Like, Save, Share, "Book" button
- Swipe up/down or arrow keys to navigate between properties

**New file: `src/components/reels/PropertyReelCard.tsx`**

Each reel card shows:
- Full-screen video embed (YouTube/Instagram iframe)
- Property info overlay at bottom (title, price, locality, BHK, type)
- Verified badge if applicable
- "View Details" and "Book Visit" action buttons

---

## 2. Bottom Sheet: Property Details + Booking Tab Panel

**New file: `src/components/reels/ReelPropertyDrawer.tsx`**

When user taps "View Details" or swipes up on a reel:
- A bottom drawer (using existing `Drawer` component) slides up with two tabs:
  - **Details Tab**: Property images carousel, description, amenities, map location, similar properties link
  - **Book Tab**: Inline booking form — reuses the existing `BookingModal` flow (Quick Visit or Visit+Stay options), pre-filled with the property ID/title/city

This keeps the user in the reels experience without navigating away.

---

## 3. Route Registration

- Add `/reels` route in `App.tsx` pointing to `PropertyReels.tsx`
- Add a "Reels" entry point from the Promotions page (new tab alongside existing reels/grid toggle)
- Add a floating "Property Reels" button on the homepage or navigation

---

## 4. Navigation from Existing Components

- **`PropertyVideoReels.tsx`**: Add a "Watch All Reels" button that navigates to `/reels`
- **`Promotions.tsx`**: Add a third view mode tab "Properties" alongside existing "Reels" and "Grid" that shows the property reels feed

---

## Technical Details

| Component | File | Purpose |
|-----------|------|---------|
| PropertyReels page | `src/pages/PropertyReels.tsx` | Full-screen vertical feed |
| PropertyReelCard | `src/components/reels/PropertyReelCard.tsx` | Individual reel with video + overlay |
| ReelPropertyDrawer | `src/components/reels/ReelPropertyDrawer.tsx` | Bottom sheet with Details/Book tabs |
| App.tsx | Route `/reels` | Registration |
| Promotions.tsx | New "Properties" tab | Entry point |

**Database**: No schema changes needed — uses existing `properties` table with `video_urls` column.

**Booking flow**: Reuses existing `BookingModal` component (Quick Visit / Visit+Stay) — just passes `propertyId`, `propertyTitle`, `propertyCity`, `propertyLocality` from the current reel's property data.

