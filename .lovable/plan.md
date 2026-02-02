
# Comprehensive Implementation Plan: Property Verification, Dynamic Agent Assignment & FRM System

## Executive Summary

This plan addresses three critical requirements for building a professional real estate platform with:

1. **Multi-tier Property Verification** - Agent field verification → Admin final approval
2. **Uber/Rapido-style Agent Assignment** - Dynamic, location-based agent allocation
3. **Field Relationship Manager (FRM)** - Comprehensive agent performance tracking

---

## Part 1: Database Schema Fixes (Critical - Build Errors)

### Current Issues

The connected Supabase project is missing several required tables and columns that the frontend code expects:

| Missing Entity | Required Columns |
|---------------|------------------|
| `properties` table | `city`, `locality`, `verified`, `bhk`, `type` columns missing |
| `projects` table | Entire table missing |
| `feature_flags` table | Entire table missing |
| `visit_bookings` table | Entire table missing |
| `favorites` table | Entire table missing |
| `user_roles` enum | Uses `customer` instead of `buyer` |

### Database Migration Required

```text
+------------------+     +------------------+     +------------------+
|   properties     |     |    agents        |     |   visit_bookings |
+------------------+     +------------------+     +------------------+
| + city           |     | + name           |     | + property_id    |
| + locality       |     | + phone          |     | + user_id        |
| + verified       |     | + cities_served  |     | + agent_id       |
| + bhk            |     | + current_lat    |     | + status         |
| + type           |     | + current_lng    |     | + visit_date     |
| + submitted_by   |     | + is_online      |     | + verification_  |
| + verification_  |     | + trust_score    |     |   code           |
|   status         |     | + agency_name    |     +------------------+
+------------------+     +------------------+
```

---

## Part 2: Property Verification Flow (Agent → Admin)

### Current State
- Properties submitted by builders go to `moderation_queue`
- Admin directly approves/rejects

### Proposed New Flow

```text
Builder Submits Property
         │
         ▼
┌─────────────────────────────────────┐
│  Status: "submitted"                │
│  moderation_status: "pending"       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  AGENT FIELD VERIFICATION           │
│  - Visits property location         │
│  - Captures photos/videos           │
│  - Collects GPS coordinates         │
│  - Verifies builder documents       │
│  - Submits verification report      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Status: "agent_verified"           │
│  agent_notes: "Report..."           │
│  verification_photos: [...]         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  ADMIN FINAL REVIEW                 │
│  - Reviews agent report             │
│  - Checks documentation             │
│  - Approves/Rejects with reason     │
└─────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Approved   Rejected
 verified   moderation_status
 = true     = "rejected"
```

### New Tables Required

**1. `property_verifications` table**
```sql
- id: uuid
- property_id: uuid (FK → properties)
- agent_id: uuid (FK → agents)
- assigned_at: timestamp
- completed_at: timestamp
- status: enum ('assigned', 'in_progress', 'completed', 'cancelled')
- verification_type: enum ('initial', 're-verify', 'complaint')
- location_verified: boolean
- documents_verified: boolean
- photos_match: boolean
- agent_notes: text
- verification_photos: jsonb (array of photo URLs)
- gps_coordinates: jsonb ({lat, lng})
- admin_reviewed_by: uuid
- admin_reviewed_at: timestamp
- admin_notes: text
- final_status: enum ('pending_review', 'approved', 'rejected')
```

### UI Components Required

1. **Agent Verification Dashboard** (`/dashboard/agent/verifications`)
   - List of assigned properties to verify
   - "Start Verification" button with GPS capture
   - Photo upload interface
   - Verification checklist form
   - Submit report functionality

2. **Admin Verification Panel** (Enhanced)
   - Two-tab view: "Agent Verified" | "All Pending"
   - View agent verification report
   - View captured photos with GPS overlay
   - Approve/Reject with notes

---

## Part 3: Uber/Rapido-style Dynamic Agent Assignment

### Concept

When a buyer books a property visit in an area (e.g., KPHB), the system should:
1. Find all available agents in that area
2. Rank them by proximity, rating, and availability
3. Send request to top agent
4. If no response, cascade to next agent
5. Track acceptance rates

### Architecture

```text
Buyer Requests Visit
         │
         ▼
┌─────────────────────────────────────┐
│  AI Agent Finder Service            │
│  (ai-assign-agent edge function)    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  1. Get property location           │
│  2. Find agents within 10km radius  │
│  3. Filter by:                      │
│     - Online status                 │
│     - Availability schedule         │
│     - Current active visits         │
│  4. Rank by:                        │
│     - Distance (closer = higher)    │
│     - Trust score                   │
│     - Acceptance rate               │
│     - Response time                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Request to Top Agent          │
│  (Push notification + WhatsApp)     │
│  Timer: 2 minutes                   │
└─────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Accepted   No Response
    │           │
    ▼           ▼
 Assign     Request Next Agent
 Agent      (Cascade Logic)
```

### Database Changes

**Extend `agents` table:**
```sql
ALTER TABLE agents ADD COLUMN
  - name: text
  - phone: text
  - photo_url: text
  - agency_name: text
  - cities_served: text[]
  - languages: text[]
  - current_latitude: numeric
  - current_longitude: numeric
  - is_online: boolean DEFAULT false
  - last_location_update: timestamp
  - acceptance_rate: numeric DEFAULT 100
  - avg_response_time_seconds: integer
  - total_assignments: integer DEFAULT 0
  - trust_score: numeric DEFAULT 50
  - sales_count: integer DEFAULT 0
  - rent_count: integer DEFAULT 0
```

**New `agent_assignment_requests` table:**
```sql
- id: uuid
- visit_booking_id: uuid
- agent_id: uuid
- requested_at: timestamp
- responded_at: timestamp
- status: enum ('pending', 'accepted', 'rejected', 'timeout', 'cancelled')
- rejection_reason: text
- cascade_order: integer (1st, 2nd, 3rd attempt)
```

### Edge Function: `ai-assign-agent` (Enhanced)

```typescript
// Pseudocode for the enhanced assignment logic
1. Receive: { propertyId, locality, city, preferredAgentId?, urgency }
2. Get property coordinates from properties table
3. Query agents within radius:
   - Filter: is_online = true, verified = true
   - Filter: cities_served contains city
   - Calculate distance using Haversine formula
4. Rank agents by score:
   score = (100 - distance_km) * 0.4 
         + trust_score * 0.3 
         + acceptance_rate * 0.2 
         + (100 - active_visits * 10) * 0.1
5. Return top 5 agents for cascade logic
6. Create assignment_request for first agent
7. Trigger WhatsApp notification
```

### Real-time Agent Location Tracking

- Agents share location when "Online" toggle is enabled
- Location updates every 30 seconds via `update-location` edge function
- Stored in `agents.current_latitude/longitude`
- Buyer can see agent location on map during visit

---

## Part 4: Field Relationship Manager (FRM) System

### Purpose

Track detailed agent performance, history, and provide analytics for:
1. Agent self-improvement
2. Admin oversight
3. Buyer trust building

### Agent History Dashboard

```text
┌─────────────────────────────────────────────────────┐
│  AGENT PERFORMANCE DASHBOARD                        │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Visits  │ │ Sales   │ │ Rating  │ │ Response│  │
│  │   156   │ │   23    │ │  4.8/5  │ │  45sec  │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  VISIT HISTORY                              │   │
│  │  ├─ Jan 15: Property ABC - Completed ✓     │   │
│  │  ├─ Jan 14: Property XYZ - Buyer Feedback  │   │
│  │  ├─ Jan 13: Verification - 3 BHK Villa     │   │
│  │  └─ Jan 12: Property DEF - Cancelled       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  PERFORMANCE TRENDS (30 Days)               │   │
│  │  📈 Acceptance Rate: 94% (+2%)              │   │
│  │  📈 Avg Response Time: 45s (-10s)           │   │
│  │  📈 Customer Rating: 4.8 (+0.2)             │   │
│  │  📉 Cancellation Rate: 3% (+1%)             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  EARNINGS & INCENTIVES                      │   │
│  │  This Month: ₹45,000                        │   │
│  │  Bonus Eligible: Yes (>90% acceptance)      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### New Tables Required

**1. `agent_activity_log` table**
```sql
- id: uuid
- agent_id: uuid (FK → agents)
- activity_type: enum ('login', 'logout', 'location_update', 
                       'visit_start', 'visit_complete', 
                       'verification_assigned', 'verification_complete',
                       'assignment_received', 'assignment_accepted', 
                       'assignment_rejected')
- metadata: jsonb
- created_at: timestamp
```

**2. `agent_performance_daily` table (Aggregated)**
```sql
- id: uuid
- agent_id: uuid
- date: date
- total_visits: integer
- completed_visits: integer
- cancelled_visits: integer
- avg_rating: numeric
- total_earnings: numeric
- acceptance_rate: numeric
- avg_response_time_seconds: integer
- online_hours: numeric
- distance_traveled_km: numeric
```

**3. `agent_earnings` table**
```sql
- id: uuid
- agent_id: uuid
- visit_booking_id: uuid
- amount: numeric
- type: enum ('visit_fee', 'verification_fee', 'bonus', 'penalty')
- status: enum ('pending', 'paid', 'cancelled')
- paid_at: timestamp
- created_at: timestamp
```

### Admin FRM Dashboard

New route: `/dashboard/admin/frm`

Features:
1. **Agent Leaderboard** - Ranked by performance score
2. **Heat Map** - Agent distribution across cities
3. **Assignment Analytics** - Success rates, cascade patterns
4. **Verification Pipeline** - Agent verification queue
5. **Earnings Report** - Agent payouts and incentives

---

## Part 5: Implementation Priority & Phases

### Phase 1: Critical Fixes (Day 1-2)
1. Add missing columns to `properties` table
2. Create `projects`, `feature_flags`, `visit_bookings`, `favorites` tables
3. Fix `user_roles` enum (add `buyer` or map `customer` → `buyer`)
4. Fix TypeScript errors in components

### Phase 2: Core Agent System (Day 3-5)
1. Extend `agents` table with location/performance fields
2. Create `agent_assignment_requests` table
3. Enhance `ai-assign-agent` edge function
4. Build Agent Online/Offline toggle with location sharing
5. Implement cascade assignment logic

### Phase 3: Property Verification (Day 6-8)
1. Create `property_verifications` table
2. Build Agent Verification Dashboard
3. Enhance Admin Verification Panel
4. Add verification photo upload to storage bucket
5. WhatsApp notifications for verification assignments

### Phase 4: FRM System (Day 9-12)
1. Create `agent_activity_log`, `agent_performance_daily`, `agent_earnings` tables
2. Build Agent Performance Dashboard
3. Build Admin FRM Dashboard
4. Implement daily aggregation job (pg_cron)
5. Agent leaderboard and incentive calculations

---

## Testing Guide

### Phase 1 Testing (After Database Fixes)
1. Clear browser cache and reload app
2. Verify home page loads without console errors
3. Check "Featured Properties" displays data
4. Check "New Projects" displays data
5. Navigate to all dashboard routes

### Phase 2 Testing (Agent Assignment)
1. Create test property in KPHB area
2. Create 3 test agents with different locations in KPHB
3. Set agents to "Online" status
4. Book a visit as buyer
5. Verify agent notification received
6. Test cascade: Reject with first agent, verify second agent gets request
7. Accept with second agent, verify assignment completes

### Phase 3 Testing (Verification Flow)
1. Submit new property as builder
2. Verify status = "submitted"
3. Login as agent, see property in verification queue
4. Start verification, capture photos, submit report
5. Login as admin, see agent-verified property
6. Approve property, verify `verified = true`

### Phase 4 Testing (FRM)
1. Complete multiple visits as agent
2. Check Agent Performance Dashboard for stats
3. Check Admin FRM Dashboard for agent rankings
4. Verify daily aggregation runs correctly

---

## Technical Notes

- All location calculations use Haversine formula for accuracy
- Real-time updates use Supabase Realtime subscriptions
- WhatsApp notifications for all critical events
- RLS policies ensure proper data isolation
- Edge functions use service role for cross-table operations

