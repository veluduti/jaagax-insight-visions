# 🚀 Complete Visit Tracking System Guide

## ✅ What Was Fixed

1. **Live Tracking Page** (`/visit/live/{bookingId}`)
   - Switched from Google Maps to Mapbox for map display
   - Fixed agent location display on the map
   - Added real-time updates via Supabase realtime subscriptions
   - Map now shows:
     - 🏠 **Green marker**: Property location (destination)
     - 🔵 **Blue marker**: Agent's current location
     - 🟡 **Yellow marker**: Vehicle location (if applicable)

2. **Agent Location Sharing** (`/agent/location/{bookingId}`)
   - Agents can share their GPS location
   - Updates are sent to the backend via the `update-location` edge function
   - Location is stored in `visit_bookings.agent_location`

## 📋 Complete Workflow

### For Buyers (Property Visitors)

#### Step 1: Book a Visit
```
Navigate to property → Click "Schedule Visit" → Fill details → Submit
```

#### Step 2: Wait for Builder Approval
- Visit status: `pending_approval`
- Builder receives notification
- Check status at: `/visit/manage`

#### Step 3: Visit Approved ✅
- Builder approves at: `/dashboard/builder/visits`
- Status changes to: `confirmed`
- You receive WhatsApp notification (if Twilio configured)

#### Step 4: Track Your Visit Live 🗺️
- **Link**: `https://jaagax.com/visit/live/{bookingId}`
- You can see:
  - Agent's live location (blue marker)
  - Property location (green marker)
  - Real-time updates as agent moves

#### Step 5: Visit Day
- Agent starts the visit
- Status changes to: `in_progress`
- Continue tracking on the live page

#### Step 6: After Visit
- Agent completes visit
- Status: `completed`
- View summary at: `/visit/summary/{bookingId}`

---

### For Agents

#### Step 1: View Assigned Visits
- **Dashboard**: `/dashboard/agent/visits`
- See all your upcoming visits
- Filter by: `confirmed`, `in_progress`, `completed`

#### Step 2: When Visit Day Arrives

##### Option A: Start Visit & Share Location
```
1. Go to Agent Dashboard: /dashboard/agent/visits
2. Find your confirmed visit
3. Click "Start Visit" button
4. You'll be taken to: /agent/location/{bookingId}
5. Click "Share My Location" button
6. Allow GPS access when prompted
7. Your location will be updated and visible to the buyer
```

##### Option B: Direct Link
```
Navigate to: /agent/location/{bookingId}
Click "Share My Location" button
```

#### Step 3: Update Location During Visit
- Keep clicking "Share My Location" every few minutes
- Each click updates your position on the buyer's map
- The buyer sees your location in real-time

#### Step 4: Track Live Yourself
- Click "Track Live" to see the full map view
- Link: `/visit/live/{bookingId}`
- See your location relative to the property

#### Step 5: Complete the Visit
- Click "Complete Visit" when done
- Status changes to: `completed`
- Optionally add visit summary

---

### For Builders

#### Step 1: Review Visit Requests
- **Dashboard**: `/dashboard/builder/visits`
- See all `pending_approval` visits for your properties

#### Step 2: Approve or Decline
```
1. Click on a pending visit
2. Review visitor details
3. Options:
   - Click "Approve" → Add optional notes → Confirm
   - Click "Decline" → Add reason → Confirm
```

#### Step 3: Track Approved Visits
- Monitor all your property visits
- See visit statuses in real-time

---

## 🔗 Key URLs

### Live Tracking
```
https://jaagax.com/visit/live/{bookingId}
```
- Works for anyone (no login required)
- Shows real-time agent location
- Updates automatically via websockets

### Agent Location Sharing
```
https://jaagax.com/agent/location/{bookingId}
```
- Requires agent to be logged in
- Verifies agent is assigned to this visit
- Allows GPS location sharing

### Agent Dashboard
```
https://jaagax.com/dashboard/agent/visits
```
- All visits assigned to logged-in agent
- Actions: Start Visit, Track Live, Share Story, Complete

### Builder Dashboard
```
https://jaagax.com/dashboard/builder/visits
```
- All visits for builder's properties
- Approve/Decline functionality

### Buyer Dashboard
```
https://jaagax.com/visit/manage
```
- All visits booked by logged-in buyer
- View details, track live, cancel

---

## 🧪 Testing the System

### Test Scenario 1: Book and Track a Visit

1. **As Buyer:**
   ```
   - Login as buyer
   - Go to any property page
   - Click "Schedule Visit"
   - Fill form and submit
   - Note down the booking ID from URL
   ```

2. **As Builder:**
   ```
   - Login as builder
   - Go to /dashboard/builder/visits
   - Find the pending visit
   - Click "Approve"
   - Confirm approval
   ```

3. **As Agent:**
   ```
   - Login as agent
   - Go to /dashboard/agent/visits
   - Find the confirmed visit
   - Click "Start Visit"
   - On location sharing page, click "Share My Location"
   - Allow GPS access
   - Wait for confirmation toast
   ```

4. **As Buyer (Track Live):**
   ```
   - Go to: /visit/live/{bookingId}
   - You should see:
     ✅ Property marker (green)
     ✅ Agent marker (blue) - if agent shared location
     ✅ Real-time updates
   ```

### Test Scenario 2: Update Agent Location

1. **Agent shares location multiple times:**
   ```
   - On /agent/location/{bookingId}
   - Click "Share My Location" button 3-4 times
   - Each time you'll see: "Last updated: {time}"
   ```

2. **Buyer sees updates:**
   ```
   - On /visit/live/{bookingId}
   - The blue agent marker updates automatically
   - Map adjusts to show both property and agent
   ```

---

## 🛠️ Status Flow

```
pending_approval  →  confirmed  →  in_progress  →  completed
       ↓                              ↓
builder_rejected              cancelled
```

### Status Meanings:
- **pending_approval**: Waiting for builder to approve/reject
- **confirmed**: Builder approved, visit scheduled
- **in_progress**: Agent started the visit
- **completed**: Visit finished
- **builder_rejected**: Builder declined the request
- **cancelled**: Buyer or agent cancelled

---

## 📱 Real-time Updates

The system uses **Supabase Realtime** for live updates:

```typescript
// Subscribes to changes in visit_bookings table
supabase.channel('visit-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    table: 'visit_bookings',
    filter: `id=eq.${bookingId}`
  }, callback)
  .subscribe()
```

**What updates automatically:**
- ✅ Agent location changes
- ✅ Status changes
- ✅ Vehicle location (if tracked)
- ✅ Visit details

---

## 🗺️ Map Features

### Mapbox Integration
- Token: Pre-configured in system
- Style: Dark theme for better visibility
- Controls: Zoom, rotate, navigation

### Marker Colors:
- 🟢 **Green**: Property/Destination
- 🔵 **Blue**: Agent Location
- 🟡 **Yellow**: Vehicle Location

### Interactive:
- Click markers for popups
- Shows last update time
- Auto-fits bounds to show all markers

---

## 🔐 Security

### Authentication Checks:
1. **Agent Location Sharing**: Only assigned agent can update
2. **Builder Approval**: Only builder's properties
3. **Edge Functions**: All use service role key for security

### Location Privacy:
- Only shared when agent explicitly clicks button
- Stored with timestamps
- History maintained in `visit_locations` table

---

## 📊 Database Structure

### Main Table: `visit_bookings`
```sql
{
  id: uuid
  status: text (pending_approval, confirmed, in_progress, completed)
  agent_location: jsonb { lat, lng, updated_at }
  vehicle_location: jsonb { lat, lng, updated_at }
  property_id: integer
  agent_id: integer
  user_id: uuid
  visit_date: date
  visit_time: time
}
```

### History Table: `visit_locations`
```sql
{
  id: uuid
  booking_id: uuid
  location_type: text (agent/vehicle)
  lat: number
  lng: number
  created_at: timestamp
}
```

---

## 🚨 Troubleshooting

### Issue: Map not showing
**Solution:**
- Check browser console for errors
- Verify Mapbox token is loaded
- Check if property has lat/lng coordinates

### Issue: Agent location not updating
**Solution:**
- Verify agent allowed GPS access
- Check browser location permissions
- Look at network tab for failed API calls
- Check edge function logs: `/dashboard/admin` → Edge Functions

### Issue: Buyer can't see agent location
**Solution:**
- Verify agent clicked "Share My Location"
- Check `visit_bookings.agent_location` in database
- Confirm realtime subscription is active (check console)

### Issue: Live page shows "Visit not found"
**Solution:**
- Verify booking ID is correct
- Check if visit exists in database
- Ensure properties relationship is loaded

---

## 🎯 Next Steps

### What to do now:

1. **Test the complete flow:**
   - Book a visit as buyer
   - Approve as builder
   - Share location as agent
   - Track on buyer side

2. **Check Agent Dashboard:**
   ```
   Go to: /dashboard/agent/visits
   - See all your visits
   - Test "Start Visit" button
   - Test "Track Live" button
   ```

3. **Monitor in Real-time:**
   ```
   - Open /visit/live/{bookingId} in one browser
   - Open /agent/location/{bookingId} in another
   - Click "Share My Location"
   - Watch the map update in first browser
   ```

4. **Status Management:**
   - Start visit → status becomes `in_progress`
   - Complete visit → status becomes `completed`
   - Check status flow works correctly

---

## 💡 Pro Tips

### For Agents:
- Share location every 2-3 minutes for best tracking
- Enable high-accuracy GPS in phone settings
- Keep the location sharing page open during visit

### For Buyers:
- Keep the live tracking page open
- Map updates automatically - no need to refresh
- Click markers to see last update time

### For Builders:
- Approve visits promptly
- Add notes when approving for context
- Monitor all visits in your dashboard

---

## 📞 Support

If you need help:
1. Check browser console for errors
2. Verify GPS permissions are enabled
3. Check edge function logs in admin dashboard
4. Ensure Twilio is configured for WhatsApp notifications

---

## ✨ Features Implemented

✅ Live map tracking with Mapbox
✅ Real-time location updates
✅ Agent location sharing
✅ Builder approval workflow
✅ Multiple status management
✅ WhatsApp notifications (when configured)
✅ Visit history tracking
✅ Mobile-responsive design
✅ Secure authentication
✅ Real-time subscriptions

---

**Your visit tracking system is ready to use! 🎉**
