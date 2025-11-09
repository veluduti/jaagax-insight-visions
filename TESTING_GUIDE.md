# Complete Testing Guide for JaagaX Real Estate Platform

## 🎯 Overview
This guide will walk you through testing every feature of your Bayut-style real estate platform for Hyderabad and Vijayawada cities.

---

## 📋 Pre-Testing Setup

### Step 1: Seed the Database
**Location**: Go to the Map page (`/map`)

1. Click the **"Seed All (20+)"** button on the right side
   - This adds 20+ realistic properties across Hyderabad & Vijayawada
   - Wait for success message
2. Click **"Agents (13)"** to add real estate agents
3. Click **"Projects (18)"** to add builder projects
4. Verify you see properties appear on the map

**Expected Result**: Map should show property markers in both cities

---

## 🏠 PART 1: BUYER DASHBOARD TESTING

### Access Buyer Dashboard
**Path**: `/buyer-dashboard`

### Test 1: Dashboard Overview
- [ ] Verify welcome message shows your name
- [ ] Check all 4 quick action cards are visible:
  - Explore Map
  - Compare
  - Find Agent  
  - Property Value

### Test 2: Recommended Properties Tab
1. Click on "For You" tab
2. **Verify**:
   - [ ] Properties display with images
   - [ ] Each property shows: Title, Location, Price, Beds, Baths, Area
   - [ ] "Verified" badge shows on verified properties
   - [ ] Heart icon (favorite button) is visible

3. **Test Favorite Feature**:
   - [ ] Click heart icon on a property
   - [ ] See "Added to favorites" toast
   - [ ] Click again to remove
   - [ ] See "Removed from favorites" toast

4. **Test Property Navigation**:
   - [ ] Click on any property card
   - [ ] Should navigate to property detail page

### Test 3: Favorites Tab
1. Click "Favorites" tab
2. **If you added favorites**:
   - [ ] Count matches number of favorites added
3. **If no favorites**:
   - [ ] See empty state with message
   - [ ] "Browse Properties" button works

### Test 4: EMI Calculator Tab
1. Click "EMI" tab (Calculator icon)
2. **Test Loan Amount Slider**:
   - [ ] Drag slider to change amount
   - [ ] Value updates in real-time
   - [ ] Format shows in Indian Rupees (₹)

3. **Test Interest Rate Slider**:
   - [ ] Adjust from 6% to 15%
   - [ ] Rate displays with decimal

4. **Test Loan Tenure Slider**:
   - [ ] Change years (5-30 years)
   - [ ] Updates immediately

5. **Verify EMI Calculations**:
   - [ ] Monthly EMI shows in large font
   - [ ] Principal amount displays correctly
   - [ ] Total Interest calculated automatically
   - [ ] Total Payment = Principal + Interest

**Example Test Case**:
- Loan: ₹50,00,000
- Rate: 8.5%
- Tenure: 20 years
- Expected EMI: ~₹43,000/month

### Test 5: Saved Searches & Alerts
1. Click "Searches" tab
   - [ ] Empty state shows with message
2. Click "Alerts" tab
   - [ ] Empty state displays
   - [ ] "Enable Notifications" button visible

### Test 6: Market Insights
1. Scroll to bottom
2. **Verify 3 insight cards**:
   - [ ] Price Growth percentage
   - [ ] New Listings count
   - [ ] Average Days on Market

### Test 7: Sign Out
- [ ] Click "Sign Out" button
- [ ] Redirects to home page
- [ ] User logged out successfully

---

## 📱 PART 2: MAP PAGE TESTING

### Access Map Page
**Path**: `/map`

### Test 1: Map Initialization
- [ ] Map loads with Mapbox (requires MAPBOX_PUBLIC_TOKEN secret)
- [ ] Default view shows Hyderabad
- [ ] Property markers visible on map

### Test 2: Property Markers
1. **Hover over any marker**:
   - [ ] Popup shows property info
   - [ ] Displays: Title, Price, BHK, Area
   - [ ] Verified properties show checkmark

2. **Click on a marker**:
   - [ ] Property drawer opens from right
   - [ ] Shows full property details
   - [ ] Image carousel works
   - [ ] "View Full Details" button present

### Test 3: Map Controls
1. **3D View Toggle**:
   - [ ] Click "2D View" button
   - [ ] Map tilts to 3D perspective
   - [ ] Button changes to "3D View"

2. **City Switcher**:
   - [ ] Click "Vijayawada" button
   - [ ] Map flies to Vijayawada
   - [ ] Properties update
   - [ ] Click "Hyderabad" to return

### Test 4: Filters (Left Sidebar)
1. **Transaction Type**:
   - [ ] Toggle between Buy/Rent
   - [ ] Properties filter accordingly

2. **Property Type**:
   - [ ] Select Apartment/Villa/Commercial/Plot
   - [ ] Map updates with matching properties

3. **Price Range Slider**:
   - [ ] Adjust min/max price
   - [ ] Properties filter in real-time

4. **Bedrooms Filter**:
   - [ ] Select 1,2,3,4 BHK
   - [ ] Only matching properties show

5. **Verified Only Toggle**:
   - [ ] Turn on switch
   - [ ] Only verified properties display

### Test 5: AI Area Lens (Advanced Feature)
- [ ] Feature provides AI-powered area insights
- [ ] Shows nearby amenities, schools, hospitals

### Test 6: Seed Data Controls
1. Test individual seed buttons:
   - [ ] Properties (10) - adds basic set
   - [ ] Agents (13) - adds agent profiles
   - [ ] Projects (18) - adds builder projects
   - [ ] Seed All (20+) - comprehensive data

2. **Clear All Button**:
   - [ ] Click to clear database
   - [ ] Confirm all properties removed
   - [ ] Map becomes empty

---

## 👤 PART 3: AGENTS PAGE TESTING

### Access Agents Page
**Path**: `/agents`

### Test 1: Agent Listings
1. **Verify Agent Cards Display**:
   - [ ] Each agent shows photo/avatar
   - [ ] Name and agency displayed
   - [ ] Specialization badge visible
   - [ ] Sales & rental counts shown
   - [ ] Cities served listed
   - [ ] Languages displayed
   - [ ] Response time visible

### Test 2: Featured Agents Section
- [ ] "Featured TruBrokers™" section at top
- [ ] Top 3 agents by sales count
- [ ] Trophy icon and styling

### Test 3: Filter Agents
1. **Search Bar**:
   - [ ] Type agent name
   - [ ] Results filter live

2. **Service Type Dropdown**:
   - [ ] Select "Sales" or "Rentals"
   - [ ] Agents filter accordingly

3. **City Filter**:
   - [ ] Select Hyderabad/Vijayawada
   - [ ] Only agents serving that city show

4. **Verified Toggle**:
   - [ ] Turn on to show verified agents only

### Test 4: Agent Card Actions
1. **View Profile**:
   - [ ] Click on agent card
   - [ ] Navigates to agent detail page

2. **Contact Buttons** (on agent card):
   - [ ] "Call Now" button visible
   - [ ] "Chat Now" button visible

### Test 5: AI Agent Recommendations
- [ ] Section displays below filters
- [ ] Shows recommended agents based on criteria

---

## 🏢 PART 4: PROJECTS PAGE TESTING

### Access Projects Page
**Path**: `/projects`

### Test 1: Project Listings
1. **Verify Project Cards**:
   - [ ] Builder name and logo
   - [ ] Project name
   - [ ] Location (city & locality)
   - [ ] Average price
   - [ ] RERA ID displayed
   - [ ] Verified badge (if verified)
   - [ ] Trust score shown

### Test 2: Filter Projects
1. **By City**:
   - [ ] Hyderabad/Vijayawada tabs
   - [ ] Projects filter by city

2. **By Builder**:
   - [ ] Dropdown with all builders
   - [ ] Filter by specific builder

3. **By Price Range**:
   - [ ] Adjust price sliders
   - [ ] Projects update in real-time

4. **RERA Verified Only**:
   - [ ] Toggle to show only RERA verified
   - [ ] Non-verified projects hidden

### Test 3: Project Details
- [ ] Click on a project card
- [ ] Opens project detail page
- [ ] Shows complete project information

---

## 💼 PART 5: SELLER DASHBOARD TESTING

### Access Seller Dashboard
**Path**: `/seller-dashboard`

### Test 1: Dashboard Stats
**Verify 4 stat cards display**:
- [ ] Total Listings count
- [ ] Active Listings count
- [ ] Total Views (shows 0 initially)
- [ ] Total Leads (shows 0 initially)

### Test 2: My Listings Tab
1. **Empty State** (if no listings):
   - [ ] Shows "No properties listed yet"
   - [ ] "Add Your First Property" button

2. **With Listings** (after adding):
   - [ ] Each listing shows: Image, Title, Location
   - [ ] Price, Views, Leads, Type
   - [ ] Status badge (Ready/Under Construction)
   - [ ] Action buttons: Edit, View Details, Boost

3. **Add Property**:
   - [ ] Click "Add Property" button
   - [ ] Should open property listing form

### Test 3: Leads Tab
- [ ] Empty state shows initially
- [ ] "No leads yet" message
- [ ] Leads would appear when buyers contact

### Test 4: Analytics Tab
1. **Progress Bars**:
   - [ ] Profile Completion (75%)
   - [ ] Response Rate (0%)
   - [ ] Average Views (0)

2. **Market Insights Cards**:
   - [ ] Market Growth percentage
   - [ ] Avg Price/Sqft
   - [ ] Avg Sale Time

### Test 5: Settings Tab
- [ ] Upload Profile Photo button
- [ ] Notification Preferences
- [ ] Privacy Settings

---

## 👨‍💼 PART 6: AGENT DASHBOARD TESTING

### Access Agent Dashboard
**Path**: `/agent-dashboard`

### Test 1: Agent Profile Overview
**Verify profile displays**:
- [ ] Agent name and avatar
- [ ] Agency name
- [ ] Specialization
- [ ] Service areas (cities)
- [ ] Sales count
- [ ] Rental count
- [ ] Average response time
- [ ] Languages spoken

### Test 2: Dashboard Stats
**4 stat cards**:
- [ ] Total Clients (0 initially)
- [ ] Active Deals (0)
- [ ] Properties Sold (from seeded data)
- [ ] Total Commission (₹0)

### Test 3: Clients Tab
- [ ] "Add Client" button visible
- [ ] Empty state if no clients
- [ ] Client management interface

### Test 4: Messages Tab
- [ ] Empty state initially
- [ ] "No messages" display
- [ ] Ready for real-time chat

### Test 5: Portfolio Tab
- [ ] "Browse Properties" button
- [ ] Links to map to add properties
- [ ] Empty state message

### Test 6: Calendar Tab
- [ ] Empty state for appointments
- [ ] "No appointments scheduled"
- [ ] Ready for scheduling feature

### Test 7: Performance Metrics
**3 metric cards**:
- [ ] Deals Closed (0)
- [ ] Reviews (0)
- [ ] Response Rate (0%)

---

## 🏗️ PART 7: BUILDER DASHBOARD TESTING

### Access Builder Dashboard
**Path**: `/builder-dashboard`

### Test 1: Dashboard Overview
- [ ] Builder name displays
- [ ] Welcome message shows

### Test 2: Quick Access Cards
**3 main cards**:
- [ ] My Projects - view/manage projects
- [ ] Upload RERA Docs - submit documents
- [ ] Verification Status - track approvals

### Test 3: My Projects Section
- [ ] Should show seeded projects if builder_id matches
- [ ] Empty state if no projects
- [ ] "Add Project" functionality

### Test 4: RERA Upload
- [ ] Document upload interface
- [ ] File picker for RERA documents
- [ ] Upload progress indicator

### Test 5: Verification Status
- [ ] Shows pending/approved status
- [ ] RERA verification badge
- [ ] Trust score display

---

## 👨‍💼 PART 8: ADMIN DASHBOARD TESTING

### Access Admin Dashboard
**Path**: `/admin-dashboard`

### Test 1: Admin Control Panel
**4 main sections**:
- [ ] Verify Properties - review pending listings
- [ ] RERA Verification - approve builder docs
- [ ] Analytics - platform insights
- [ ] Settings - configure platform

### Test 2: Verification Workflows
1. **Property Verification**:
   - [ ] Queue of pending properties
   - [ ] Approve/Reject buttons
   - [ ] Verification notes

2. **RERA Verification**:
   - [ ] List of submitted documents
   - [ ] Document viewer
   - [ ] Approval workflow

### Test 3: Platform Analytics
- [ ] Total users count
- [ ] Total properties
- [ ] Total transactions
- [ ] Revenue metrics
- [ ] User growth charts

### Test 4: User Management
- [ ] List all users
- [ ] Filter by role (Buyer/Seller/Agent/Builder)
- [ ] Ban/Suspend functionality
- [ ] Edit user details

---

## 🧪 PART 9: ADVANCED FEATURES TESTING

### Property Valuation Page
**Path**: `/valuation`

1. **Property Details Form**:
   - [ ] Address input
   - [ ] Property type selection
   - [ ] Area input
   - [ ] Bedrooms/bathrooms
   - [ ] Age of property

2. **AI Valuation**:
   - [ ] Submit form
   - [ ] Get AI-generated valuation
   - [ ] See price range
   - [ ] Market comparison

### Communities Page
**Path**: `/communities`

- [ ] Featured communities display
- [ ] Community profiles with images
- [ ] Amenities listed
- [ ] Price range shown
- [ ] "Explore" buttons work

### Guides & Resources Page
**Path**: `/guides`

- [ ] Buying guides section
- [ ] Selling tips
- [ ] Legal guides
- [ ] Investment advice
- [ ] Downloadable resources

### Events Page
**Path**: `/events`

- [ ] Upcoming events list
- [ ] Property exhibitions
- [ ] Webinars
- [ ] Open house events
- [ ] Registration functionality

---

## 🔐 PART 10: AUTHENTICATION TESTING

### Test User Sign Up
**Path**: `/auth`

1. **Register New Account**:
   - [ ] Enter email
   - [ ] Enter password
   - [ ] Select role (Buyer/Seller/Agent/Builder)
   - [ ] Submit form
   - [ ] Receive verification email (if configured)

2. **Email Verification**:
   - [ ] Click verification link
   - [ ] Account activates

### Test User Login
1. **Login Form**:
   - [ ] Enter credentials
   - [ ] Click "Sign In"
   - [ ] Redirects to appropriate dashboard

2. **Role-Based Redirect**:
   - [ ] Buyer → Buyer Dashboard
   - [ ] Seller → Seller Dashboard
   - [ ] Agent → Agent Dashboard
   - [ ] Builder → Builder Dashboard
   - [ ] Admin → Admin Dashboard

### Test Password Reset
- [ ] "Forgot Password" link
- [ ] Enter email
- [ ] Receive reset link
- [ ] Set new password

### Test Social Login (if enabled)
- [ ] Google sign-in
- [ ] Role selection after social login

---

## 🎨 PART 11: UI/UX TESTING

### Responsive Design Testing
Test on different screen sizes:

1. **Desktop (1920x1080)**:
   - [ ] All elements visible
   - [ ] No horizontal scroll
   - [ ] Cards in correct grid

2. **Tablet (768x1024)**:
   - [ ] Grid adjusts to 2 columns
   - [ ] Navigation collapses
   - [ ] Touch-friendly buttons

3. **Mobile (375x667)**:
   - [ ] Single column layout
   - [ ] Mobile navigation works
   - [ ] Swipe gestures work
   - [ ] Map controls accessible

### Theme Testing
1. **Light Mode**:
   - [ ] Proper contrast
   - [ ] Readable text
   - [ ] Images visible

2. **Dark Mode** (if implemented):
   - [ ] Theme toggles
   - [ ] Colors invert properly
   - [ ] No white flashes

### Animation Testing
- [ ] Hover effects on cards
- [ ] Page transitions smooth
- [ ] Loading animations
- [ ] Skeleton loaders
- [ ] Toast notifications animate in/out

---

## ⚡ PART 12: PERFORMANCE TESTING

### Page Load Times
Test with browser DevTools:
- [ ] Home page < 3s
- [ ] Map page < 5s (with all markers)
- [ ] Dashboard < 2s
- [ ] Property detail < 2s

### Image Loading
- [ ] Images lazy load
- [ ] Placeholder shows while loading
- [ ] No layout shift (CLS)

### API Response Times
Check Network tab:
- [ ] Property fetch < 1s
- [ ] Agent fetch < 1s
- [ ] Search results < 2s

---

## 🔧 PART 13: ERROR HANDLING TESTING

### Test Error Scenarios

1. **Network Errors**:
   - [ ] Disable internet
   - [ ] Try to load data
   - [ ] Error message shows
   - [ ] Retry option available

2. **Invalid Data**:
   - [ ] Submit form with invalid email
   - [ ] Validation errors show
   - [ ] Field highlights in red

3. **404 Errors**:
   - [ ] Navigate to `/nonexistent`
   - [ ] 404 page displays
   - [ ] "Go Home" button works

4. **Permission Errors**:
   - [ ] Try to access admin page as buyer
   - [ ] Redirected or blocked
   - [ ] Error message shows

---

## 📊 PART 14: DATA INTEGRITY TESTING

### Verify Data Relationships

1. **Properties ↔ Agents**:
   - [ ] Property shows correct agent
   - [ ] Agent profile shows their properties

2. **Properties ↔ Projects**:
   - [ ] Property linked to correct project
   - [ ] Project shows all units

3. **Users ↔ Roles**:
   - [ ] User can only access their role's dashboard
   - [ ] Role-based permissions work

### Test CRUD Operations

1. **Create**:
   - [ ] Add new property
   - [ ] Appears in database
   - [ ] Shows on map

2. **Read**:
   - [ ] View property details
   - [ ] All fields display correctly

3. **Update**:
   - [ ] Edit property
   - [ ] Changes save
   - [ ] Updates reflect everywhere

4. **Delete**:
   - [ ] Remove property
   - [ ] Disappears from listings
   - [ ] Map updates

---

## 🎯 PART 15: INTEGRATION TESTING

### Mapbox Integration
- [ ] Map tiles load correctly
- [ ] Markers appear at correct coordinates
- [ ] Popups display properly
- [ ] 3D terrain works
- [ ] Geocoding functions

### Supabase Integration
1. **Database**:
   - [ ] Queries execute successfully
   - [ ] Real-time updates work
   - [ ] RLS policies enforced

2. **Authentication**:
   - [ ] Sign up works
   - [ ] Login works
   - [ ] Sessions persist
   - [ ] Logout works

3. **Storage**:
   - [ ] Image uploads work
   - [ ] Files downloadable
   - [ ] Proper permissions

### Edge Functions (if implemented)
- [ ] AI property analysis works
- [ ] Agent summary generation
- [ ] Market trends API

---

## ✅ FINAL CHECKLIST

### Before Going Live

- [ ] All seed data loaded successfully
- [ ] All pages accessible and functional
- [ ] No console errors
- [ ] All images loading
- [ ] Forms submitting correctly
- [ ] Authentication working
- [ ] Role-based access control working
- [ ] Responsive on all devices
- [ ] Performance metrics acceptable
- [ ] Error handling in place
- [ ] Loading states implemented
- [ ] Toast notifications working
- [ ] Navigation smooth
- [ ] SEO meta tags present
- [ ] Favicon set
- [ ] HTTPS enabled (in production)

### Browser Compatibility
Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers

---

## 🐛 TROUBLESHOOTING

### Common Issues

1. **Map Not Loading**:
   - Check MAPBOX_PUBLIC_TOKEN in Supabase secrets
   - Verify token is valid at mapbox.com

2. **No Properties Showing**:
   - Run seed functions on Map page
   - Check browser console for errors
   - Verify Supabase connection

3. **Authentication Errors**:
   - Check Supabase URL and keys
   - Verify email settings in Supabase dashboard
   - Check RLS policies

4. **Images Not Loading**:
   - Verify image URLs are valid
   - Check CORS settings
   - Use placeholder images if needed

---

## 📝 TESTING REPORT TEMPLATE

After testing, fill this out:

```
# Testing Report - [Date]

## Summary
- Total Tests: XX
- Passed: XX
- Failed: XX
- Blocked: XX

## Critical Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce:
   - Expected vs Actual:

## Non-Critical Issues
1. [Issue description]

## Recommendations
- [Improvement suggestions]

## Sign Off
Tested by: [Name]
Date: [Date]
Status: [Ready/Not Ready] for Production
```

---

## 🎉 SUCCESS CRITERIA

Your platform is ready when:
- ✅ All features work as expected
- ✅ No critical bugs
- ✅ Performance is acceptable
- ✅ Mobile responsive
- ✅ Data loads correctly
- ✅ Authentication secure
- ✅ User experience smooth

---

**Happy Testing! 🚀**

For issues, refer to Lovable documentation: https://docs.lovable.dev
