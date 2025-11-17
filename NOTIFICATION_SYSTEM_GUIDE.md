# 🔔 Complete Notification System Guide

## Overview
JaagaX has a comprehensive notification system that sends updates via:
1. **In-App Notifications** - Bell icon in navigation
2. **WhatsApp Messages** - Via Twilio integration
3. **Database Logs** - Tracked in `notifications` and `whatsapp_logs` tables

---

## 🎯 Quick Test (Start Here!)

### Test 1: Create a Test Notification
```sql
-- Run this in Supabase SQL Editor
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
SELECT create_test_notification('YOUR_USER_ID'::uuid);
```

**Expected Result:**
- ✅ Notification bell shows badge with count
- ✅ Clicking bell shows test notification
- ✅ Notification appears in real-time (no refresh needed)

### Test 2: Check Your User ID
```sql
-- Find your user ID
SELECT id, email, raw_user_meta_data->>'name' as name 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test 3: View All Notifications
```sql
-- Check notifications in database
SELECT id, type, title, message, read, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔄 Complete Visit Booking Flow

### Flow Diagram
```
User Request → Builder Approval → Agent Assignment → Visit Start → Completion
     ↓              ↓                    ↓               ↓            ↓
 Notification   Notification        Notification    Notification  Notification
  + WhatsApp     + WhatsApp          + WhatsApp      + WhatsApp    + WhatsApp
```

### Notification Triggers

#### 1️⃣ User Requests Visit
- **Trigger:** User submits visit booking form
- **Status:** `builder_pending`
- **Notifications:**
  - ✉️ WhatsApp: "Visit Request Received"
  - 🔔 In-App: "Visit request submitted"

#### 2️⃣ Builder Approves
- **Trigger:** Builder clicks "Approve" in `/dashboard/builder/visits`
- **Status:** `confirmed`
- **Notifications:**
  - ✉️ WhatsApp: "Visit Approved!"
  - 🔔 In-App: "Your visit has been approved"
  - 👤 Agent gets WhatsApp notification

#### 3️⃣ Builder Rejects
- **Trigger:** Builder clicks "Decline" with reason
- **Status:** `builder_rejected`
- **Notifications:**
  - ✉️ WhatsApp: "Visit Request Declined"
  - 🔔 In-App: "Visit request declined"

#### 4️⃣ Agent Assigned
- **Trigger:** Builder assigns agent during approval
- **Status:** `confirmed` (with agent_id)
- **Notifications:**
  - ✉️ WhatsApp: "Agent Assigned"
  - 🔔 In-App: "Agent assigned to your visit"

#### 5️⃣ Visit Starts
- **Trigger:** Agent/user verifies OTP at property
- **Status:** `in_progress`
- **Notifications:**
  - ✉️ WhatsApp: "Visit Started"
  - 🔔 In-App: "Your visit has started"

#### 6️⃣ Visit Completes
- **Trigger:** Agent marks visit complete
- **Status:** `completed`
- **Notifications:**
  - ✉️ WhatsApp: "Visit Completed - Feedback Request"
  - 🔔 In-App: "Visit completed! Share feedback"

---

## 🧪 Step-by-Step Testing

### Prerequisites
1. **User Account:** Sign up at `/auth`
2. **User Role:** Have admin or builder role
3. **Test Data:** At least one property with `builder_pending` booking

### Step 1: Login as Builder/Admin
```
1. Go to /auth
2. Sign in with your account
3. Make sure you have builder or admin role:
   
   SELECT role FROM user_roles WHERE user_id = 'YOUR_USER_ID';
   
   If not, add role:
   INSERT INTO user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'builder');
```

### Step 2: Check Pending Visits
```
1. Navigate to /dashboard/builder/visits
2. You should see pending visit requests
3. If empty, create test booking via frontend or SQL:

   INSERT INTO visit_bookings (
     user_id, user_name, user_email, user_phone,
     property_id, visit_date, visit_time,
     status, otp_code
   ) VALUES (
     'YOUR_USER_ID',
     'Test User',
     'test@example.com',
     '+919876543210',
     1, -- Replace with actual property ID
     CURRENT_DATE + INTERVAL '2 days',
     '10:00 AM',
     'builder_pending',
     '123456'
   );
```

### Step 3: Approve a Visit
```
1. On /dashboard/builder/visits
2. Click "Approve" on any pending visit
3. Add optional notes
4. Click "Confirm Approval"
```

**Expected Results:**
- ✅ Status changes to "confirmed"
- ✅ Notification bell shows new notification
- ✅ WhatsApp message sent (check Twilio logs)
- ✅ Edge function logs show execution

### Step 4: Check Notifications
```
1. Click notification bell icon (top right)
2. Should see: "Visit approved" notification
3. Click notification to mark as read
4. Badge count should decrease
```

### Step 5: Verify in Database
```sql
-- Check notification was created
SELECT * FROM notifications 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check WhatsApp log
SELECT * FROM whatsapp_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🔧 Troubleshooting

### Issue: "No notifications showing"

**Check 1: User is logged in**
```javascript
// In browser console
localStorage.getItem('sb-smyypmthspsrvwydzsxc-auth-token')
```

**Check 2: RLS policies allow access**
```sql
-- Should return rows for your user
SELECT * FROM notifications WHERE user_id = auth.uid();
```

**Check 3: Realtime is working**
```javascript
// In browser console on any page
const { data } = await window.supabase
  .from('notifications')
  .select('*')
  .limit(5);
console.log(data);
```

### Issue: "Edge functions not executing"

**Check 1: View edge function logs**
```
Supabase Dashboard → Edge Functions → approve-visit → Logs
Supabase Dashboard → Edge Functions → send-visit-update → Logs
Supabase Dashboard → Edge Functions → create-notification → Logs
```

**Check 2: Invoke manually**
```javascript
const { data, error } = await supabase.functions.invoke('create-notification', {
  body: {
    userId: 'YOUR_USER_ID',
    type: 'test',
    title: 'Manual Test',
    message: 'Testing edge function directly',
    metadata: {}
  }
});
console.log({ data, error });
```

### Issue: "WhatsApp not sending"

**Check 1: Secrets configured**
```
Settings → Edge Functions → Secrets
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_WHATSAPP_NUMBER
```

**Check 2: Phone number format**
- Must include country code: `+919876543210`
- No spaces or dashes
- For India: `+91` prefix required

**Check 3: Twilio console**
- Check message logs in Twilio dashboard
- Verify WhatsApp sender is approved
- Check account balance

---

## 🎨 Notification Bell Component

The notification bell is automatically shown in navigation when user is logged in:

**Location:** Top right of navigation bar (desktop & mobile)

**Features:**
- 🔴 Red badge shows unread count
- 🔄 Real-time updates (no refresh needed)
- 📋 Dropdown list with scrollable notifications
- ✅ Mark individual as read
- ✅ Mark all as read button
- 🕐 Relative timestamps ("2 minutes ago")

**Auto-refresh:**
- Checks for new notifications on component mount
- Listens for real-time INSERT events
- Updates badge count automatically

---

## 📊 Database Schema

### notifications table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,              -- 'visit_update', 'test', etc.
  title TEXT NOT NULL,             -- Short title
  message TEXT NOT NULL,           -- Full message
  metadata JSONB,                  -- Additional data
  read BOOLEAN DEFAULT false,      -- Read status
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### whatsapp_logs table
```sql
CREATE TABLE whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  recipient TEXT NOT NULL,         -- Phone number
  message TEXT NOT NULL,           -- Message content
  template_type TEXT,              -- 'builder_approved', etc.
  status TEXT,                     -- 'sent', 'failed'
  error_message TEXT,              -- Error if failed
  twilio_sid TEXT,                 -- Twilio message ID
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🚀 Testing Checklist

- [ ] Test notification created with SQL function
- [ ] Notification bell shows badge
- [ ] Clicking bell opens dropdown
- [ ] Real-time notification appears without refresh
- [ ] Builder can approve visit from dashboard
- [ ] Approval triggers in-app notification
- [ ] Approval triggers WhatsApp message
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Edge function logs show execution
- [ ] Database logs show WhatsApp sent
- [ ] Notification count updates correctly

---

## 🔗 Important Links

- [Builder Dashboard](https://your-app.lovable.app/dashboard/builder/visits)
- [Supabase Edge Functions](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/functions)
- [Supabase SQL Editor](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/sql/new)
- [Twilio Console](https://console.twilio.com/)

---

## 📞 Support

If notifications still aren't working after following this guide:

1. **Check browser console** for JavaScript errors
2. **Check edge function logs** in Supabase dashboard
3. **Verify RLS policies** allow your user to read notifications
4. **Test with SQL** to create notifications manually
5. **Check authentication** - make sure you're logged in

**Remember:** Edge functions deploy automatically when you make changes!
