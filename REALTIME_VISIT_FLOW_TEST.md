# Real-Time Visit Flow Testing Guide

This guide will help you test the complete visit flow with real-time updates between buyer and agent accounts.

## Prerequisites

✅ You've already created test accounts for buyer and agent
✅ Both accounts are set up with correct roles in the database

## Test Flow Overview

```
BUYER → Schedules Visit → AGENT (receives notification)
AGENT → Confirms Visit → BUYER (sees confirmation)
AGENT → Shares Location → BUYER (tracks in real-time)
AGENT → Completes Visit → BUYER (receives summary)
```

## Step-by-Step Testing

### 1. Buyer Account Setup (Browser 1 / Incognito)

**Login:**
- Go to `/auth`
- Login with your buyer account
- Should redirect to `/dashboard/buyer`

**Schedule a Visit:**
1. Click on any property from the dashboard
2. Click "Schedule Visit" button
3. Fill in visit details:
   - Select date and time
   - Choose travel mode (self-drive/pickup)
   - Add special requests (optional)
4. Submit the booking
5. You should see confirmation with booking ID

**What to observe:**
- Booking appears in "My Visits" section
- Status shows as "pending" or "agent_pending"
- Real-time: Page will auto-update when agent confirms

---

### 2. Agent Account Setup (Browser 2 / Different Profile)

**Login:**
- Go to `/auth` 
- Login with your agent account
- Should redirect to `/dashboard/agent`

**View Assigned Visits:**
1. On the dashboard, you'll see "Visit Management" card
2. Click "View All Visits" or navigate to `/dashboard/agent/visits`
3. You should see the visit assigned to you

**What to observe:**
- New visit appears in "Upcoming" tab
- Shows buyer details, property info, and requested time
- Real-time: New visits appear automatically without refresh

**Confirm the Visit:**
1. Click on the visit card
2. Click "Approve Visit" or similar action button
3. Status changes to "confirmed"

---

### 3. Real-Time Updates Test

Keep both browser windows side by side:

**Test 1: Status Changes**
- Agent confirms visit → Buyer sees status change instantly
- Status updates from "pending" → "confirmed"
- Both dashboards update without page refresh

**Test 2: Live Location Tracking**
- Agent clicks "Start Visit"
- Agent shares location via `/agent/location/:bookingId`
- Buyer opens `/visit/live/:bookingId`
- Buyer sees agent's location updating in real-time on map

**Test 3: Visit Progress**
- Agent marks visit as "in_progress"
- Buyer receives notification
- Visit status updates automatically on buyer's dashboard

**Test 4: Visit Completion**
- Agent marks visit as "completed"
- Agent can upload visit story/photos
- Buyer receives completion notification
- Visit summary becomes available at `/visit/summary/:bookingId`

---

## Key Pages to Test

### Buyer Pages:
- `/dashboard/buyer` - Main dashboard with visits overview
- `/visit/manage` - All visits management
- `/visit/confirm/:bookingId` - Visit confirmation details
- `/visit/live/:bookingId` - Live tracking during visit
- `/visit/summary/:bookingId` - Post-visit summary

### Agent Pages:
- `/dashboard/agent` - Main dashboard with visit stats
- `/dashboard/agent/visits` - All assigned visits
- `/agent/location/:bookingId` - Share location during visit
- `/agent/visit/story/:bookingId` - Upload visit updates

---

## Real-Time Features to Verify

### 1. Auto-Updates (No Refresh Required)
- ✅ Visit status changes
- ✅ New visit assignments
- ✅ Booking confirmations
- ✅ Cancellations

### 2. Live Location Tracking
- ✅ Agent location updates every few seconds
- ✅ Map markers move in real-time
- ✅ Distance calculations update
- ✅ ETA updates

### 3. Notifications
- ✅ Browser notifications for important events
- ✅ In-app toast notifications
- ✅ Status badge updates

---

## Testing Checklist

### Buyer Flow:
- [ ] Can schedule a visit from property page
- [ ] Sees confirmation screen with booking details
- [ ] Visit appears in "My Visits" section
- [ ] Receives real-time update when agent confirms
- [ ] Can access live tracking link
- [ ] Can view visit summary after completion
- [ ] Can cancel visit if needed

### Agent Flow:
- [ ] Sees new visit assignments automatically
- [ ] Can view visit details and buyer information
- [ ] Can approve/reject visit requests
- [ ] Can share location during visit
- [ ] Can upload visit stories/photos
- [ ] Can mark visit as completed
- [ ] Visit stats update in real-time on dashboard

### Real-Time Sync:
- [ ] Status changes reflect instantly on both sides
- [ ] No page refresh needed for updates
- [ ] Location updates smoothly on map
- [ ] Notifications appear at correct times
- [ ] Both dashboards stay in sync

---

## Common Issues & Solutions

### Issue: Real-time updates not working
**Solution:** 
- Check browser console for WebSocket errors
- Ensure Supabase Realtime is enabled in project settings
- Verify both users are on the same visit booking ID

### Issue: Location not updating
**Solution:**
- Agent must enable location permissions
- Check if GPS is enabled on agent's device
- Verify location sharing is active

### Issue: Different statuses on buyer/agent sides
**Solution:**
- Refresh both pages manually
- Check database for actual status
- Ensure no caching issues

---

## Advanced Testing Scenarios

### Scenario 1: Multiple Visits
- Schedule 3 visits from buyer account
- Assign to same agent
- Confirm them in different order
- Verify all updates correctly

### Scenario 2: Cancellation Flow
- Buyer cancels a confirmed visit
- Agent sees cancellation notification
- Visit moves to cancelled section

### Scenario 3: Visit Journey
- Complete full journey from schedule to completion
- Verify each status transition
- Check all notifications trigger correctly

### Scenario 4: Concurrent Updates
- Open same visit on buyer and agent accounts
- Make changes from both sides
- Verify conflicts are handled gracefully

---

## Database Queries for Debugging

Check visit status:
```sql
SELECT id, user_name, visit_date, visit_time, status, agent_id
FROM visit_bookings
WHERE user_email = 'your-buyer-email@gmail.com'
ORDER BY created_at DESC;
```

Check agent assignments:
```sql
SELECT vb.id, vb.status, vb.user_name, a.name as agent_name
FROM visit_bookings vb
JOIN agents a ON a.id = vb.agent_id
ORDER BY vb.visit_date DESC;
```

View real-time subscription status:
```sql
SELECT schemaname, tablename, 
       arraytostring(array_agg(DISTINCT publication_name), ', ') as publications
FROM pg_publication_tables
WHERE schemaname = 'public' AND tablename = 'visit_bookings'
GROUP BY schemaname, tablename;
```

---

## Success Criteria

✅ All visit statuses update in real-time
✅ Location tracking works smoothly
✅ Notifications appear at right moments
✅ No page refreshes needed
✅ Both buyer and agent have synchronized view
✅ Visit flow completes end-to-end successfully

---

## Next Steps After Testing

Once you've verified the real-time functionality:
1. Test with builder account for builder visits
2. Test admin dashboard for oversight
3. Add more edge cases (network failures, etc.)
4. Performance test with multiple concurrent visits
5. Test on mobile devices

---

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Review Supabase logs in dashboard
3. Verify RLS policies are correct
4. Check if Realtime is enabled for visit_bookings table
