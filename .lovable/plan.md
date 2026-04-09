

# Add Aurobindo Kohinoor Property with Real Data

## Summary
Insert the real "Aurobindo Kohinoor" property into the `properties` table with complete data scraped from aurorealty.com, including real gallery images, YouTube construction update videos, and the 360-degree virtual tour URL. The property will appear in Featured Properties for Hyderabad since it will be `verified: true` with a high trust score.

## Data Collected from aurorealty.com

- **Name**: Kohinoor by Auro Realty
- **Location**: HITEC City, Hyderabad
- **RERA**: P02400001822/2867/4730
- **Status**: Under Construction
- **Possession**: 28th Jan 2026
- **Configs**: 2, 3, 4 BHK & Duplex (1296–7619 sq ft)
- **Starting Price**: ₹2.70 Cr
- **Towers**: 7 (G+29 to G+42)
- **Land**: 12.3 acres, 80% open spaces
- **Clubhouse**: 50,000 sq ft with 50+ amenities
- **Builder**: Auro Realty (formerly Aurobindo Realty)
- **Gallery images**: 7 real images from aurorealty.com
- **Video**: YouTube construction update
- **360 Tour**: https://aurorealty.com/portfolio-kohinoor/virtual-tour/

## Implementation Steps

### Step 1: Insert property into `properties` table
Use the Supabase insert tool to add one row with all fields populated:

| Field | Value |
|-------|-------|
| title | Kohinoor by Auro Realty - Luxurious 2, 3, 4 BHK & Duplex Residences |
| city | Hyderabad |
| locality | HITEC City |
| address | HITEC City, Hyderabad, Telangana |
| price | 27000000 (₹2.70 Cr starting) |
| area_sqft | 1296 (minimum config) |
| type | Apartment |
| bhk | 3 |
| bedrooms | 3 |
| bathrooms | 3 |
| verified | true |
| trust_score | 95 |
| completion_stage | Under Construction |
| building_name | Kohinoor HITEC City |
| total_floors | 42 |
| elevators | 4 |
| latitude | 17.4435 |
| longitude | 78.3772 |
| images | Real gallery images from aurorealty.com (7 URLs) |
| video_urls | YouTube construction update + 360 tour URL |
| description | Full project overview from the website |

### Step 2: Add a "Virtual Tour" button to PropertyDetail page
- In `PropertyDetail.tsx`, detect if any `video_urls` entry contains "virtual-tour" or "360"
- Render a dedicated "360° Virtual Tour" button that opens the URL in a new tab
- Style with a distinct icon (e.g., `View` or `Globe` from lucide)

### Step 3: No schema changes needed
All required columns already exist in the `properties` table.

## Files Modified

| File | Change |
|------|--------|
| Database (insert) | New property row with real Kohinoor data |
| `src/pages/PropertyDetail.tsx` | Add 360° Virtual Tour button for properties with tour URLs |

## Technical Notes
- Images use direct URLs from `aurorealty.com/images/gallery/big/` — these are publicly accessible
- The property will appear in "Properties in Hyderabad" because `city = 'Hyderabad'` and `verified = true`
- The 360° tour link opens in a new browser tab via `window.open()`

