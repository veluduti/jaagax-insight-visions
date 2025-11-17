# JaagaX Dashboard Routing & Functionality Guide

## Overview
JaagaX uses role-based routing to provide tailored dashboards for different user types. Each user is assigned a role upon signup, and the system automatically redirects them to their appropriate dashboard.

---

## 🔐 Authentication & Role Management

### Auth Flow
```
1. User signs up/logs in at `/auth`
2. System checks `user_roles` table for their role
3. Dashboard component redirects to `/dashboard/{role}`
4. Role-specific dashboard loads
```

### Roles Hierarchy
- **Buyer** - Property seekers and homebuyers
- **Agent** - Real estate agents managing clients
- **Builder** - Developers managing projects and properties
- **Admin** - Platform administrators

---

## 📍 Dashboard Routes Mapping

### Base Dashboard Route
```typescript
/dashboard → Redirects to role-specific dashboard
```

### Role-Specific Dashboards

#### 1. 👤 BUYER DASHBOARD
**Route:** `/dashboard/buyer`  
**File:** `src/pages/BuyerDashboard.tsx`

**Features:**
- Saved properties and favorites
- Property comparison tools
- Scheduled site visits
- AI property recommendations
- Saved searches with alerts
- Recent property views
- Shortlisted properties

**Key Actions:**
- Schedule property visits
- Compare properties
- Contact agents
- Save/unsave properties
- Access AI advisor
- Track visit history

---

#### 2. 🏢 BUILDER DASHBOARD
**Route:** `/dashboard/builder`  
**File:** `src/pages/BuilderDashboard.tsx`

**Features:**
- Project portfolio overview
- Property listings management
- Lead generation metrics
- Performance analytics
- Revenue tracking
- Unit sales statistics
- Verification status

**Key Actions:**
- Upload new projects
- Manage property listings
- View and respond to leads
- Track performance metrics
- Submit RERA documents
- Update project information

**Sub-Route: Builder Visits Dashboard**
- **Route:** `/dashboard/builder/visits`
- **File:** `src/pages/BuilderVisitsDashboard.tsx`
- **Purpose:** Review and approve/decline property visit requests
- **Features:**
  - View pending visit requests
  - See visitor details (name, phone, preferences)
  - Approve with optional notes
  - Decline with reason
  - View scheduled visit dates/times
  - See assigned agents

---

#### 3. 🤝 AGENT DASHBOARD
**Route:** `/dashboard/agent`  
**File:** `src/pages/AgentDashboard.tsx`

**Features:**
- Client management
- Active listings portfolio
- Commission tracking
- Scheduled site visits
- Lead pipeline
- Performance metrics
- Calendar availability
- Client appointments

**Key Actions:**
- Manage client relationships
- Schedule property viewings
- Update availability calendar
- Track commissions
- Upload property listings
- Share location during visits
- Complete visit verifications

---

#### 4. ⚙️ ADMIN DASHBOARD
**Route:** `/dashboard/admin`  
**File:** `src/pages/AdminDashboard.tsx`

**Features:**
- Platform-wide analytics
- User management
- Property verification queue
- RERA document verification
- Event moderation
- Lead CRM system
- Data import tools
- Database cleanup utilities
- Content moderation

**Key Actions:**
- Verify properties and projects
- Approve/reject RERA documents
- Moderate community events
- Manage user roles
- Import bulk property data
- Review and approve leads
- Clean up fake/duplicate listings
- Monitor platform metrics

---

## 🔄 Related Visit Management Routes

### For All Users
```
/visit/schedule/:propertyId → Schedule a property visit
/visit/confirm/:bookingId   → Confirm visit booking
/visit/manage               → Manage all visits
```

### For Agents
```
/agent/location/:bookingId  → Share live location during visit
/visit/verify/:bookingId    → Verify visit completion with OTP
```

### For Builders
```
/dashboard/builder/visits   → Review and approve visit requests
```

### Visit Tracking
```
/visit/track/:bookingId     → Live tracking of ongoing visit
```

---

## 🧩 Component Architecture

### Dashboard Component (Central Router)
```typescript
// src/pages/Dashboard.tsx
- Checks user authentication
- Fetches user role from useAuth hook
- Redirects to appropriate dashboard
- Shows loading state during role fetch
```

### useAuth Hook
```typescript
// src/hooks/useAuth.tsx
- Manages authentication state
- Fetches and stores user role
- Provides signIn/signUp/signOut methods
- Handles role-based redirects
```

### Role-Specific Dashboard Structure
```typescript
Each dashboard typically includes:
1. Navigation bar
2. Role-specific stats/metrics
3. Quick action buttons
4. Recent activities feed
5. Relevant data tables/cards
6. Footer
```

---

## 🎯 Database Schema Integration

### User Roles Table
```sql
user_roles
- id: uuid
- user_id: uuid (references auth.users)
- role: enum('buyer', 'agent', 'builder', 'admin')
- created_at: timestamp
```

### Visit Bookings Flow
```
1. Buyer schedules visit → status: 'pending'
2. System assigns agent → status: 'agent_assigned'
3. Builder reviews → status: 'builder_pending'
4. Builder approves → status: 'confirmed'
5. Visit happens → agent shares location
6. Verification → status: 'completed'
```

### Visit Status States
- `pending` - Initial booking
- `agent_assigned` - Agent allocated
- `builder_pending` - Awaiting builder approval
- `confirmed` - Builder approved
- `in_progress` - Visit ongoing
- `completed` - Visit finished
- `builder_rejected` - Builder declined
- `cancelled` - User cancelled

---

## 🚀 Getting Started as Each Role

### As a Buyer
1. Sign up → Select "Buyer" role
2. Redirected to `/dashboard/buyer`
3. Browse properties
4. Schedule visits
5. Compare options
6. Contact agents

### As a Builder
1. Sign up → Select "Builder" role
2. Redirected to `/dashboard/builder`
3. Upload projects and properties
4. Monitor `/dashboard/builder/visits` for requests
5. Approve/decline visit requests
6. Track performance metrics

### As an Agent
1. Sign up → Select "Agent" role
2. Redirected to `/dashboard/agent`
3. Set availability calendar
4. Accept visit assignments
5. Share location during visits
6. Complete visit verifications

### As an Admin
1. Assigned by system
2. Access `/dashboard/admin`
3. Verify new submissions
4. Moderate content
5. Manage users
6. Monitor platform health

---

## 🔒 Security & Authorization

### RLS Policies
Each dashboard enforces Row Level Security:
- Buyers: Can only see their own data
- Agents: Can see assigned visits and clients
- Builders: Can see their properties and visits
- Admins: Full access to all data

### Authentication Checks
```typescript
// All dashboards check:
if (!user) redirect to /auth
if (!role) show loading
if (role !== expected) redirect to correct dashboard
```

---

## 📱 Mobile Responsive Design
All dashboards are fully responsive:
- Mobile: Stacked cards, hamburger menu
- Tablet: Grid layout with sidebar
- Desktop: Full dashboard with analytics

---

## 🛠️ Customization & Extension

### Adding a New Dashboard
1. Create new role in database enum
2. Add route in `App.tsx`
3. Create dashboard component
4. Update `Dashboard.tsx` redirect logic
5. Add RLS policies
6. Update `useAuth` hook

### Adding Features to Existing Dashboard
1. Design new component
2. Add data fetching logic
3. Update dashboard layout
4. Add necessary API/edge functions
5. Update RLS policies if needed

---

## 📊 Analytics & Tracking

Each dashboard tracks:
- Page views
- Feature usage
- Click patterns
- Time spent
- Conversion rates

Data accessible to admins via analytics dashboard.

---

## 🐛 Common Issues & Debugging

### User Not Redirecting
- Check `user_roles` table for entry
- Verify role enum matches code
- Check browser console for errors
- Ensure authentication is complete

### Dashboard Not Loading
- Check RLS policies
- Verify user permissions
- Check network requests
- Review edge function logs

### Visit Approval Failing
- Ensure user has builder/admin role
- Check visit status is `builder_pending`
- Verify edge function is deployed
- Check authorization headers

---

## 🔗 Navigation Flow Examples

### Buyer Journey
```
/ → /auth → /dashboard/buyer → /property/:id → /visit/schedule/:id → /visit/confirm/:bookingId
```

### Builder Journey
```
/ → /auth → /dashboard/builder → /dashboard/builder/visits → Approve/Decline
```

### Agent Journey
```
/ → /auth → /dashboard/agent → /agent/location/:bookingId → /visit/verify/:bookingId
```

---

## 📞 Support & Documentation

For more details:
- Technical docs: `/docs`
- API reference: Edge function files
- Database schema: `src/integrations/supabase/types.ts`
- Component docs: Individual component files

---

**Last Updated:** November 2025  
**Version:** 1.0  
**Platform:** JaagaX Intelligent Realty