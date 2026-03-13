# 🏠 JaagaX — Complete Data Requirements & Routing Map

> **Purpose**: This document maps every UI section/page to its database table, required fields, routing path, and data extraction needs. Hand this to your data science team for structured data extraction.

---

## 📊 DATABASE TABLES OVERVIEW (30 Tables)

| # | Table | Primary Purpose | Key Relationships |
|---|-------|----------------|-------------------|
| 1 | `properties` | Individual property listings | → builders, visit_bookings, favorites |
| 2 | `projects` | Builder projects (multi-unit developments) | → builders |
| 3 | `builders` | Builder/developer companies | → users |
| 4 | `agents` | Field agents | → users |
| 5 | `users` | All platform users | Core identity table |
| 6 | `user_roles` | Role assignments (builder/agent/driver/customer/admin) | → users |
| 7 | `profiles` | Extended user profile info | — |
| 8 | `advertisements` | Promoted listings & reels | → properties, projects |
| 9 | `ad_interactions` | Click/impression/save tracking | → advertisements |
| 10 | `visit_bookings` | Site visit scheduling | → properties, projects, agents |
| 11 | `visits` | Legacy visit records | → properties, agents, users, drivers |
| 12 | `visit_locations` | Real-time GPS tracking during visits | → visit_bookings |
| 13 | `community_events` | Local events (festivals, expos) | — |
| 14 | `event_rsvps` | Event attendance tracking | → community_events |
| 15 | `favorites` | User's saved properties/projects | → properties, projects |
| 16 | `customer_preferences` | Buyer search preferences | → users |
| 17 | `buyer_context` | AI-powered buyer psychology profile | — |
| 18 | `trust_scores` | Property trust score breakdown | → properties |
| 19 | `property_verifications` | Agent field verification records | → properties, agents |
| 20 | `moderation_queue` | Content moderation pipeline | → properties |
| 21 | `agent_activity_log` | Agent action tracking | → agents |
| 22 | `agent_assignment_requests` | Cascade agent assignment flow | → agents, visit_bookings |
| 23 | `agent_availability` | Agent calendar/slots | → agents |
| 24 | `agent_earnings` | Agent payment records | → agents, visit_bookings |
| 25 | `agent_performance_daily` | Aggregated daily agent metrics | → agents |
| 26 | `payments` | Payment transactions | → visits |
| 27 | `disputes` | Complaint/dispute tracking | → properties, visits |
| 28 | `drivers` | Vehicle drivers for site visits | → users |
| 29 | `feature_flags` | Feature toggle system | — |
| 30 | `admin_actions` | Admin audit trail | — |

---

## 🗺️ COMPLETE PAGE-BY-PAGE ROUTING & DATA MAP

---

### 1. HOME PAGE (`/`)

| UI Section | Component | Data Source | Required Fields | Routes To |
|-----------|-----------|------------|----------------|-----------|
| **Featured Properties** | `FeaturedProperties` | `properties` | `id`, `title`, `city`, `locality`, `price`, `bedrooms`, `bathrooms`, `area_sqft`, `images` (JSON array of URLs), `verified`, `trust_score`, `bhk` | `/property/:id` |
| **New Projects** | `NewProjects` | `projects` | `id`, `name`, `builder_name`, `city`, `locality`, `avg_price`, `image` (single URL), `verified`, `rera_id`, `trust_score` | `/project/:id` |
| **Promoted Listings (Reels)** | `PromotedListings` → `AdCarousel` | `advertisements` | `id`, `title`, `tagline`, `description`, `images` (JSON), `cta_text`, `offer_text`, `highlights` (JSON), `property_id`, `project_id`, `status` (must be `'active'`), `ad_type`, `priority`, `featured` | `/property/:property_id` or `/project/:project_id` |
| **Find My Agent** | `FindMyAgent` | `agents` ⚠️ HARDCODED | `id`, `name`, `photo_url`, `rating`, `cities_served`, `trust_score` | `/agent/:id` |
| **AI Insight Strip** | `AIInsightStrip` | `buyer_context` | `budget_comfort`, `confidence_score`, `decision_mode`, `life_stage`, `primary_fear` | — |
| **Market Intelligence** | `MarketIntelligence` | — (static) | — | `/transactions` |
| **TruValue** | `TruValue` | — (static) | — | `/valuation` |
| **Featured Communities** | `FeaturedCommunities` | — (static) | — | `/communities` |
| **Intent Chips** | `IntentChips` | — (static) | — | Various |
| **Visit & Stay Teaser** | `VisitStayTeaser` | — (static) | — | `/hotels` |

---

### 2. PROPERTY DETAIL (`/property/:id`)

| UI Section | Component | Data Source | Required Fields |
|-----------|-----------|------------|----------------|
| **Breadcrumb** | `PropertyBreadcrumb` | `properties` | `city`, `locality`, `title` |
| **Overview** | `PropertyOverview` | `properties` | `title`, `city`, `locality`, `price`, `area_sqft`, `bedrooms`, `bathrooms`, `bhk`, `status` (completion_stage), `verified` |
| **Image Carousel** | `PropertyImageCarousel` | `properties` | `images` (JSON array of image URLs) |
| **Property Info** | `PropertyInformation` | `properties` | `description`, `property_type`, `address`, `rera_id` |
| **Amenities** | `PropertyAmenities` | `properties` | ⚠️ No amenities column exists — needs adding |
| **Building Info** | `BuildingInformation` | `projects` | `total_units`, `available_units`, `configurations`, `amenities` |
| **Floor Plans** | — | `properties` | `floor_plan_url` |
| **Documents** | — | `properties` | `documents` (JSON) |
| **EMI Calculator** | `EMICalculator` | `properties` | `price` |
| **Payment Plans** | `PaymentPlans` | — | ⚠️ No payment_plans table exists |
| **Property Map** | `PropertyMap` | `properties` | `latitude`, `longitude` |
| **Nearby POI** | `NearbyPOI` | `properties` | `latitude`, `longitude` |
| **Agent Card** | `AgentCard` | `agents` | `name`, `photo_url`, `phone`, `rating`, `agency_name`, `cities_served` |
| **Similar Properties** | `SimilarProperties` | `properties` | Same as Featured Properties fields, filtered by `city`/`locality` |
| **Trust Score** | `PropertyStats` | `trust_scores` | `overall_score`, `breakdown` (JSON) |
| **AI Decision Panel** | `AIDecisionPanel` | Edge Function | — |
| **AI Insights** | `AIInsightsPanel` | Edge Function | — |
| **Booking Modal** | `BookingModal` | Creates `visit_bookings` | `property_id`, `user_id`, `visit_date`, `visit_time`, `buyer_name`, `buyer_phone`, `buyer_email` |

**Routes from this page:**
- Schedule Visit → `/visit/schedule/:propertyId`
- Agent Profile → `/agent/:agentId`
- Similar Property → `/property/:id`
- Map View → `/map`

---

### 3. PROJECT DETAIL (`/project/:id`)

| UI Section | Data Source | Required Fields |
|-----------|------------|----------------|
| **Project Info** | `projects` | `id`, `name`, `builder_name`, `city`, `locality`, `description`, `avg_price`, `min_price`, `max_price`, `image`, `images` (JSON), `verified`, `rera_id`, `trust_score`, `status`, `launch_date`, `completion_date`, `total_units`, `available_units`, `configurations` (JSON), `amenities` (JSON), `documents` (JSON), `latitude`, `longitude`, `address` |
| **Builder Info** | `builders` (via `builder_id`) | `company_name`, `rera_id`, `verified`, `documents` |
| **Properties in Project** | `properties` (where `builder_id` matches) | All property fields |
| **Interest Registration** | `InterestRegistrationModal` | Creates lead record |

**Routes from this page:**
- Individual Property → `/property/:id`
- Schedule Visit → `/visit/schedule/:propertyId`
- Builder Dashboard → `/dashboard/builder`

---

### 4. SEARCH PAGE (`/search`)

| Filter/Field | Data Source | Required Fields |
|-------------|------------|----------------|
| **City Filter** | `properties` | `city` (distinct values) |
| **Locality Filter** | `properties` | `locality` (distinct values per city) |
| **Price Range** | `properties` | `price` (min/max) |
| **BHK Filter** | `properties` | `bhk` |
| **Property Type** | `properties` | `property_type` (enum: apartment, villa, plot, commercial) |
| **Bedrooms** | `properties` | `bedrooms` |
| **Area Range** | `properties` | `area_sqft` |
| **Verified Only** | `properties` | `verified` |
| **Search Results** | `properties` | All property card fields |
| **AI Match Score** | Edge Function | buyer preferences vs property attributes |

**Each result card routes to:** `/property/:id`

---

### 5. AGENTS PAGE (`/agents`)

| UI Section | Data Source | Required Fields |
|-----------|------------|----------------|
| **Agent Cards** | `agents` | `id`, `name`, `agency_name`, `photo_url`, `rating`, `cities_served` (string[]), `languages` (string[]), `trust_score`, `verified`, `sales_count`, `rent_count`, `acceptance_rate`, `total_visits`, `phone`, `is_online` |
| **Agent Filters** | `agents` | `cities_served`, `languages`, `rating`, `verified` |

**Routes:**
- Agent Detail → `/agent/:id`
- Agent Comparison → `/agents/compare`
- Leaderboard → `/agents/leaderboard`

---

### 6. AGENT DETAIL (`/agent/:id`)

| UI Section | Data Source | Required Fields |
|-----------|------------|----------------|
| **Agent Profile** | `agents` | All agent fields |
| **Performance** | `agent_performance_daily` | `total_visits`, `completed_visits`, `avg_rating`, `acceptance_rate`, `avg_response_time_seconds`, `distance_traveled_km`, `online_hours`, `total_earnings` |
| **Availability** | `agent_availability` | `date`, `is_available`, `time_slots` (JSON) |
| **Activity Log** | `agent_activity_log` | `activity_type`, `metadata` (JSON), `created_at` |
| **Badges** | `AgentBadges` | Derived from performance metrics |
| **Success Stories** | `AgentSuccessStories` | ⚠️ No table — hardcoded |
| **Video** | `AgentVideoSection` | ⚠️ No video_url column on agents |
| **Expertise** | `AgentExpertise` | Derived from `cities_served`, `sales_count` |

---

### 7. PROMOTIONS / REELS (`/promotions`)

| UI Section | Data Source | Required Fields |
|-----------|------------|----------------|
| **Reels Feed** | `advertisements` | `id`, `title`, `tagline`, `description`, `images` (JSON array of URLs), `cta_text`, `offer_text`, `highlights` (JSON array), `property_id`, `project_id`, `status` = `'active'`, `ad_type`, `priority`, `featured`, `start_date`, `end_date` |
| **Story Previews** | `advertisements` | Same + `featured` = true |
| **Interaction Tracking** | `ad_interactions` | `ad_id`, `interaction_type` ('impression', 'click', 'save', 'contact'), `user_id` |

**Click-through routes:**
- If `property_id` exists → `/property/:property_id`
- If `project_id` exists → `/project/:project_id`

---

### 8. TRANSACTIONS (`/transactions`, `/transactions/:city`, `/transactions/:city/:locality`)

| UI Section | Data Source | Required Fields |
|-----------|------------|----------------|
| **Transaction Data** | ⚠️ No `transactions` table exists | Needs: `property_id`, `sale_price`, `sale_date`, `buyer_id`, `seller_id`, `locality`, `city`, `property_type`, `area_sqft` |
| **Market Pulse** | Aggregated from properties | `city`, `locality`, `price` (trend data) |
| **Locality Index** | Aggregated | Average prices per locality |
| **AI Forecasts** | Edge Function `ai-project-forecast` | — |

---

### 9. COMMUNITIES & EVENTS

#### Communities (`/communities`, `/communities/:city`, `/communities/:city/:locality`)

| Data Source | Required Fields |
|------------|----------------|
| `community_events` | `id`, `title`, `description`, `category`, `city`, `locality`, `event_date`, `event_time`, `end_date`, `end_time`, `venue`, `venue_address`, `organizer`, `organizer_contact`, `organizer_email`, `image_url`, `images` (JSON), `ticket_price`, `max_attendees`, `current_attendees`, `latitude`, `longitude`, `tags` (JSON), `language`, `featured`, `verified`, `status`, `accessibility_features` (JSON) |

#### Event Detail (`/events/:id`)

| Data Source | Required Fields |
|------------|----------------|
| `community_events` | All fields above |
| `event_rsvps` | `event_id`, `user_id`, `status` |

**Routes:** `/events`, `/events/create`, `/events/:id`

---

### 10. VISIT SCHEDULING FLOW

| Route | Data Source | Required Fields |
|-------|------------|----------------|
| `/visit/schedule/:propertyId` | `properties`, `agents` | Property details + available agents |
| `/visit/confirm/:bookingId` | `visit_bookings` | `id`, `visit_date`, `visit_time`, `buyer_name`, `buyer_phone`, `status`, `verification_code`, `otp_code`, `agent_id`, `property_id`, `project_id` |
| `/visit/manage` | `visit_bookings` | All bookings for current user |
| `/visit/live/:bookingId` | `visit_bookings`, `visit_locations` | `agent_location` (JSON: {lat, lng}), `vehicle_location` (JSON), real-time GPS updates |
| `/visit/verify` | `visit_bookings` | `verification_code`, `otp_code` |
| `/visit/story/:bookingId` | `visit_bookings` | Post-visit media |
| `/visit/summary/:bookingId` | `visit_bookings` | Complete visit record |
| `/visit/analytics` | `visit_bookings` aggregated | Visit counts, completion rates |

---

### 11. ROLE-BASED DASHBOARDS

#### Buyer Dashboard (`/dashboard/buyer`)

| Data Source | Required Fields |
|------------|----------------|
| `visit_bookings` (where `user_id` = current) | All booking fields |
| `favorites` | `property_id`, `project_id` |
| `customer_preferences` | `budget_min`, `budget_max`, `bedrooms_min`, `bedrooms_max`, `preferred_cities`, `property_types` |
| `buyer_context` | All fields |

#### Agent Dashboard (`/dashboard/agent`)

| Data Source | Required Fields |
|------------|----------------|
| `agents` (where `user_id` = current) | All agent fields |
| `visit_bookings` (where `agent_id` = current agent) | All booking fields |
| `agent_earnings` | `amount`, `type`, `status`, `paid_at` |
| `agent_performance_daily` | All metrics |
| `property_verifications` | All fields |
| `agent_assignment_requests` | `status`, `cascade_order`, `rejection_reason` |

#### Builder Dashboard (`/dashboard/builder`)

| Data Source | Required Fields |
|------------|----------------|
| `builders` (where `user_id` = current) | All builder fields |
| `projects` (where `builder_id` = current builder) | All project fields |
| `properties` (where `builder_id` = current builder) | All property fields |
| `visit_bookings` (where `project_id` in builder's projects) | Pending approvals |
| `advertisements` (where `builder_id` = current builder) | All ad fields + metrics |

#### Seller Dashboard (`/dashboard/seller`)

| Data Source | Required Fields |
|------------|----------------|
| `properties` (where `submitted_by` = current user) | All property fields |
| `visit_bookings` for those properties | Status tracking |

#### Admin Dashboard (`/dashboard/admin`)

| Data Source | Required Fields |
|------------|----------------|
| All tables | Full access for moderation |
| `moderation_queue` | `property_id`, `status`, `submission_type`, `flag_reason`, `review_notes` |
| `disputes` | `ticket_number`, `type`, `status`, `priority`, `description`, `resolution` |
| `admin_actions` | `action_type`, `target_type`, `target_id`, `details` |
| `feature_flags` | `flag_name`, `enabled`, `description` |

---

### 12. OTHER PAGES

| Route | Data Source | Required Fields |
|-------|------------|----------------|
| `/valuation` | `properties` | `price`, `area_sqft`, `city`, `locality` — for comparables |
| `/map` | `properties` | `latitude`, `longitude`, `price`, `title`, `bhk`, `city` |
| `/sell-property` | Creates `properties` | All property insert fields |
| `/hotels` | ⚠️ No `hotels` table | Needs: hotel_name, city, locality, star_rating, price_per_night, images, amenities, lat, lng, distance_to_properties |
| `/natural-living` | — (static) | — |
| `/guides` | — (static) | — |
| `/trust-score` | `trust_scores` | `property_id`, `overall_score`, `breakdown` |
| `/innovation` | — (static) | — |
| `/ai-advisor` | Edge Functions | Buyer preferences → property recommendations |

---

## 🔴 CRITICAL DATA GAPS (Missing Tables/Fields)

| # | Gap | Impact | Recommendation |
|---|-----|--------|---------------|
| 1 | **No `transactions` table** | `/transactions` pages show no real data | Create table: `id`, `property_id`, `sale_price`, `sale_date`, `buyer_id`, `seller_id`, `city`, `locality`, `property_type`, `area_sqft`, `registration_number` |
| 2 | **No `hotels` table** | `/hotels` page is static | Create table: `id`, `name`, `city`, `locality`, `star_rating`, `price_per_night`, `images`, `amenities`, `lat`, `lng`, `contact_phone`, `booking_url` |
| 3 | **No `amenities` column on `properties`** | Property amenities are hardcoded | Add JSON column: `amenities` to `properties` |
| 4 | **No `payment_plans` table** | Payment plan section is empty | Create table: `id`, `property_id`, `plan_name`, `milestones` (JSON), `down_payment_pct` |
| 5 | **Agents `FindMyAgent` is hardcoded** | Homepage agents section doesn't use DB | Wire to `agents` table query |
| 6 | **No `notifications` table** | Notification bell has no persistence | Create table: `id`, `user_id`, `title`, `message`, `type`, `read`, `created_at`, `link_url` |
| 7 | **No `whatsapp_logs` table** | WhatsApp tracking panel has no data | Create table: `id`, `phone`, `message_type`, `status`, `sent_at`, `booking_id` |
| 8 | **Builder `company_name` vs `name`** | Projects reference `builder_name` but builders table has `company_name` | Ensure consistency |
| 9 | **No `agent_video_url`** | Agent video section has no data source | Add `video_url` column to `agents` |
| 10 | **No `reviews` table** | Agent reviews are hardcoded | Create: `id`, `agent_id`, `user_id`, `rating`, `comment`, `created_at` |

---

## 📋 DATASET EXTRACTION CHECKLIST FOR DATA SCIENTISTS

### Dataset 1: **Properties** (Priority: 🔴 Critical)
```
Fields to extract per property:
- title (string, required)
- address (string, required)
- city (string, required)
- locality (string, required)
- price (number, required, in INR)
- area_sqft (number)
- bedrooms (number)
- bathrooms (number)
- bhk (number)
- property_type (enum: apartment | villa | plot | commercial)
- description (text)
- images (array of image URLs, min 3-5 per property)
- latitude (decimal)
- longitude (decimal)
- rera_id (string, RERA registration number)
- floor_plan_url (image URL)
- completion_stage (string: Ready/Under Construction/Pre-Launch)
- verified (boolean)
- trust_score (number 0-100)
- builder_id (FK to builders)
```

### Dataset 2: **Projects** (Priority: 🔴 Critical)
```
Fields to extract per project:
- name (string, required)
- builder_name (string, required)
- city (string, required)
- locality (string, required)
- avg_price (number)
- min_price (number)
- max_price (number)
- image (single hero image URL)
- images (array of image URLs)
- description (text)
- address (string)
- rera_id (string)
- status (string: Pre-Launch/Launching/Under Construction/Ready)
- launch_date (date)
- completion_date (date)
- total_units (number)
- available_units (number)
- configurations (JSON: [{bhk: 2, area_sqft: 1200, price: 5000000}, ...])
- amenities (JSON: ["Swimming Pool", "Gym", "Clubhouse", ...])
- documents (JSON: [{name: "Brochure", url: "..."}])
- latitude (decimal)
- longitude (decimal)
- trust_score (number 0-100)
- verified (boolean)
```

### Dataset 3: **Agents** (Priority: 🟡 High)
```
Fields to extract per agent:
- name (string, required)
- agency_name (string)
- phone (string, required)
- photo_url (image URL)
- cities_served (string array: ["Hyderabad", "Vijayawada"])
- languages (string array: ["English", "Hindi", "Telugu"])
- rating (decimal 0-5)
- sales_count (number)
- rent_count (number)
- trust_score (number 0-100)
- verified (boolean)
- license_doc (document URL)
- acceptance_rate (decimal 0-100)
```

### Dataset 4: **Builders** (Priority: 🟡 High)
```
Fields to extract per builder:
- company_name (string, required)
- rera_id (string)
- documents (JSON: [{type: "RERA Certificate", url: "..."}])
- verified (boolean)
- bank_accounts (JSON, optional)
```

### Dataset 5: **Community Events** (Priority: 🟢 Medium)
```
Fields to extract per event:
- title (string, required)
- description (text)
- category (string: Festival/Expo/Workshop/Cultural/Sports)
- city (string, required)
- locality (string)
- event_date (date, required)
- event_time (time)
- end_date (date)
- end_time (time)
- venue (string, required)
- venue_address (string)
- organizer (string)
- organizer_contact (phone)
- organizer_email (email)
- image_url (image URL)
- images (array of URLs)
- ticket_price (number, 0 for free)
- max_attendees (number)
- latitude (decimal)
- longitude (decimal)
- tags (string array)
- language (string)
```

### Dataset 6: **Advertisements** (Priority: 🟢 Medium)
```
Fields to extract/create per ad:
- title (string, required)
- tagline (string)
- description (text)
- ad_type (string: banner/reel/story/spotlight)
- images (JSON array of image URLs, min 2-3)
- cta_text (string: "Book Visit", "View Project", etc.)
- offer_text (string: "10% off on booking", etc.)
- highlights (JSON string array: ["Premium Location", "RERA Approved"])
- property_id (FK, nullable)
- project_id (FK, nullable)
- builder_id (FK, required)
- status (string: active/paused/completed)
- priority (number 1-10)
- featured (boolean)
- start_date (date)
- end_date (date)
- budget (number)
```

### Dataset 7: **Transactions** ⚠️ NEW TABLE NEEDED (Priority: 🔴 Critical)
```
Fields needed:
- property_id (FK)
- sale_price (number)
- sale_date (date)
- city (string)
- locality (string)
- property_type (string)
- area_sqft (number)
- price_per_sqft (number, derived)
- registration_number (string)
- buyer_type (string: individual/company)
```

### Dataset 8: **Hotels** ⚠️ NEW TABLE NEEDED (Priority: 🟡 High)
```
Fields needed:
- name (string)
- city (string)
- locality (string)
- star_rating (number 1-5)
- price_per_night (number)
- images (JSON array)
- amenities (JSON array)
- latitude (decimal)
- longitude (decimal)
- contact_phone (string)
- booking_url (string)
- nearby_properties_count (number, derived)
```

---

## 🔗 COMPLETE ROUTING MAP (All 50+ Routes)

| Route | Page | Primary Table(s) | Click-Through Target |
|-------|------|------------------|---------------------|
| `/` | Home | properties, projects, advertisements | /property/:id, /project/:id |
| `/auth` | Login/Signup | users, profiles | /dashboard |
| `/search` | Property Search | properties | /property/:id |
| `/property/:id` | Property Detail | properties, agents, trust_scores | /visit/schedule/:id, /agent/:id |
| `/project/:id` | Project Detail | projects, builders, properties | /property/:id |
| `/projects` | Projects List | projects | /project/:id |
| `/agents` | Agents List | agents | /agent/:id |
| `/agent/:id` | Agent Detail | agents, agent_performance_daily | — |
| `/agents/compare` | Compare Agents | agents | /agent/:id |
| `/agents/leaderboard` | Leaderboard | agents, agent_performance_daily | /agent/:id |
| `/promotions` | Reels/Ads | advertisements, ad_interactions | /property/:id, /project/:id |
| `/transactions` | Market Data | ⚠️ needs transactions table | /transactions/:city |
| `/transactions/:city` | City Transactions | ⚠️ needs data | /transactions/:city/:locality |
| `/transactions/:city/:locality` | Locality Data | ⚠️ needs data | /property/:id |
| `/communities` | Communities | community_events | /communities/:city |
| `/communities/:city` | City Events | community_events | /events/:id |
| `/communities/:city/:locality` | Locality Events | community_events | /events/:id |
| `/events` | All Events | community_events | /events/:id |
| `/events/create` | Create Event | Creates community_events | — |
| `/events/:id` | Event Detail | community_events, event_rsvps | — |
| `/map` | Map View | properties | /property/:id |
| `/valuation` | Property Valuation | properties | — |
| `/trust-score` | Trust Scores | trust_scores, properties | /property/:id |
| `/hotels` | Hotels | ⚠️ needs hotels table | — |
| `/natural-living` | Natural Living | — (static) | — |
| `/guides` | Guides | — (static) | — |
| `/sell-property` | List Property | Creates properties | — |
| `/innovation` | Innovation Hub | — (static) | — |
| `/ai-advisor` | AI Advisor | Edge Functions | /ai-advisor/results |
| `/ai-advisor/results` | AI Results | properties | /ai-advisor/:propertyId |
| `/ai-advisor/:propertyId` | AI Property | properties | — |
| `/visit/schedule/:propertyId` | Schedule Visit | properties, agents | /visit/confirm/:id |
| `/visit/confirm/:bookingId` | Confirm Visit | visit_bookings | /visit/manage |
| `/visit/manage` | My Visits | visit_bookings | /visit/live/:id |
| `/visit/live/:bookingId` | Live Tracking | visit_bookings, visit_locations | — |
| `/visit/verify` | Verify Visit | visit_bookings | — |
| `/visit/story/:bookingId` | Visit Story | visit_bookings | — |
| `/visit/summary/:bookingId` | Visit Summary | visit_bookings | — |
| `/visit/analytics` | Visit Analytics | visit_bookings (aggregated) | — |
| `/onboarding/buyer` | Buyer Onboarding | Creates customer_preferences | /dashboard/buyer |
| `/dashboard` | Role Router | user_roles | /dashboard/buyer etc. |
| `/dashboard/buyer` | Buyer Dashboard | visit_bookings, favorites, customer_preferences | /property/:id |
| `/dashboard/agent` | Agent Dashboard | agents, visit_bookings, agent_earnings | /visit/live/:id |
| `/dashboard/agent/visits` | Agent Visits | visit_bookings | — |
| `/dashboard/agent/verifications` | Verifications | property_verifications | /property/:id |
| `/dashboard/builder` | Builder Dashboard | builders, projects, properties, advertisements | /project/:id |
| `/dashboard/builder/visits` | Builder Visits | visit_bookings | — |
| `/dashboard/seller` | Seller Dashboard | properties | /property/:id |
| `/dashboard/admin` | Admin Dashboard | All tables | — |
| `/dashboard/admin/frm` | Admin FRM | disputes, moderation_queue | — |
| `/agent/location/:bookingId` | Agent GPS Share | visit_locations | — |
| `/agent/visit/story/:bookingId` | Agent Story Upload | visit_bookings | — |

---

## 📌 IMAGE REQUIREMENTS SUMMARY

| Entity | Field | Format | Recommended Count |
|--------|-------|--------|-------------------|
| Property | `images` | JSON array of URLs | 5-10 per property |
| Property | `floor_plan_url` | Single URL | 1 per property |
| Project | `image` | Single hero URL | 1 per project |
| Project | `images` | JSON array of URLs | 5-8 per project |
| Agent | `photo_url` | Single URL | 1 per agent |
| Event | `image_url` | Single URL | 1 per event |
| Event | `images` | JSON array of URLs | 3-5 per event |
| Advertisement | `images` | JSON array of URLs | 2-5 per ad |

---

## 🏙️ TARGET CITIES FOR DATA EXTRACTION

Based on existing data baseline:
1. **Hyderabad** (primary)
2. **Vijayawada** (primary)
3. **Bangalore**
4. **Chennai**
5. **Mumbai**
6. **Pune**

**Per city target:** 50+ properties, 10+ projects, 5+ agents, 5+ events, 3+ advertisements

---

*Document generated: March 13, 2026*
*Platform: JaagaX Real Estate*
