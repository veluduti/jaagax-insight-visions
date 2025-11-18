# Live Visit Tracking System - Complete Testing & Flow Guide

## 🎯 System Overview

The live tracking system enables **real-time monitoring** of property visits with agent location tracking, automatic WhatsApp notifications, and feedback collection.

---

## 📋 Complete Visit Flow

### 1️⃣ **Buyer Books a Visit**
- **Page**: Property Detail Page → "Book Site Visit" button
- **Action**: Buyer fills visit booking form
  - Property selection
  - Date & Time
  - Travel mode (Self/Vehicle)
  - Pickup location (if vehicle needed)
- **Database**: Record created in `visit_bookings` with status `pending_approval`

### 2️⃣ **Builder Reviews Request**
- **Page**: Builder Dashboard (`/dashboard/visits`)
- **View**: All pending visit requests
- **Actions**:
  - ✅ **Approve**: Set notes, assign agent/vehicle
  - ❌ **Reject**: Provide rejection reason
- **Trigger**: WhatsApp notification sent automatically on confirmation

### 3️⃣ **Agent Receives Assignment**
- **Page**: Agent Dashboard (`/agent/visits`)
- **View**: All assigned visits
- **Action**: Click "Start Location Sharing" button
- **Redirects to**: `/agent/location/{bookingId}`

### 4️⃣ **Live Tracking Begins**
- **Agent Page**: `/agent/location/{bookingId}`
  - Agent enables GPS location sharing
  - Location updates every 5 seconds to database
  - Updates `agent_location` field in `visit_bookings`
  
- **Buyer Tracking Page**: `/visit/live/{bookingId}`
  - Real-time map shows agent movement
  - Updates automatically via Supabase Realtime
  - Shows property marker (green), agent marker (blue), vehicle marker (amber)

### 5️⃣ **Visit Completion**
- **Action**: Agent marks visit as completed
- **Status**: Changes to `completed`
- **Trigger**: Feedback modal appears for buyer

### 6️⃣ **Feedback Collection**
- **Page**: Live tracking page (after completion)
- **Feedback includes**:
  - Overall rating (1-5 stars)
  - Agent rating
  - Property rating
  - Service rating
  - Written feedback
  - Photo uploads (up to 5 images)
- **Storage**: Photos stored in `visit-feedback-photos` bucket
- **Database**: Feedback saved to `visit_feedback` table

### 7️⃣ **Builder Views Feedback**
- **Page**: Builder Dashboard - Visits tab
- **View**: All completed visits with ratings
- **Data shown**:
  - Visit details
  - All ratings
  - User comments
  - Photo gallery
  - Visit summary link

---

## 🧪 Testing Guide - Step by Step

### **Prerequisites**
1. Mapbox token configured in environment (`.env`)
2. WhatsApp/Twilio credentials added (for notifications)
3. At least one property in database
4. At least one agent assigned

### **Test Scenario 1: Complete Visit Flow**

#### Step 1: Create a Visit Booking
```
1. Navigate to any property detail page
2. Click "Book Site Visit" button
3. Fill the form:
   - Select date: Tomorrow
   - Select time: 12:00 PM
   - Travel mode: "Vehicle Needed"
   - Add pickup location
4. Submit booking
5. Note the booking ID from URL or database
```

#### Step 2: Approve as Builder
```
1. Navigate to /dashboard/visits
2. Find the pending visit request
3. Click "Approve" button
4. Add notes: "Welcome! Looking forward to showing you the property"
5. Assign an agent (if not auto-assigned)
6. Confirm approval
7. Check WhatsApp log in database (should show message queued)
```

#### Step 3: Start Location Sharing (Agent)
```
1. Navigate to /agent/visits
2. Find the confirmed visit
3. Click "Start Location Sharing"
4. On location page (/agent/location/{bookingId}):
   - Allow browser location permission
   - Click "Start Sharing Location"
   - Move around (or use browser dev tools to simulate movement)
   - Location should update every 5 seconds
```

#### Step 4: Track Live (Buyer)
```
1. Navigate to /visit/live/{bookingId}
2. You should see:
   - Property marker (green pin)
   - Agent marker (blue dot) - moving in real-time
   - Map auto-updates without refresh
3. Open browser console to see realtime updates
4. Copy tracking link and open in another browser/device
```

#### Step 5: Complete Visit & Add Feedback
```
1. As agent, click "Complete Visit" button
2. As buyer, on tracking page:
   - "Rate Visit" button appears
   - Click it to open feedback modal
3. Fill feedback form:
   - Rate overall experience: 5 stars
   - Rate agent: 5 stars
   - Rate property: 4 stars
   - Rate service: 5 stars
   - Add comment: "Excellent experience!"
   - Upload 2-3 photos
4. Submit feedback
5. Status changes to "completed"
```

#### Step 6: View Results (Builder)
```
1. Navigate to /dashboard/visits
2. Switch to "Completed" tab
3. Find the completed visit
4. View:
   - All ratings displayed
   - User feedback text
   - Photo thumbnails (click to view full)
   - Link to AI summary
```

### **Test Scenario 2: Real-time Updates**

#### Multi-Device Test:
```
1. Open agent location page on Device A (e.g., laptop)
2. Open buyer tracking page on Device B (e.g., phone)
3. Start location sharing on Device A
4. Watch real-time updates on Device B
5. Both maps should stay in sync
```

#### Database Verification:
```sql
-- Check location history
SELECT * FROM visit_locations 
WHERE booking_id = 'YOUR_BOOKING_ID'
ORDER BY created_at DESC;

-- Check current location in booking
SELECT agent_location, vehicle_location, status 
FROM visit_bookings 
WHERE id = 'YOUR_BOOKING_ID';

-- Check feedback
SELECT * FROM visit_feedback 
WHERE booking_id = 'YOUR_BOOKING_ID';
```

---

## 🗺️ How Live Tracking Works

### **Technology Stack**
- **Frontend**: React + Mapbox GL JS
- **Backend**: Supabase Realtime + Edge Functions
- **Location**: Browser Geolocation API
- **Storage**: Supabase Storage (for photos)

### **Data Flow**

```
Agent Browser (Geolocation API)
    ↓ (Every 5 seconds)
Edge Function: update-location
    ↓ (Updates database)
visit_bookings.agent_location
    ↓ (Supabase Realtime)
Buyer Browser (Auto-update)
    ↓ (Renders on map)
Live Tracking Page
```

### **Location Update Process**

1. **Agent Side**:
   ```javascript
   // Get current position
   navigator.geolocation.getCurrentPosition()
   
   // Send to edge function
   supabase.functions.invoke('update-location', {
     body: { bookingId, lat, lng, locationType: 'agent' }
   })
   ```

2. **Database Update**:
   ```sql
   -- Updates agent_location JSON field
   UPDATE visit_bookings 
   SET agent_location = '{"lat": 17.XX, "lng": 78.XX, "timestamp": "..."}'
   WHERE id = 'booking_id';
   
   -- Also stores in history
   INSERT INTO visit_locations (booking_id, lat, lng, location_type)
   VALUES ('booking_id', 17.XX, 78.XX, 'agent');
   ```

3. **Buyer Side**:
   ```javascript
   // Subscribe to realtime changes
   supabase.channel('visit-updates')
     .on('postgres_changes', {
       event: 'UPDATE',
       table: 'visit_bookings',
       filter: `id=eq.${bookingId}`
     }, (payload) => {
       // Update map markers automatically
       updateMapMarkers(payload.new)
     })
   ```

---

## 📍 Key Pages & URLs

| Role | Page | URL | Purpose |
|------|------|-----|---------|
| Buyer | Live Tracking | `/visit/live/{bookingId}` | Watch agent location in real-time |
| Buyer | Visit Analytics | `/visit/analytics` | View all completed visits & ratings |
| Buyer | Dashboard | `/dashboard` (Buyer role) | View "My Visits" tab with tracking links |
| Agent | Location Sharing | `/agent/location/{bookingId}` | Share GPS location during visit |
| Agent | Visits Dashboard | `/agent/visits` | View all assigned visits |
| Builder | Visits Management | `/dashboard/visits` | Approve/reject requests, view feedback |
| All | Visit Story | `/visit/story/{bookingId}` | Instagram-style visit updates |
| All | AI Summary | `/visit/summary/{bookingId}` | AI-generated visit insights |

---

## 🔍 Troubleshooting

### Map Not Loading
**Problem**: Blank map or "Map configuration error"
**Solution**: 
- Check `.env` file has `VITE_MAPBOX_PUBLIC_TOKEN`
- Verify token is valid at mapbox.com
- Check browser console for errors

### Location Not Updating
**Problem**: Agent location not appearing on buyer's map
**Solution**:
- Agent must click "Start Sharing Location"
- Check browser location permission is granted
- Verify visit status is `confirmed` or `in_progress`
- Check network tab for `update-location` API calls

### WhatsApp Not Sending
**Problem**: Tracking link not sent via WhatsApp
**Solution**:
- Verify Twilio credentials in Supabase secrets
- Check `whatsapp_logs` table for error messages
- Ensure phone numbers include country code (+91 for India)
- Check `visit_notifications` table for queued messages

### Photos Not Uploading
**Problem**: Feedback photos failing to upload
**Solution**:
- Check file size < 5MB per image
- Verify `visit-feedback-photos` storage bucket exists
- Check RLS policies allow authenticated uploads
- Ensure max 5 images per visit

---

## 📊 Database Tables Reference

### `visit_bookings`
- Stores all visit requests
- Fields: `agent_location`, `vehicle_location`, `status`, `completed_at`
- Status flow: `pending_approval` → `confirmed` → `in_progress` → `completed`

### `visit_locations`
- Historical location data
- Stores every location update for replay/analysis

### `visit_feedback`
- User ratings and comments
- Links to `photo_urls` array

### `visit_notifications`
- WhatsApp message queue
- Processed by edge function cron job

---

## 🚀 Quick Test Commands

### Check if visit exists:
```sql
SELECT id, status, agent_location, properties->>'title' as property
FROM visit_bookings 
WHERE id = 'YOUR_BOOKING_ID';
```

### Manually update location (for testing):
```sql
UPDATE visit_bookings 
SET agent_location = '{"lat": 17.3850, "lng": 78.4867, "timestamp": "2025-11-18T10:30:00Z"}'
WHERE id = 'YOUR_BOOKING_ID';
```

### View location history:
```sql
SELECT location_type, lat, lng, created_at 
FROM visit_locations 
WHERE booking_id = 'YOUR_BOOKING_ID'
ORDER BY created_at DESC;
```

### Check feedback:
```sql
SELECT rating, agent_rating, property_rating, feedback, photo_urls
FROM visit_feedback 
WHERE booking_id = 'YOUR_BOOKING_ID';
```

---

## 📞 Support & Documentation

- **Full Documentation**: See `VISIT_TRACKING_COMPLETE_GUIDE.md`
- **Routing Guide**: See `DASHBOARD_ROUTING_GUIDE.md`
- **WhatsApp Setup**: See `WHATSAPP_TESTING_QUICK_START.md`
- **System Architecture**: See `JAAGAX_IMPLEMENTATION_REPORT.md`

---

## ✅ Testing Checklist

- [ ] Buyer can book a visit
- [ ] Builder receives notification
- [ ] Builder can approve/reject
- [ ] WhatsApp notification sent on approval
- [ ] Agent can access location sharing page
- [ ] Location updates in real-time (< 10s delay)
- [ ] Buyer can track on live page
- [ ] Map shows all markers correctly
- [ ] Visit can be completed
- [ ] Feedback modal appears on completion
- [ ] Photos upload successfully
- [ ] Builder can view feedback & ratings
- [ ] All links work correctly across dashboards

---

**Last Updated**: November 2025
**System Version**: v2.0
