# JAAGA Travel module

## Goal
Add a standalone **Travel** entry in the main home header and build JAAGA Travel as an AI-led discovery, experience, and flexible planning product. Reuse existing Hotels, Properties, location, authentication, notifications, and visit workflows rather than duplicating them. Transportation booking remains out of scope.

## Phase 1 — Travel foundation and customer experience
- Add **Travel** to desktop navigation, mobile navigation, and the Services page, routing to `/travel`.
- Build a distinct, immersive JAAGA Travel shell with Travel navigation: Home, Explore, Plans, Stays, Saved, and Profile.
- Build the Travel home with intent search, mood/interests, quick intents, Surprise Me, weekend escapes, destinations, nearby experiences, and contextual links to existing stays and properties.
- Add destination and experience details with trustworthy labels, saving, adding to plans, nearby discovery, and clear recommendation reasons.
- Include realistic seeded destination/experience content so every screen is navigable from launch.

## Phase 2 — AI planning and personalization
- Add Travel Profile preferences for interests, moods, pace, budget, companions, and stay preferences.
- Build AI plan creation from natural language, generating destination options and flexible morning/afternoon/evening itineraries.
- Allow plan items to be kept, replaced, moved, removed, and supplemented, with fit scores and explanations.
- Add a context-aware **Ask JAAGA** panel that can answer questions and revise the active plan.
- Support normal, nearby, weekend, 6-hour, family, relocation, NRI, business, property-discovery, and Surprise Me journeys without forcing Property or Hospitality.

## Phase 3 — Saved, collaboration, and memories
- Add saved destinations, experiences, stays, and properties organized into collections.
- Add group plans, member invitations, voting, comments, and shared itinerary decisions.
- Add post-trip memories with photos, notes, ratings, favorites, privacy, and sharing.
- Record preference signals so future discovery can become personalized without hiding user controls.

## Phase 4 — Existing ecosystem connections
- Rank existing JAAGA stays as plan recommendations by fit, location, stay type, duration, and budget; booking continues through the current hotel flow.
- Show existing properties only for relevant relocation, investment, NRI, or explicitly selected property journeys; connect to existing property details and visit booking.
- Track Travel → stay and Travel → property conversion events without changing the existing inventory systems.

## Phase 5 — Partners, creators, and admin
- Add role-appropriate workspaces for experience partners, local experts, creators, and destination partners.
- Support experience/content creation, verification, availability, pricing, publishing, reviews, and performance.
- Add a global-admin Travel workspace for destination/experience/partner approval, moderation, reports, recommendation quality, analytics, and ecosystem conversion.
- Keep commercial, sponsored, verified, partner, expert, and user-generated labels explicit.

## Data and security
- Add dedicated Travel tables for profiles, destinations/areas, experiences/categories, plans/days/items, collections/saves, collaborators/votes/comments, memories, creators/partners, reviews/reports, recommendations, and analytics events.
- Use UUID IDs, authenticated ownership rules, explicit grants, admin-only approval/moderation, and safe public reads for approved content only.
- Put secure AI planning and recommendation logic in backend functions; frontend Travel screens use a dedicated service layer.

## Validation
- Verify responsive Travel flows on mobile and desktop.
- Test public browsing, signed-in save/plan/edit, collaboration, hotel/property handoff, partner publishing, and admin approval end to end.
- Confirm Travel works independently with no transport booking and that optional Property/Hospitality content appears only when relevant.
