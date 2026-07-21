import { Link, useNavigate } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import MyLandSubmissions from "@/features/natural-living/MyLandSubmissions";
import { useNLAuth, NLRole } from "@/features/natural-living/useNLAuth";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import {
  Sprout, MapPin, User as UserIcon, ShieldCheck, LogOut, ArrowUpRight,
  Package, Calendar, Leaf, Users, Wallet, ClipboardCheck, BookOpen, BarChart3,
  ShoppingBag,
} from "lucide-react";

const TILES: Record<NLRole, { icon: any; title: string; desc: string; to: string }[]> = {
  customer: [
    { icon: ShoppingBag, title: "Marketplace", desc: "Order fresh organic produce from partner farms.", to: "/natural-living/marketplace" },
    { icon: Package, title: "My Orders", desc: "Track every basket from harvest to doorstep.", to: "/natural-living/my-orders" },
    { icon: Package, title: "My Subscriptions", desc: "Weekly veggie boxes and meal plans.", to: "/natural-living/my-subscriptions" },
    { icon: Sprout, title: "Digital Farm", desc: "Browse villages, farms and crops.", to: "/natural-living/digital-farm" },
    { icon: Calendar, title: "Upcoming Stays", desc: "Farm stays and wellness retreats.", to: "/natural-living/farm-stay" },
    { icon: Leaf, title: "My Impact", desc: "Trees planted, plastic saved, farmers supported.", to: "/natural-living/impact" },
  ],
  farmer: [
    { icon: Sprout, title: "Farmer Portal", desc: "Orders, calendar, expenses, harvest, AI.", to: "/natural-living/farmer-portal" },
    { icon: ShoppingBag, title: "Farm Orders", desc: "Confirm, pack and ship incoming produce orders.", to: "/natural-living/farm-orders" },
    { icon: ClipboardCheck, title: "My Farms", desc: "Plots, crops, subscription plans.", to: "/natural-living/my-farms" },
    { icon: Users, title: "Farm Management", desc: "Tasks, workers, attendance, inventory.", to: "/natural-living/farm-management" },
    { icon: Wallet, title: "Earnings", desc: "Payouts and yield tracking.", to: "/natural-living/farmer-portal" },
  ],
  land_owner: [
    { icon: MapPin, title: "Land Owner Portal", desc: "Parcels, partnerships, lease income.", to: "/natural-living/land-owner-portal" },
    { icon: ShoppingBag, title: "Farm Orders", desc: "Track produce orders from partnered farms.", to: "/natural-living/farm-orders" },
    { icon: Users, title: "Farm Management", desc: "Tasks, workers, attendance, inventory.", to: "/natural-living/farm-management" },
    { icon: BarChart3, title: "Reports", desc: "Lease income & parcel status.", to: "/natural-living/land-owner-portal" },
    { icon: ClipboardCheck, title: "Documents", desc: "Agreements, records, KYC.", to: "/natural-living/kyc" },
  ],
  admin: [
    { icon: ClipboardCheck, title: "Land Registration Approvals", desc: "Review land listings routed to your district / state / country.", to: "/admin?tab=nl-land" },
    { icon: ShieldCheck, title: "KYC Approvals", desc: "Verify Aadhaar & documents for farmers and land owners.", to: "/admin?tab=nl-kyc" },
    { icon: ShoppingBag, title: "All Orders", desc: "Platform-wide marketplace orders.", to: "/natural-living/farm-orders" },
    { icon: Users, title: "Users", desc: "Manage community members.", to: "/natural-living/dashboard" },
    { icon: BarChart3, title: "Analytics", desc: "Revenue, orders, growth.", to: "/natural-living/dashboard" },
  ],

};

const ROLE_ICON: Record<NLRole, any> = { customer: UserIcon, farmer: Sprout, land_owner: MapPin, admin: ShieldCheck };
const ROLE_LABEL: Record<NLRole, string> = { customer: "Customer", farmer: "Farmer", land_owner: "Land Owner", admin: "Admin" };

function DashboardInner() {
  const { user, profile, kyc, signOut } = useNLAuth();
  const navigate = useNavigate();
  const role = (profile?.role ?? "customer") as NLRole;
  const tiles = TILES[role];
  const RoleIcon = ROLE_ICON[role];
  const needsKyc = (role === "farmer" || role === "land_owner") && !kyc;

  return (
    <section className="py-16 md:py-24" style={{ background: "hsl(var(--nl-cream))" }}>
      <div className="nl-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b" style={{ borderColor: "hsl(var(--nl-forest) / 0.2)" }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <RoleIcon className="h-4 w-4" style={{ color: "hsl(var(--nl-forest))" }} />
              <Eyebrow>{ROLE_LABEL[role]} · Dashboard</Eyebrow>
            </div>
            <H1>
              Good to see you, <span style={{ fontStyle: "italic" }}>{profile?.full_name?.split(" ")[0] || "friend"}.</span>
            </H1>
            <Lede className="mt-4">
              {profile?.city ? `From ${profile.city}, ${profile.state}` : "Welcome to your grove."}
            </Lede>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/natural-living" className="nl-btn nl-btn-outline">Explore site</Link>
            <button onClick={async () => { await signOut(); navigate("/natural-living"); }} className="nl-btn nl-btn-outline">
              <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
            </button>
          </div>
        </div>

        {/* KYC prompt */}
        {needsKyc && (
          <Link to="/natural-living/kyc" className="mt-8 flex items-center justify-between gap-4 p-6 border group hover:border-[hsl(var(--nl-forest))] transition-colors"
            style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest))" }}>
            <div className="flex items-center gap-4">
              <ShieldCheck className="h-5 w-5" />
              <div>
                <div className="nl-serif text-xl">Complete your verification</div>
                <div className="text-sm opacity-80">Required to accept orders and payouts.</div>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        )}

        {kyc && kyc.status === "pending" && (
          <div className="mt-8 p-5 border flex items-center gap-3" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest) / 0.2)" }}>
            <ShieldCheck className="h-4 w-4" style={{ color: "hsl(var(--nl-forest))" }} />
            <div className="text-sm text-[hsl(var(--nl-ink)/0.8)]">
              Your KYC is under review. Most reviews complete within 48 hours.
            </div>
          </div>
        )}

        {/* Tiles */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.title} to={t.to} className="group block p-8 border transition-colors hover:border-[hsl(var(--nl-forest))]"
                style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest) / 0.2)" }}>
                <div className="flex items-center justify-between mb-6">
                  <Icon className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
                  <ArrowUpRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: "hsl(var(--nl-forest))" }} />
                </div>
                <h3 className="nl-serif text-2xl mb-2">{t.title}</h3>
                <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">{t.desc}</p>
              </Link>
            );
          })}
        </div>

        {/* Land submissions — visible to every non-admin so users can track approval */}
        {user?.id && role !== "admin" && <MyLandSubmissions userId={user.id} />}

        <p className="mt-16 text-xs text-[hsl(var(--nl-muted))]">Signed in as {user?.email}</p>
      </div>
    </section>
  );
}

export default function NLDashboard() {
  return (
    <NLProtectedRoute requireOnboarded>
      <NLLayout>
        <DashboardInner />
      </NLLayout>
    </NLProtectedRoute>
  );
}
