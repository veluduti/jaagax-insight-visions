# ⚡ Quick Test Checklist - Visit Tracking System

## 🎬 Start Here (5 Minutes Setup)

### Step 1: Run Test Data Setup
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/sql/new)
2. Copy contents of `setup_test_data.sql`
3. Paste and click **RUN**
4. ✅ Should see: "5 rows affected" in results

### Step 2: Verify Data Created
Check the last query result shows:
- ✅ 5 bookings with `status = 'builder_pending'`
- ✅ Properties have `builder_id` assigned

---

## 🧪 Test Flow (10 Minutes)

### Test 1: Builder Dashboard ⏱️ 2 min
```
URL: http://localhost:5173/dashboard/builder/visits
```

**✅ Checklist:**
- [ ] Page loads without errors
- [ ] See 3-5 visit request cards
- [ ] Each card shows:
  - [ ] Property name and location
  - [ ] Visitor name and phone
  - [ ] Visit date and time
  - [ ] Travel mode icon
  - [ ] Special requests
  - [ ] Green "Approve" button
  - [ ] Red "Decline" button

**Action:** Click **Approve** on first card

**Expected:**
- [ ] Modal or inline form appears
- [ ] "Notes" text area visible
- [ ] Type test note: "Approved for viewing"
- [ ] Click "Confirm Approval"
- [ ] Green toast: "Visit approved successfully!"
- [ ] Card disappears from list

---

### Test 2: Visit Confirmation Page ⏱️ 2 min

**Get Booking ID:**
- From SQL result above, copy the `id` of first booking
- OR: Check database directly

```sql
SELECT id, otp_code FROM visit_bookings 
WHERE status = 'confirmed' 
ORDER BY updated_at DESC 
LIMIT 1;
```

**Navigate:**
```
URL: http://localhost:5173/visit/confirm/[paste-booking-id-here]
```

**✅ Checklist:**
- [ ] Page loads with booking details
- [ ] Status badge: **"Confirmed"** (green)
- [ ] Shows 6-character OTP code (e.g., "AB1234")
- [ ] Shows QR code image
- [ ] Property image and name displayed
- [ ] Visit date and time correct
- [ ] Agent card shows (name, photo, agency)
- [ ] Vehicle card shows (if pickup mode selected)
- [ ] Three action buttons:
  - [ ] "Track Live" button
  - [ ] "Share" button  
  - [ ] "Manage Visits" button

**Copy OTP Code** - You'll need it for Test 4

---

### Test 3: Live Tracking Map ⏱️ 3 min

**From confirmation page, click "Track Live"**
```
URL: http://localhost:5173/visit/live/[booking-id]
```

**✅ Checklist:**
- [ ] Google Map loads (not blank)
- [ ] Red marker at property location
- [ ] Left sidebar panel shows:
  - [ ] Property thumbnail image
  - [ ] Property name and address
  - [ ] Visit date and time
  - [ ] Status badge: "Confirmed"
- [ ] Map zoom/pan controls work
- [ ] Message: "Waiting for agent to start sharing location"

**Optional:** Test agent location sharing
```
URL: http://localhost:5173/agent/location/[booking-id]
```
- [ ] Click "Share My Location"
- [ ] Browser asks for location permission → Allow
- [ ] Blue marker appears on map
- [ ] Toast: "Location sharing started"

---

### Test 4: Visit Verification (OTP) ⏱️ 1 min

```
URL: http://localhost:5173/visit/verify
```

**Fill Form:**
- Booking ID: [use from Test 2]
- OTP Code: [use from Test 2, e.g., "AB1234"]

**Click "Verify Visit"**

**✅ Expected:**
- [ ] Success message appears
- [ ] Status changes to "In Progress"
- [ ] Redirect to confirmation page
- [ ] Status badge now shows "In Progress" (blue)

---

### Test 5: Visit Management ⏱️ 1 min

```
URL: http://localhost:5173/visit/manage
```

**✅ Checklist:**
- [ ] All user's bookings listed
- [ ] Each card shows:
  - [ ] Property thumbnail
  - [ ] Property name
  - [ ] Visit date/time
  - [ ] Status badge (correct color)
  - [ ] Agent info (if assigned)
- [ ] "View Details" button works
- [ ] Filter tabs work: All / Upcoming / Past

---

### Test 6: Rejection Flow ⏱️ 1 min

**Go back to:**
```
URL: http://localhost:5173/dashboard/builder/visits
```

**Find a pending visit card**

**Action:** Click **Decline**

**✅ Checklist:**
- [ ] Rejection reason text field appears (required)
- [ ] Type reason: "Property under maintenance until next week"
- [ ] Click "Confirm Rejection"
- [ ] Toast: "Visit request declined"
- [ ] Card disappears
- [ ] Database: Check status changed to `builder_rejected`

```sql
SELECT id, user_name, status, rejection_reason 
FROM visit_bookings 
WHERE status = 'builder_rejected' 
LIMIT 1;
```

---

## 🎯 All Routes Reference

Copy-paste to test:

```bash
# Main Routes
http://localhost:5173/
http://localhost:5173/property/16

# Visit Flow
http://localhost:5173/visit/schedule/16
http://localhost:5173/visit/confirm/[booking-id]
http://localhost:5173/visit/manage
http://localhost:5173/visit/live/[booking-id]
http://localhost:5173/visit/verify

# Builder & Agent
http://localhost:5173/dashboard/builder/visits
http://localhost:5173/agent/location/[booking-id]

# Role Dashboards (auth-free for testing)
http://localhost:5173/dashboard/buyer
http://localhost:5173/dashboard/agent  
http://localhost:5173/dashboard/builder
http://localhost:5173/dashboard/admin
```

---

## 📊 Database Verification Queries

### Check booking statuses:
```sql
SELECT 
  status,
  COUNT(*) as count
FROM visit_bookings
GROUP BY status
ORDER BY count DESC;
```

### View all bookings with details:
```sql
SELECT 
  vb.id,
  vb.user_name,
  vb.status,
  vb.visit_date,
  vb.visit_time,
  p.title as property,
  p.locality,
  b.name as builder
FROM visit_bookings vb
JOIN properties p ON vb.property_id = p.id
JOIN builders b ON vb.builder_id = b.id
ORDER BY vb.created_at DESC
LIMIT 10;
```

### Check WhatsApp logs:
```sql
SELECT 
  recipient,
  template_type,
  status,
  error_message,
  created_at
FROM whatsapp_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Check location tracking history:
```sql
SELECT 
  booking_id,
  location_type,
  lat,
  lng,
  created_at
FROM visit_locations
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### "No pending visit requests" showing?
**Fix:** Run `setup_test_data.sql` again

### Map not loading?
**Fix:** Check GOOGLE_MAPS_API_KEY in [Edge Function Secrets](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/settings/functions)

### Location sharing fails?
**Fix:** Use HTTPS or localhost. Check browser location permissions.

### OTP verification fails?
**Fix:** Ensure OTP code matches exactly (case-sensitive)

---

## ✅ Success Criteria

System is working if:
- [x] Builder dashboard shows pending visits
- [x] Approval flow completes without errors
- [x] Confirmation page displays OTP + QR code
- [x] Live tracking map loads with markers
- [x] Visit verification accepts correct OTP
- [x] All status transitions work correctly
- [x] Database queries return expected data

---

## 🎉 Next Steps

After basic tests pass:
1. Test WhatsApp notifications (requires Twilio setup)
2. Test agent location tracking (requires geolocation)
3. Test with real property data
4. Add more edge cases (same-day visits, cancellations)
5. Test mobile responsiveness
6. Load testing with multiple concurrent visits

---

**Estimated Total Test Time:** 15-20 minutes
**Difficulty:** Easy to Moderate
**Prerequisites:** Database setup complete

🚀 **Ready to test!**
