# 🚀 Complete Testing Guide: Visit Tracking & WhatsApp Notifications

## 📋 Prerequisites

### 1. WhatsApp Setup (Twilio)
**Required Secrets** (Add in Supabase Edge Function Secrets):
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token  
- `TWILIO_WHATSAPP_NUMBER` - Format: `whatsapp:+14155238886`

**Setup Steps:**
1. Sign up at https://www.twilio.com/
2. Get WhatsApp Sandbox number: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
3. Join sandbox by sending "join <code>" to the Twilio WhatsApp number
4. Copy credentials to Supabase secrets

### 2. Google Maps API Key
- Already configured in secrets: `GOOGLE_MAPS_API_KEY`
- Verify at: https://console.cloud.google.com/

---

## 🎯 Testing Flow (Step-by-Step)

### **STEP 1: Schedule a Visit** (As Buyer)
1. **Run Test Data** (if not already done):
   ```sql
   -- Open Supabase SQL Editor and run:
   -- Paste content from setup_test_data.sql
   ```

2. **Go to Builder Dashboard**:
   - Navigate to: `/dashboard/builder/visits`
   - You should see 5 pending visit requests

3. **Approve a Visit**:
   - Click "Approve" on any visit card
   - System auto-assigns agent and generates OTP
   - ✅ **WhatsApp #1 sent**: "Visit Approved!" to user

---

### **STEP 2: Check Confirmation Page**
1. **Navigate to Confirmation**:
   - Copy the booking ID from dashboard
   - Go to: `/visit/confirm/{bookingId}`

2. **Verify Details Shown**:
   - ✅ Visit date, time, status
   - ✅ QR Code
   - ✅ 6-digit OTP code
   - ✅ Agent details
   - ✅ "Track Live" button

---

### **STEP 3: Open Live Tracking** (As Buyer)
1. **Click "Track Live" button** or go to:
   - `/visit/live/{bookingId}`

2. **Map Should Show**:
   - 📍 Property location (blue marker)
   - 📊 Visit details sidebar (left)
   - 🗺️ Google Map (right)
   - ⚠️ Agent marker NOT visible yet (agent hasn't shared location)

---

### **STEP 4: Agent Shares Location** (As Agent)
1. **Navigate to Agent Location Sharing**:
   - Go to: `/agent/share-location/{bookingId}`
   - Or use URL parameter: `?bookingId={bookingId}`

2. **Click "Share My Location"**:
   - Browser will request location permission → **Allow**
   - Button changes to: "Sharing Location..."
   - Location updates every 30 seconds automatically

3. **Simulate Movement** (Testing):
   - Open browser DevTools → Console
   - Run this code to simulate movement:
   ```javascript
   // Simulate agent moving north
   let lat = 12.9756;
   let lng = 77.6073;
   setInterval(async () => {
     lat += 0.001; // Move north
     await fetch('https://smyypmthspsrvwydzsxc.supabase.co/functions/v1/update-location', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': 'Bearer YOUR_TOKEN_HERE'
       },
       body: JSON.stringify({
         bookingId: 'YOUR_BOOKING_ID',
         lat: lat,
         lng: lng,
         locationType: 'agent'
       })
     });
   }, 5000); // Every 5 seconds
   ```

---

### **STEP 5: Watch Real-Time Updates** (As Buyer)
1. **Go back to Live Tracking page**:
   - `/visit/live/{bookingId}`

2. **Agent Marker Appears**:
   - 🚗 Green car marker shows agent's location
   - Marker moves in real-time (no page refresh needed!)
   - Map auto-centers between property and agent

3. **Real-time Features**:
   - ✅ Location updates every few seconds
   - ✅ Distance calculation
   - ✅ Status updates
   - ✅ Supabase Realtime subscription active

---

### **STEP 6: Verify Visit at Gate** (As Security)
1. **Navigate to Verification Page**:
   - Go to: `/visit/verify`

2. **Enter Details**:
   - Booking ID: `{bookingId}`
   - OTP Code: (6-digit code from confirmation page)
   - Click "Verify Visit"

3. **Verification Successful**:
   - ✅ Status changes to: "Visit In Progress"
   - ✅ Success message shown
   - ✅ **WhatsApp #2 sent**: "Visit Started!" to user & agent
   - Redirect to live tracking

---

### **STEP 7: Check In-Progress Status**
1. **Live Tracking Page**:
   - Badge shows: "🟢 Visit In Progress"

2. **Visit Management**:
   - Go to: `/visit/manage`
   - Filter by "In Progress"
   - Should see the verified visit

---

## 📱 WhatsApp Notification Messages

You should receive WhatsApp notifications at these stages:

### 1. **Visit Requested** (user_requested)
```
🏡 Visit Request Received - JaagaX

Hi {user_name}!

Your visit request for *{property_name}* has been received.

📅 Date: {date}
⏰ Time: {time}
🚗 Travel: {travel_mode}

Status: Pending builder approval
OTP: {otp_code}

Track live: https://jaagax.com/visit/live/{bookingId}
```

### 2. **Visit Approved** (builder_approved)
```
✅ Visit Approved! - JaagaX

Hi {user_name}!

Great news! Your visit to *{property_name}* has been approved.

📅 {date} at {time}
👤 Agent: {agent_name}
📍 {locality}, {city}
🔐 OTP: {otp_code}

Your agent will contact you shortly. Track live: https://jaagax.com/visit/live/{bookingId}
```

### 3. **Visit Started** (visit_started)
```
🚀 Visit Started! - JaagaX

Hi {user_name}!

Your visit to *{property_name}* has begun.

👤 Agent: {agent_name}
📅 {date} at {time}

Track live: https://jaagax.com/visit/live/{bookingId}
```

---

## 🔍 Verification Checklist

### ✅ Core Features
- [ ] Builder can approve visits from dashboard
- [ ] OTP code generated on approval
- [ ] QR code displayed on confirmation page
- [ ] Live tracking map loads with property marker
- [ ] Agent can share location
- [ ] Real-time marker updates work
- [ ] OTP verification succeeds
- [ ] Status changes to "In Progress"
- [ ] WhatsApp notifications sent (3 total)

### ✅ Database Checks
```sql
-- Check visit status
SELECT id, status, otp_code, agent_id 
FROM visit_bookings 
WHERE id = 'YOUR_BOOKING_ID';

-- Check location history
SELECT * FROM visit_locations 
WHERE booking_id = 'YOUR_BOOKING_ID' 
ORDER BY created_at DESC;

-- Check WhatsApp logs
SELECT * FROM whatsapp_logs 
WHERE booking_id = 'YOUR_BOOKING_ID' 
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Map Not Loading?
- Check Google Maps API key in secrets
- Open browser console for errors
- Verify API key has Maps JavaScript API enabled

### OTP Verification Fails?
- Check OTP code matches exactly (case-sensitive)
- Verify booking status is "confirmed"
- Check edge function logs in Supabase

### WhatsApp Not Sending?
- Verify all 3 Twilio secrets are set
- Check you've joined Twilio WhatsApp sandbox
- Check `whatsapp_logs` table for errors
- View edge function logs: `send-whatsapp` and `send-visit-update`

### Location Sharing Not Working?
- Allow browser location permission
- Check network requests in DevTools
- Verify `update-location` edge function is deployed
- Check `visit_locations` table for inserts

### Real-time Updates Not Working?
- Check Supabase Realtime is enabled
- Open console and look for "Visit updated:" logs
- Verify channel subscription is active
- Check visit_bookings table has REPLICA IDENTITY FULL

---

## 🎓 Key Routes Reference

| Route | Purpose | Access |
|-------|---------|--------|
| `/dashboard/builder/visits` | Approve/decline visits | Builder/Admin |
| `/visit/confirm/{bookingId}` | View confirmation, OTP, QR | Anyone with ID |
| `/visit/live/{bookingId}` | Live tracking map | Anyone with ID |
| `/agent/share-location` | Agent location sharing | Agent only |
| `/visit/verify` | OTP verification | Security/Admin |
| `/visit/manage` | All bookings list | User/Agent/Admin |

---

## 🚀 Next Steps

1. **Test with Real Phone Numbers**: Update test data with actual phone numbers
2. **Test Production Twilio**: Switch from sandbox to production WhatsApp API
3. **Add More Scenarios**: Test decline flow, cancellation, etc.
4. **Mobile Testing**: Test on actual mobile devices
5. **Load Testing**: Multiple agents sharing location simultaneously

---

## 📞 Support

- Edge Function Logs: https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/functions
- Database: https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/editor
- Secrets: https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/settings/functions

**Happy Testing! 🎉**
