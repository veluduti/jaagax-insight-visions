# Jaaga Hospitality: Business Categories, Guided Search and AI Search

## What you'll get

1. **Partner registration: pick several business types**
   - The single "Business type" dropdown becomes a grid of tappable cards with icons: Hotel, Resort, Hostel, Apartment, Serviced Apartment, Co-living, PG, Homestay, Farm Stay, Private Room, Shared Room, Villa, Guest House, Boutique Stay, Other.
   - Partners can pick more than one. Their choices are saved with the application and carried over to the approved property.
   - Partners can change their types later from the Hotel Profile page.

2. **Partner dashboard changes with the chosen types**
   - Menu items and labels follow the types. Hotel/Resort get Rooms and Meals. Hostel, Shared Room, PG and Co-living get Beds with per-bed pricing. Apartments and Serviced Apartments get Units with monthly or long-stay pricing. Farm Stay and Homestay get Experiences.
   - If a partner picks several types, the dashboard shows the features for all of them.
   - Each room or unit gets a "Stay type" tag (private room, shared room or bed, or entire unit) so it can be found in search.

3. **Customer hotel search in 3 steps**
   - **Where do you want to stay?** City, area or landmark search, plus dates and guests.
   - **What kind of stay?** The same business-type cards partners use.
   - **What are you looking for?** Chips for Family, Couple, Business, Budget, Luxury, Private room, Shared room, Entire apartment, Short, Long or Monthly stay, Pet-friendly, Breakfast, Wi-Fi, Parking, Pool and more, with a budget slider.
   - Every choice is kept in the page address, so results can be shared and the back button works.

4. **AI search bar**
   - A "Describe your stay" box sits at the top of the Hotels page. Example: "Hotel in Hyderabad for my family under ₹3,000 with breakfast and parking."
   - AI turns the sentence into the same filters as the 3-step search: location, type, guests, nights, budget and amenities. It shows them as chips you can edit, then runs the search.

5. **Personalised recommendations**
   - When you're signed in, the app records searches, chosen filters, hotels you view or shortlist, and your bookings.
   - A "Recommended for you" row ranks hotels by how well they match your habits. For example, someone who keeps searching "budget family hotels in Hyderabad" sees those first.
   - Signed-out visitors see popular hotels instead.

Normal search and AI search use the same hotel, room, availability and price data.

## Technical details

- **Database (one migration, with GRANTs, RLS and policies):**
  - `hotel_partner_applications.business_types text[]`
  - `partner_hotels.business_types text[]`, `partner_hotels.amenities text[]`, `partner_hotels.tags text[]`
  - `hotel_rooms.stay_unit` (room | bed | unit) and `hotel_rooms.min_stay_nights`
  - New table `hotel_user_signals` (user_id, signal_type: search/view/shortlist/book, hotel_id, params jsonb, created_at). Each user can only see and write their own rows.
  - Copy existing `business_type` values into the new column.
- **Shared catalogue:** `src/config/hospitalityCategories.ts` lists the types, icons, the dashboard features each type turns on, and the preference and amenity chips. Partner and customer screens both read from it.
- **Partner screens:** `PartnerRegister.tsx` (multi-select cards with validation for at least one type), `PartnerKYC.tsx`, `PartnerHotelProfile.tsx`, `PartnerSubNav.tsx` (menu filtered by type), `PartnerRooms.tsx` (stay-unit field).
- **`hotel-search` edge function:** accept `business_types[]`, `stay_types[]`, `amenities[]`, `preferences[]`, `min_price`/`max_price` and `sort=relevance`. Add a match score; results with a higher score rank first.
- **New edge function `hotel-ai-intent`:** uses the Lovable AI Gateway Responses API (`openai/gpt-6-astra`, streamed) to return a strict structured result matching the search parameters. Its input is checked with Zod, and gateway errors such as 402 and 429 are shown to the user.
- **New edge function `hotel-recommendations`:** builds a preference profile from the user's last roughly 100 signals (weighted counts of cities, types, budget range and amenities). It then calls the same search logic and ranks by match score. No extra AI call is needed.
- **Hotels page:** `Hotels.tsx` gets the 3-step guided search, the AI bar and the recommendations row. Signals are logged through a small `hotelSignals.ts` service.
- Record the shared-catalogue rule in `AGENTS.md`.
