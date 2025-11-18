# Quick Real-Time Visit Flow Test (5 Minutes)

## Setup (1 minute)

### Browser 1 - Buyer Account
```
1. Open browser in normal mode
2. Go to your app URL
3. Login as buyer
4. Navigate to /dashboard/buyer
```

### Browser 2 - Agent Account
```
1. Open browser in incognito/private mode
2. Go to your app URL
3. Login as agent
4. Navigate to /dashboard/agent
```

---

## Test Flow (4 minutes)

### Step 1: Schedule Visit (Buyer) - 1 min
**Browser 1 (Buyer):**
1. Click any property card on the dashboard
2. Click "Schedule Visit" button
3. Fill form:
   - Date: Tomorrow
   - Time: 10:00 AM
   - Travel: Self-drive
4. Click "Confirm Booking"
5. **✅ Check:** You see confirmation message with booking ID

---

### Step 2: See Assignment (Agent) - 30 sec
**Browser 2 (Agent) - Keep visible:**
1. Look at "Visit Management" card on dashboard
2. **✅ Check:** "Upcoming Visits" count increases automatically
3. **✅ Check:** Toast notification appears saying "Visit schedule updated"
4. Click "View All Visits"

---

### Step 3: Confirm Visit (Agent) - 30 sec
**Browser 2 (Agent):**
1. See the new visit in "Upcoming" tab
2. Click on the visit card
3. Click "Approve Visit" or confirm button
4. **✅ Check:** Status changes to "confirmed"

---

### Step 4: See Confirmation (Buyer) - 30 sec
**Browser 1 (Buyer) - Keep visible:**
1. Go to "My Visits" section on dashboard
2. **✅ Check:** Status changes from "pending" to "confirmed" automatically
3. **✅ Check:** Toast notification appears
4. **✅ Check:** NO page refresh needed

---

### Step 5: Live Tracking Test - 1 min
**Browser 2 (Agent):**
1. Click "Start Visit" on the confirmed visit
2. Click "Share Location" button
3. Allow location permissions if prompted

**Browser 1 (Buyer):**
1. Click "Track Live" on the confirmed visit
2. **✅ Check:** See map with agent's location
3. **✅ Check:** Agent location marker appears
4. Wait 10 seconds
5. **✅ Check:** Location updates without refresh

---

## Success Checklist

Real-Time Features Working:
- [ ] Agent sees new visits without refresh
- [ ] Buyer sees status changes without refresh
- [ ] Toast notifications appear at right time
- [ ] Live location updates smoothly
- [ ] Both dashboards stay in sync
- [ ] No manual page refreshes needed

---

## Quick Troubleshooting

**Nothing updates automatically?**
- Open browser console (F12)
- Look for WebSocket connection errors
- Check if you see "Visit booking updated:" logs

**Still not working?**
- Verify both users are logged in
- Check Supabase project is active
- Ensure visit booking IDs match
- Try refreshing both pages once

---

## What You Should See

### Buyer Dashboard Updates:
```
Visit scheduled ➜ Status: pending
[Wait for agent...]
➜ Toast: "Visit schedule updated"
➜ Status: confirmed (NO REFRESH!)
➜ "Track Live" button appears
```

### Agent Dashboard Updates:
```
[New visit assigned]
➜ Toast: "Visit schedule updated"
➜ "Upcoming Visits" count +1 (NO REFRESH!)
➜ Visit card appears in list
➜ Can approve/reject
```

### Live Tracking:
```
Buyer opens tracking page
➜ Map loads with property location
➜ Agent marker appears
➜ Every 5-10 seconds:
   - Agent marker updates position
   - Distance recalculates
   - ETA updates
(All without page refresh!)
```

---

## Next: Full Test

If this quick test passes, proceed to **REALTIME_VISIT_FLOW_TEST.md** for comprehensive testing of:
- Multiple visits
- Cancellation flows
- Visit completion
- Story uploads
- Notifications
- Edge cases
