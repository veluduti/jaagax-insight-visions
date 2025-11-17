# Complete Visit Tracking System - Setup & Testing Guide

## 🎯 System Overview

This is a comprehensive property visit management system with:
- **Visit Scheduling** with OTP/QR code generation
- **Builder Approval Workflow** for visit requests
- **Live GPS Tracking** of agent/vehicle
- **WhatsApp Notifications** at each stage
- **Multi-role Access** (Buyer, Builder, Agent, Admin)

---

## 📋 Prerequisites & Database Setup

### Step 1: Assign Builder IDs to Properties

Properties need `builder_id` to route approval requests correctly.

```sql
-- Update some properties with builder IDs
UPDATE properties 
SET builder_id = 1 
WHERE id IN (15, 16, 17, 18, 19, 20);

UPDATE properties 
SET builder_id = 2 
WHERE id IN (21, 22, 23, 24, 25);

-- Verify
SELECT id, title, city, locality, builder_id 
FROM properties 
WHERE builder_id IS NOT NULL 
LIMIT 10;
```

### Step 2: Create Test Visit Bookings (Builder Pending Status)

```sql
-- Insert a test visit booking with builder_pending status
INSERT INTO visit_bookings (
  property_id,
  builder_id,
  user_name,
  user_email,
  user_phone,
  visit_date,
  visit_time,
  travel_mode,
  pickup_location,
  special_requests,
  status,
  otp_code,
  qr_code_url,
  agent_id
) VALUES (
  16,  -- property_id (use one that exists)
  1,   -- builder_id (matches property's builder)
  'Test Buyer',
  'buyer@test.com',
  '9876543210',
  CURRENT_DATE + INTERVAL '2 days',  -- 2 days from now
  '14:00:00',
  'pickup',
  '{"address": "MG Road Metro Station, Bangalore"}',
  'Please arrange parking',
  'builder_pending',  -- THIS IS KEY!
  '123456',
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST',
  1  -- agent_id (optional, for testing)
);

-- Insert another test booking
INSERT INTO visit_bookings (
  property_id,
  builder_id,
  user_name,
  user_email,
  user_phone,
  visit_date,
  visit_time,
  travel_mode,
  status,
  otp_code,
  qr_code_url
) VALUES (
  17,
  1,
  'John Doe',
  'john@example.com',
  '9123456789',
  CURRENT_DATE + INTERVAL '3 days',
  '10:00:00',
  'self',
  'builder_pending',
  '654321',
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST2'
);

-- Verify bookings
SELECT 
  id,
  user_name,
  property_id,
  builder_id,
  visit_date,
  visit_time,
  status
FROM visit_bookings
WHERE status = 'builder_pending'
ORDER BY created_at DESC;
```

---

## 🧪 Complete Testing Workflow

### Test Scenario 1: Builder Approval Flow

#### 1A. View Pending Visits (Builder Dashboard)
```
Route: /dashboard/builder/visits
Expected: Should show 2 pending visit cards
```

**What to verify:**
- ✅ Card shows property name
- ✅ Visitor name and contact
- ✅ Visit date and time
- ✅ Travel mode (Self/Pickup)
- ✅ Special requests displayed
- ✅ "Approve" and "Decline" buttons visible

#### 1B. Approve a Visit
1. Click **"Approve"** on first visit
2. Optionally add notes: "Approved, please arrive 10 mins early"
3. Click **"Confirm Approval"**

**Expected Results:**
- ✅ Green toast: "Visit approved successfully!"
- ✅ Card disappears from list
- ✅ Database: status changes to `confirmed`
- ✅ WhatsApp notification sent (check logs)

#### 1C. Reject a Visit
1. Click **"Decline"** on second visit
2. Enter reason: "Property under maintenance"
3. Click **"Confirm Rejection"**

**Expected Results:**
- ✅ Toast: "Visit request declined"
- ✅ Card disappears
- ✅ Database: status = `builder_rejected`, rejection_reason populated

---

### Test Scenario 2: Buyer Visit Scheduling

#### 2A. Schedule New Visit
```
Route: /property/16
Click: "Schedule Visit" button
```

**Fill Form:**
- Date: Tomorrow
- Time: 3:00 PM
- Travel: "Pick me from location"
- Pickup Address: "Indiranagar Metro, Bangalore"
- Visitors: 2
- Requests: "Need wheelchair access"

**After Submit:**
```
Redirect: /visit/confirm/[booking-id]
Expected Status: "Pending Approval" (amber badge)
```

#### 2B. Verify Confirmation Page
**Must Show:**
- ✅ 6-digit OTP (e.g., "A1B2C3")
- ✅ QR Code image
- ✅ Booking ID (first 8 chars)
- ✅ Visit details (date, time, location)
- ✅ Message: "Your visit is pending builder approval"
- ✅ Buttons: "Track Live", "Share", "Manage Visits"

---

### Test Scenario 3: Live Tracking

#### 3A. Initial Map State (Before Agent Sharing)
```
Route: /visit/live/[booking-id]
```

**Expected:**
- ✅ Google Map centered on property
- ✅ Red marker at property location
- ✅ Left panel: property image, name, visit details
- ✅ Status: "Confirmed"
- ✅ Message: "Waiting for agent to start sharing location"

#### 3B. Agent Location Sharing
```
Route: /agent/location/[booking-id]
Must be logged in as agent
```

**Agent Actions:**
1. Click **"Share My Location"**
2. Browser prompts for location permission → Allow
3. See success toast: "Location sharing started"

**Expected:**
- ✅ Button changes to "Stop Sharing"
- ✅ Current location displayed on map
- ✅ Location updates every 30 seconds

#### 3C. Live Map Updates (Buyer View)
```
Refresh /visit/live/[booking-id]
```

**Expected:**
- ✅ Blue marker appears (agent location)
- ✅ Green marker appears (vehicle location, if pickup mode)
- ✅ Route line drawn between locations
- ✅ Distance calculation shown
- ✅ Real-time updates visible

---

### Test Scenario 4: Visit Verification (At Property Gate)

#### 4A. OTP Verification
```
Route: /visit/verify
```

1. Enter Booking ID (from confirmation page)
2. Enter 6-digit OTP code
3. Click **"Verify Visit"**

**Expected:**
- ✅ Success message: "Visit verified successfully!"
- ✅ Status changes from `confirmed` to `in_progress`
- ✅ Timestamp recorded
- ✅ WhatsApp notification sent

#### 4B. QR Code Scan (Alternative)
1. Use QR scanner app on phone
2. Scan QR code from confirmation page
3. Opens: `/visit/verify?booking=[id]&otp=[code]`
4. Auto-fills and verifies

---

### Test Scenario 5: Visit Management

#### 5A. View All Visits
```
Route: /visit/manage
```

**Expected List:**
- ✅ All user's bookings (past & upcoming)
- ✅ Each card shows:
  - Property thumbnail
  - Visit date/time
  - Status badge with correct color
  - Agent & vehicle info (if assigned)
- ✅ Filter options: Upcoming / Past / Cancelled
- ✅ "View Details" button per card

#### 5B. Visit Status Colors
- 🟨 **Pending Approval** = amber/yellow
- 🟢 **Confirmed** = green
- 🔵 **In Progress** = blue
- ✅ **Completed** = emerald
- 🔴 **Rejected** = red
- ⚪ **Cancelled** = gray

---

## 🗺️ Route Reference

| Route | Purpose | Access |
|-------|---------|--------|
| `/property/:id` | Property detail + Schedule button | Public |
| `/visit/schedule/:propertyId` | Scheduling wizard form | Public |
| `/visit/confirm/:bookingId` | Booking confirmation with OTP/QR | Public |
| `/visit/manage` | User's all bookings | Any user |
| `/visit/live/:bookingId` | Live tracking map | Public |
| `/visit/verify` | OTP/QR verification at gate | Public |
| `/agent/location/:bookingId` | Agent location sharing | Agent only |
| `/dashboard/builder/visits` | Pending approvals dashboard | Builder only |

---

## 📊 Database Status Flow

```
1. User schedules visit
   ↓
   status: "builder_pending"
   
2. Builder approves
   ↓
   status: "confirmed"
   
3. Guard verifies OTP at gate
   ↓
   status: "in_progress"
   
4. Visit completes
   ↓
   status: "completed"

Alternative flows:
- Builder rejects → "builder_rejected"
- User cancels → "cancelled"
```

---

## 🔍 Debugging Checklist

### If no pending visits show:
```sql
-- Check if any visits exist with builder_pending status
SELECT COUNT(*) FROM visit_bookings WHERE status = 'builder_pending';

-- Check if properties have builder_id assigned
SELECT COUNT(*) FROM properties WHERE builder_id IS NOT NULL;

-- Check specific booking
SELECT * FROM visit_bookings WHERE id = 'your-booking-id';
```

### If map doesn't load:
- Check GOOGLE_MAPS_API_KEY in Supabase secrets
- Check browser console for API errors
- Verify property has lat/lng coordinates

### If WhatsApp doesn't send:
- Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER in secrets
- Check whatsapp_logs table for error messages
- Verify phone numbers in E.164 format (+91XXXXXXXXXX)

---

## 🎨 UI Components Reference

### Key Pages:
1. **BuilderVisitsDashboard** (`/dashboard/builder/visits`)
   - Lists pending visits
   - Approve/Reject actions
   - Builder notes field

2. **LiveVisitTracking** (`/visit/live/:id`)
   - Google Maps integration
   - Real-time location markers
   - Route visualization

3. **VisitConfirm** (`/visit/confirm/:id`)
   - OTP display
   - QR code generation
   - Status badges
   - Action buttons

4. **VisitVerify** (`/visit/verify`)
   - OTP input form
   - Booking ID input
   - Verification logic

5. **AgentLocationSharing** (`/agent/location/:id`)
   - Browser geolocation API
   - Location update loop
   - Stop/Start controls

---

## 🚀 Quick Test Commands

### Create Test Data (SQL)
```sql
-- Run this in Supabase SQL Editor
\i COMPLETE_VISIT_SYSTEM_SETUP.md  -- See Step 1 & 2 above
```

### Test All Routes (Browser)
```bash
# Open these URLs in sequence:
http://localhost:5173/property/16
http://localhost:5173/dashboard/builder/visits
http://localhost:5173/visit/confirm/[use-real-id]
http://localhost:5173/visit/live/[use-real-id]
http://localhost:5173/visit/verify
http://localhost:5173/agent/location/[use-real-id]
http://localhost:5173/visit/manage
```

---

## ✅ Success Criteria

A fully working system should:
- [ ] Properties have builder_id assigned
- [ ] New visits created with status=builder_pending
- [ ] Builder dashboard shows pending cards
- [ ] Approval changes status to confirmed
- [ ] Confirmation page shows OTP + QR code
- [ ] Live tracking displays map with markers
- [ ] Agent can share location (browser geolocation works)
- [ ] OTP verification works at gate
- [ ] Visit status progresses through flow
- [ ] WhatsApp logs show sent messages
- [ ] All routes accessible without auth (for testing)

---

## 🆘 Common Issues & Fixes

### Issue: "No pending visit requests"
**Fix:** Run the INSERT SQL queries from Step 2 above to create test data

### Issue: Map doesn't load
**Fix:** Check GOOGLE_MAPS_API_KEY is set in Supabase Edge Function secrets

### Issue: Location sharing fails
**Fix:** Must use HTTPS or localhost (browser security). Enable location permissions.

### Issue: WhatsApp not sending
**Fix:** Verify Twilio credentials and phone number format (+country code)

---

## 📞 Support Resources

- [Supabase Dashboard](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc)
- [Edge Function Logs](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/functions)
- [Database Tables](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/editor)
- [Storage Buckets](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/storage/buckets)

---

**Happy Testing! 🎉**
