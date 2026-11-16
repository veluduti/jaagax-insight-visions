import { LayoutDashboard, Building2, BedDouble, CalendarRange, Sparkles, Utensils, PartyPopper, Compass, ConciergeBell, Contact, Users, ClipboardList, Wallet, BarChart3, Star, Settings, Image, MapPin, ShieldCheck, Tag, CalendarDays, Info } from "lucide-react";

export const partnerWorkspaceNav = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/partners/dashboard" },
  { label: "Multi-Property", icon: Building2, to: "/partners/portfolio", children: [
    { label: "My Properties", icon: Building2, to: "/partners/portfolio" },
    { label: "Add New Property", icon: Building2, to: "/partners/portfolio?section=add" },
    { label: "Property Groups", icon: Building2, to: "/partners/portfolio?section=groups" },
    { label: "Brand / Chain Settings", icon: Settings, to: "/partners/portfolio?section=brand" },
  ] },
  { label: "Property Setup", icon: Info, to: "/partners/dashboard", children: [
    { label: "Basic Information", icon: Info, to: "/partners/workspace/basic" },
    { label: "Photos & Media", icon: Image, to: "/partners/workspace/photos" },
    { label: "Location & Nearby", icon: MapPin, to: "/partners/workspace/location" },
    { label: "Policies & FAQs", icon: ShieldCheck, to: "/partners/workspace/policies" },
  ] },
  { label: "Rooms & Inventory", icon: BedDouble, to: "/partners/rooms", children: [
    { label: "Room Types", icon: BedDouble, to: "/partners/rooms" },
    { label: "Rooms (Numbering)", icon: CalendarRange, to: "/partners/inventory" },
    { label: "Rate Plans & Pricing", icon: Tag, to: "/partners/rate-plans" },
    { label: "Availability & Restrictions", icon: CalendarDays, to: "/partners/pricing" },
  ] },
  { label: "Amenities & Facilities", icon: Sparkles, to: "/partners/workspace/amenities" },
  { label: "Dining & Restaurants", icon: Utensils, to: "/partners/workspace/dining" },
  { label: "Events & Banquets", icon: PartyPopper, to: "/partners/workspace/events" },
  { label: "Experiences & Activities", icon: Compass, to: "/partners/workspace/experiences" },
  { label: "Hotel Services", icon: ConciergeBell, to: "/partners/workspace/services", children: [
    { label: "Room Service", icon: ConciergeBell, to: "/partners/workspace/services" },
    { label: "Housekeeping", icon: ClipboardList, to: "/partners/operations" },
    { label: "Laundry & Dry Cleaning", icon: ConciergeBell, to: "/partners/workspace/services" },
    { label: "Spa & Wellness", icon: Sparkles, to: "/partners/workspace/experiences" },
    { label: "Transport & Transfers", icon: Compass, to: "/partners/workspace/services" },
    { label: "Other Services", icon: ConciergeBell, to: "/partners/extra-services" },
  ] },
  { label: "Contacts & Departments", icon: Contact, to: "/partners/workspace/contacts" },
  { label: "Bookings & Guests", icon: Users, to: "/partners/reservations" },
  { label: "Orders & Service Requests", icon: ClipboardList, to: "/partners/service-requests" },
  { label: "Billing & Payments", icon: Wallet, to: "/partners/payouts" },
  { label: "Reports & Analytics", icon: BarChart3, to: "/partners/analytics" },
  { label: "Reviews & Ratings", icon: Star, to: "/partners/inbox?tab=reviews" },
  { label: "Settings", icon: Settings, to: "/partners/workspace/settings" },
];

export const partnerOverviewTabs = [
  { label: "Overview", icon: LayoutDashboard, to: "/partners/dashboard" },
  { label: "Rooms & Rates", icon: BedDouble, to: "/partners/rooms" },
  { label: "Amenities", icon: Sparkles, to: "/partners/workspace/amenities" },
  { label: "Dining", icon: Utensils, to: "/partners/workspace/dining" },
  { label: "Events", icon: PartyPopper, to: "/partners/workspace/events" },
  { label: "Experiences", icon: Compass, to: "/partners/workspace/experiences" },
  { label: "Services", icon: ConciergeBell, to: "/partners/workspace/services" },
  { label: "Location", icon: MapPin, to: "/partners/workspace/location" },
  { label: "Reviews", icon: Star, to: "/partners/inbox?tab=reviews" },
  { label: "Policies", icon: ShieldCheck, to: "/partners/workspace/policies" },
  { label: "FAQs", icon: Info, to: "/partners/workspace/faqs" },
];