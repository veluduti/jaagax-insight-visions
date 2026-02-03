# Complete User Flow Guide - JaagaX Platform

## Demo Users Available

| Role | Email | Description |
|------|-------|-------------|
| **Admin/Agent/Builder** | ashok.snv9@gmail.com | Multi-role user for testing all dashboards |
| **Buyer** | buyera@gmail.com | Customer role for property search & booking |

---

## 🏠 Complete Visit Booking Flow

### Step 1: Buyer Books a Visit
1. Buyer browses properties at `/search` or `/map`
2. Clicks "Schedule Visit" on a property
3. Selects date, time, and provides contact info
4. System auto-assigns an agent based on:
   - Proximity (40% weight)
   - Trust Score (30% weight)
   - Acceptance Rate (20% weight)
   - Current Workload (10% weight)

**Status: `pending_approval`**

### Step 2: Builder Approval (For Project Properties)
1. Builder receives WhatsApp notification + in-app alert
2. Goes to `/builder-visits` dashboard
3. Reviews pending visits with buyer details
4. Approves or Rejects with notes

**Status: `confirmed` or `builder_rejected`**

### Step 3: Agent Accepts Assignment
1. Agent receives WhatsApp + in-app notification
2. Views assignment in `/dashboard/agent/visits`
3. Has 120 seconds to accept (auto-cascade if timeout)
4. Prepares for visit

**Status remains: `confirmed`**

### Step 4: Visit Day - Agent Starts
1. Agent clicks "Start Visit" on confirmed booking
2. Shares live location with buyer
3. Buyer can track on `/visit/live/{bookingId}`

**Status: `in_progress`**

### Step 5: Verification at Site
1. Agent arrives and verifies buyer via:
   - QR Code scan
   - 6-digit OTP verification
2. Visit officially begins

### Step 6: Visit Completion
1. Agent completes visit walkthrough
2. Posts story updates with photos
3. Marks visit as complete
4. System prompts buyer for feedback

**Status: `completed`**

---

## 📱 WhatsApp Integration Points

The platform sends automated WhatsApp messages at these critical moments:

### For Buyers
| Trigger | Message Type | Template |
|---------|--------------|----------|
| Visit booked | Confirmation | booking_confirmation |
| Builder approves | Approval notice | visit_approved |
| Builder rejects | Rejection notice | visit_rejected |
| 24h before visit | Reminder | visit_reminder_24h |
| 1h before visit | Final reminder | visit_reminder_1h |
| Agent starts | Location tracking link | agent_en_route |
| Visit complete | Feedback request | visit_feedback |

### For Agents
| Trigger | Message Type | Template |
|---------|--------------|----------|
| New assignment | Assignment alert | new_assignment |
| Assignment cascade | Urgent reassignment | cascade_assignment |
| Visit reminder | Schedule reminder | agent_reminder |
| Buyer cancels | Cancellation notice | booking_cancelled |

### For Builders
| Trigger | Message Type | Template |
|---------|--------------|----------|
| New visit request | Approval needed | pending_approval |
| Visit completed | Summary report | visit_summary |

---

## 🔐 Twilio WhatsApp Setup

### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/
2. Sign up for a free account
3. Verify your phone number

### Step 2: Enable WhatsApp Sandbox (Testing)
1. Go to Console → Messaging → Try it Out → WhatsApp
2. Follow instructions to join sandbox
3. Save the sandbox number

### Step 3: Get Credentials
1. Go to Console → Account → Keys
2. Copy:
   - Account SID
   - Auth Token
   - WhatsApp Number (sandbox or production)

### Step 4: Add Secrets in Lovable
Add these secrets in your Lovable project:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### Step 5: Production Setup
For production, you'll need:
1. A Twilio-registered WhatsApp Business number
2. Approved message templates (for outbound messages)
3. Webhook configuration for incoming messages

---

## 🎯 Dashboard Routes by Role

### Buyer Dashboard
- **Main**: `/dashboard/buyer`
- **My Visits**: Embedded in dashboard
- **Live Tracking**: `/visit/live/{bookingId}`
- **Journey Timeline**: Embedded in dashboard

### Agent Dashboard
- **Main**: `/dashboard/agent`
- **My Visits**: `/dashboard/agent/visits`
- **Verifications**: `/dashboard/agent/verifications`
- **Location Sharing**: `/agent/location/{bookingId}`
- **Story Upload**: `/agent/visit/story/{bookingId}`

### Builder Dashboard
- **Main**: `/dashboard/builder`
- **Visit Approvals**: `/builder-visits`
- **My Properties**: Embedded in dashboard
- **Analytics**: Embedded in dashboard

### Admin/FRM Dashboard
- **Main**: `/dashboard/admin`
- **FRM Panel**: `/dashboard/admin/frm`
- **Agent Leaderboard**: Embedded in FRM
- **Assignment Analytics**: Embedded in FRM
- **Verification Queue**: Embedded in admin

---

## 🔄 Status State Machine

```
┌─────────────────┐
│  User Books     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ pending_approval│────▶│ builder_rejected│
└────────┬────────┘     └─────────────────┘
         │ (Builder approves)
         ▼
┌─────────────────┐
│   confirmed     │
└────────┬────────┘
         │ (Agent starts visit)
         ▼
┌─────────────────┐
│  in_progress    │
└────────┬────────┘
         │ (Visit completes)
         ▼
┌─────────────────┐
│   completed     │
└─────────────────┘
```

Alternative paths:
- Any status → `cancelled` (User or system cancellation)
- `confirmed` → `no_show` (Buyer didn't show up)

---

## 🧪 Testing Checklist

### Buyer Flow
- [ ] Register/Login as buyer
- [ ] Complete onboarding preferences
- [ ] Browse properties on search/map
- [ ] Book a visit with date/time selection
- [ ] Receive confirmation (check WhatsApp if configured)
- [ ] Track visit status in dashboard
- [ ] View live tracking when agent en route
- [ ] Submit feedback after visit

### Agent Flow
- [ ] Login with agent role
- [ ] View assigned visits in dashboard
- [ ] Accept/reject assignments (120s timeout)
- [ ] Start visit and share location
- [ ] Verify buyer with OTP/QR
- [ ] Upload story during visit
- [ ] Complete visit and trigger feedback

### Builder Flow
- [ ] Login with builder role
- [ ] View pending approvals dashboard
- [ ] Approve visits with notes
- [ ] Reject visits with reason
- [ ] View completed visit analytics

### Admin/FRM Flow
- [ ] Login with admin role
- [ ] View agent leaderboard
- [ ] Check assignment analytics
- [ ] Review verification queue
- [ ] Monitor earnings reports
