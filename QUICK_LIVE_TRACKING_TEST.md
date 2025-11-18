# 🚀 Quick Live Tracking Test Guide

## Test in 5 Minutes!

### Step 1: Book a Visit (Buyer)
1. Go to any property page
2. Click "Book Site Visit"
3. Fill form and submit
4. Note the booking ID

### Step 2: Approve Visit (Builder)
1. Go to `/dashboard/visits`
2. Find your pending request
3. Click "Approve Visit"
4. Submit approval
5. WhatsApp link sent automatically ✓

### Step 3: Start Tracking (Agent)
1. Go to `/agent/visits`
2. Click "Start Location Sharing"
3. Allow browser location
4. Click "Start Sharing Location"
5. Your location updates every 5 seconds ✓

### Step 4: Watch Live (Buyer)
1. Go to `/visit/live/{bookingId}`
2. See green marker = Property
3. See blue marker = Agent (moving!)
4. Map updates in real-time ✓

### Step 5: Complete & Rate
1. Agent clicks "Complete Visit"
2. Buyer sees "Rate Visit" button
3. Fill ratings & upload photos
4. Submit feedback ✓

### Step 6: View Results (Builder)
1. Go to `/dashboard/visits`
2. Click "Completed" tab
3. See all ratings, comments & photos ✓

---

## Key URLs

| Who | URL | What |
|-----|-----|------|
| **Buyer** | `/visit/live/{id}` | Track agent live |
| **Agent** | `/agent/location/{id}` | Share location |
| **Builder** | `/dashboard/visits` | Manage & view feedback |

---

## How It Works

```
Buyer Books → Builder Approves → WhatsApp Sent
      ↓
Agent Shares Location (GPS)
      ↓
Updates Database Every 5s
      ↓
Buyer Sees Live on Map (Realtime)
      ↓
Visit Completed → Feedback Submitted
      ↓
Builder Views Ratings & Photos
```

---

## Database Quick Check

```sql
-- See current location
SELECT agent_location, status FROM visit_bookings 
WHERE id = 'YOUR_ID';

-- See location history
SELECT * FROM visit_locations 
WHERE booking_id = 'YOUR_ID' 
ORDER BY created_at DESC;

-- See feedback
SELECT * FROM visit_feedback 
WHERE booking_id = 'YOUR_ID';
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Map blank | Check Mapbox token in `.env` |
| Location not updating | Agent must click "Start Sharing" |
| No WhatsApp | Check Twilio credentials |
| Photos not uploading | Max 5MB per image, 5 total |

---

**Full Documentation**: See `LIVE_TRACKING_TESTING_GUIDE.md`
