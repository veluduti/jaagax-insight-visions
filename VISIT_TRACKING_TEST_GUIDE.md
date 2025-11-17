# Visit Scheduling & Live Tracking - Step-by-Step Test Guide

## Quick Start Test Path
Follow these steps in order to test the complete visit scheduling system with WhatsApp notifications and live tracking.

---

## 🎬 Step 1: Schedule a Visit (As Buyer)

### 1.1 Navigate to Property
1. Go to home page: `/`
2. Click on any featured property card
3. You'll land on `/property/[propertyId]`

### 1.2 Open Visit Scheduling
1. Look for the **"Schedule Visit"** button (usually in the property actions section)
2. Click it to open the Visit Scheduling Wizard modal

### 1.3 Fill Visit Details
1. **Select Date**: Choose a future date from the calendar
2. **Select Time**: Pick a time slot (9 AM - 6 PM available)
3. **Travel Mode**: Choose one:
   - "I'll come myself" - you drive yourself
   - "Pick me from location" - need pickup service
4. **If pickup selected**: Enter your pickup address
5. **Number of Visitors**: Enter count (1-10)
6. **Special Requests**: Add any notes (optional)
7. Click **"Confirm Booking"**

### 1.4 Check Confirmation Page
✅ **You should be redirected to**: `/visit/confirm/[bookingId]`

**Verify this page shows:**
- ✅ Header: "Visit Confirmed!"
- ✅ Status Badge: **"Pending Approval"** (amber/yellow color)
- ✅ Booking ID (first 8 characters displayed)
- ✅ Visit date and time
- ✅ Pickup location (if you selected pickup)
- ✅ **6-digit OTP code** (e.g., "ABC123")
- ✅ **QR Code** image
- ✅ Message: "Your visit is pending builder approval"
- ✅ Buttons: "Track Live", "Share", "Manage Visits"

**Important**: Copy the **Booking ID** and **OTP code** - you'll need them later!

---

## 🏗️ Step 2: Builder Approves Visit (As Builder)

### 2.1 Access Builder Dashboard
1. Navigate to: `/dashboard/builder/visits`
2. You must be logged in with a builder account
   - *If you're not a builder, you can use admin account or create a builder role*

### 2.2 View Pending Requests
**You should see:**
- ✅ List of visit cards with status "Pending Approval"
- ✅ Each card shows:
  - Property name
  - Visitor name
  - Visit date and time
  - Travel mode (Self/Pickup)
  - Number of visitors
  - Any special requests

### 2.3 Approve the Visit
1. Find your booking in the list
2. Click **"Approve"** button (green)
3. Optionally add approval notes in the text field
4. Click **"Confirm Approval"**

✅ **Success indicators:**
- Green toast: "Visit approved successfully"
- The visit card disappears from the pending list
- Status changes from "builder_pending" to "confirmed"

**Alternative: Test Rejection**
- Click **"Decline"** button instead
- Enter a rejection reason (required)
- Click "Confirm Rejection"
- Visit status becomes "builder_rejected"

---

## ✅ Step 3: Check Updated Status (As Buyer)

### 3.1 Go to Visit Management
1. Navigate to: `/visit/manage`

**You should see:**
- ✅ All your bookings listed
- ✅ Your approved booking now shows **"Confirmed"** badge (green)
- ✅ Agent details are visible (if assigned)
- ✅ Vehicle details (if assigned)

### 3.2 Revisit Confirmation Page
1. Go back to: `/visit/confirm/[bookingId]` (use your booking ID)

**Verify changes:**
- ✅ Status badge now shows **"Confirmed"** (green)
- ✅ Agent card shows agent photo, name, agency
- ✅ Vehicle card shows model, driver name, driver phone (if pickup selected)
- ✅ OTP and QR code still visible
- ✅ No more "pending approval" message

---

## 🗺️ Step 4: Open Live Tracking (As Buyer)

### 4.1 Navigate to Tracking
From the confirmation page, click **"Track Live"** button
- Or go directly to: `/visit/live/[bookingId]`

### 4.2 Verify Initial Map State
**You should see:**
- ✅ Google Map loaded (centered on property)
- ✅ **Red marker**: Property location
- ✅ Left panel showing:
  - Property image and name
  - Visit date and time
  - Status badge: "Confirmed"
  - Agent photo and name
  - Travel mode
  - OTP code displayed
  - QR code preview
- ✅ Message: "Waiting for agent to share location"

**Note**: Agent marker won't appear yet until agent shares location

---

## 📍 Step 5: Agent Shares Location (As Agent)

### 5.1 Agent Opens Location Sharing Page
1. Navigate to: `/visit/agent/location/[bookingId]`
2. Must be logged in as the assigned agent for this booking

**Security Check:**
- If you're not the assigned agent, you'll see: "You are not authorized"

### 5.2 Verify Agent Page
**You should see:**
- ✅ Map pin icon at top
- ✅ Header: "Location Sharing"
- ✅ Status badge showing current visit status
- ✅ Property details card:
  - Property name
  - Location (locality, city)
  - Visit date and time
  - Visitor name
- ✅ Large **"Share My Location"** button

### 5.3 Share Location
1. Click **"Share My Location"** button
2. Browser will ask for location permission - **Click "Allow"**
3. Wait 1-2 seconds for GPS to acquire location

✅ **Success indicators:**
- Green toast: "Location shared successfully!"
- Timestamp appears: "Last updated: 12:30:45 PM"
- Tip message shows below button

### 5.4 Simulate Movement
**To test real-time tracking:**
1. Wait 10-15 seconds
2. Click "Share My Location" again
3. Repeat 3-4 times to simulate agent moving toward property

**Pro Tip**: If testing on desktop, you can use Chrome DevTools to simulate different GPS coordinates:
- Press F12
- Click "..." menu → More tools → Sensors
- Override Geolocation with custom lat/lng

---

## 🔄 Step 6: Watch Real-Time Updates (As Buyer)

### 6.1 Keep Live Tracking Page Open
Go back to your live tracking page: `/visit/live/[bookingId]`

### 6.2 Watch Magic Happen 🎯
**Without refreshing the page, you should see:**
- ✅ **Blue marker** appears on map (agent's location)
- ✅ Blue marker moves in real-time as agent shares location
- ✅ Agent's last update time shows
- ✅ Map may draw a path line between agent and property
- ✅ Status updates automatically

**This uses Supabase Realtime!** No page refresh needed.

### 6.3 Test Realtime Update Delay
- When agent clicks "Share Location"
- Watch your map - agent marker should update within 1-2 seconds
- This proves real-time functionality is working

---

## 🔐 Step 7: Verify Visit at Gate (As Security)

### 7.1 Open Verification Page
1. Navigate to: `/visit/verify`
2. This is used by property gate security or reception

**You should see:**
- ✅ Shield icon at top
- ✅ Header: "Verify Visit"
- ✅ Two input fields: Booking ID and OTP Code
- ✅ "Verify & Start Visit" button

### 7.2 Enter Details
1. **Booking ID**: Enter the booking ID from Step 1.4
   - Format: full UUID like "5769901b-53cc-4107-a2ba-5020e0757783"
2. **OTP Code**: Enter the 6-digit code (e.g., "ABC123")
3. Click **"Verify & Start Visit"**

### 7.3 Successful Verification ✅
**If valid:**
- ✅ Shield icon changes to green checkmark
- ✅ Success toast: "Visit verified successfully! Visit started."
- ✅ Page shows "Visit Verified!" message
- ✅ Auto-redirects to live tracking in 2 seconds
- ✅ Status changes to **"in_progress"**

### 7.4 Failed Verification ❌
**If invalid OTP or Booking ID:**
- ❌ Red toast: "Invalid OTP or Booking ID"
- ❌ Form stays visible for retry
- ❌ Status remains unchanged

---

## 📊 Step 8: Check In-Progress Status

### 8.1 Live Tracking Page
Return to: `/visit/live/[bookingId]`

**Verify:**
- ✅ Status badge now shows **"Visit In Progress"** (green/blue)
- ✅ Map still shows both markers
- ✅ Agent can continue sharing location during visit

### 8.2 Visit Management Page
Go to: `/visit/manage`

**Verify:**
- ✅ Visit shows "In Progress" status
- ✅ Can still access live tracking
- ✅ Can view all visit details

---

## 💬 Step 9: Check WhatsApp Notifications

**Throughout the process, check your WhatsApp for these messages:**

### Expected WhatsApp Messages:

1. **After Step 1** (User books):
   - ✅ "Visit Request Received" message to user
   - ✅ Includes property name, date, time
   - ✅ Link to track visit

2. **After Step 2** (Builder approves):
   - ✅ "Visit Approved!" message to user
   - ✅ Agent details included
   - ✅ Reminder to save OTP/QR code

3. **After Step 7** (Visit verified):
   - ✅ "Visit Started!" message to user
   - ✅ Confirmation that agent has arrived

**Note**: You need to configure Twilio secrets for WhatsApp to work:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`

---

## 🔍 Database Verification (Optional)

### Check visit_bookings Table
1. Go to Supabase Dashboard
2. Navigate to: Database → Tables → visit_bookings
3. Find your booking row

**Verify these columns:**
- ✅ `status` changed: `builder_pending` → `confirmed` → `in_progress`
- ✅ `otp_code` contains 6-character string
- ✅ `qr_code_url` has Storage URL
- ✅ `agent_location` shows JSON: `{"lat": 17.xx, "lng": 78.xx, "updated_at": "..."}`
- ✅ `vehicle_location` (if pickup mode selected)
- ✅ `builder_id` is set
- ✅ `builder_notes` (if approval notes added)

### Check visit_locations Table
- ✅ Shows history of all location updates
- ✅ Each row has: booking_id, lat, lng, location_type, created_at

### Check whatsapp_logs Table
- ✅ Shows all WhatsApp send attempts
- ✅ Columns: to_number, message, status (sent/failed), created_at
- ✅ Can debug any WhatsApp delivery issues

---

## 🎭 Complete Workflow Summary

```
USER                    BUILDER                 AGENT                   SYSTEM
  |                        |                       |                       |
  |--Schedule Visit------->|                       |                       |
  |                        |                       |                   [Status: builder_pending]
  |                        |                       |                   [Generate OTP & QR]
  |                        |<--Approval Request----|                       |
  |                        |                       |                       |
  |<---Pending Status------|                       |                       |
  |                        |---Approve------------>|                       |
  |                        |                       |                   [Status: confirmed]
  |<---Approved Notif------|                       |                       |
  |                        |                       |<--Assigned Notif------|
  |                        |                       |                       |
  |--Open Live Tracking--->|                       |                       |
  |<---See Property Map----|                       |                       |
  |                        |                       |                       |
  |                        |                       |--Share Location------>|
  |<---See Agent Marker----|                       |                   [Update agent_location]
  |   (Real-time!)         |                       |                   [Broadcast via Realtime]
  |                        |                       |                       |
  |--Arrive at Gate------->|                       |                       |
SECURITY                   |                       |                       |
  |--Enter OTP & Verify--->|                       |                       |
  |                        |                       |                   [Verify OTP]
  |                        |                       |                   [Status: in_progress]
  |<---Visit Started-------|                       |                       |
USER                       |                       |                       |
  |<---Visit Started Notif-|                       |                       |
  |                        |                       |                       |
  |--Complete Visit------->|                       |                       |
  |                        |                       |                   [Status: completed]
```

---

## ✅ Success Checklist

After completing all steps, you should have tested:

- [x] Visit scheduling with date/time selection
- [x] OTP and QR code generation
- [x] Builder approval workflow
- [x] Status updates (pending → confirmed → in_progress)
- [x] Agent location sharing
- [x] Real-time map updates (no refresh needed!)
- [x] OTP/QR verification at gate
- [x] WhatsApp notifications (if configured)
- [x] Database records and location history
- [x] Complete visit lifecycle

---

## 🚨 Troubleshooting

### Map Not Loading
- **Issue**: Blank map or error
- **Fix**: Check `GOOGLE_MAPS_API_KEY` in Secrets
- **Verify**: Key has Maps JavaScript API enabled in Google Cloud Console

### Agent Marker Not Appearing
- **Issue**: Blue marker doesn't show
- **Fix**: Agent must click "Share My Location" first
- **Check**: Browser console for geolocation errors
- **Note**: Browser needs location permission

### Real-Time Not Working
- **Issue**: Marker doesn't update without refresh
- **Fix**: Check Supabase Realtime is enabled
- **Verify**: Browser console shows no WebSocket errors
- **Debug**: Check Network tab for `realtime` connection

### OTP Verification Fails
- **Issue**: "Invalid OTP" error
- **Check**: OTP is correct (case-sensitive)
- **Check**: Booking ID is the full UUID
- **Check**: Visit status is "confirmed" (not pending or other)

### WhatsApp Not Sending
- **Issue**: No WhatsApp messages received
- **Fix**: Verify Twilio secrets are configured
- **Check**: `whatsapp_logs` table for error messages
- **Note**: Twilio WhatsApp requires sandbox approval for test numbers

### Location Updates Slow
- **Issue**: Marker takes long to update
- **Check**: Internet connection speed
- **Note**: GPS accuracy varies by device/location
- **Try**: Move to outdoor location for better GPS signal

---

## 📱 Mobile Testing Tips

1. **Best tested on real mobile device** for location sharing
2. **Use Chrome on Android** or **Safari on iOS** for geolocation
3. **Grant location permissions** when prompted
4. **Keep screen on** while testing real-time updates
5. **Use cellular data** if WiFi has poor GPS

---

## 🎯 Next Steps

After successful testing:
1. Configure Twilio for production WhatsApp
2. Set up Google Maps API billing
3. Test with multiple concurrent visits
4. Test error scenarios (network failures, etc.)
5. Monitor edge function logs for any issues
6. Set up alerts for failed notifications

---

**Need Help?** Check the main project README or WhatsApp tracking documentation for more details.
