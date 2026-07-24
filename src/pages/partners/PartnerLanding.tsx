import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Home,
  Building2,
  Eye,
  Clock,
  Star,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Download,
  RefreshCw,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ===================== TYPES =====================
interface Booking {
  id: string;
  guest: string;
  checkIn: string;
  checkOut: string;
  room: string;
  amount: number;
  status: "confirmed" | "checked-in" | "checked-out" | "cancelled";
}

interface Property {
  id: string;
  name: string;
  location: string;
  rooms: number;
  occupancy: number;
  revenue: number;
  image: string;
}

// ===================== MOCK DATA =====================
const bookingsData: Booking[] = [
  {
    id: "B-1001",
    guest: "Amit Sharma",
    checkIn: "2026-07-25",
    checkOut: "2026-07-28",
    room: "Deluxe Suite",
    amount: 24500,
    status: "confirmed",
  },
  {
    id: "B-1002",
    guest: "Priya Patel",
    checkIn: "2026-07-24",
    checkOut: "2026-07-27",
    room: "Premium King",
    amount: 18500,
    status: "checked-in",
  },
  {
    id: "B-1003",
    guest: "Rahul Singh",
    checkIn: "2026-07-23",
    checkOut: "2026-07-25",
    room: "Standard Twin",
    amount: 12000,
    status: "checked-out",
  },
  {
    id: "B-1004",
    guest: "Neha Gupta",
    checkIn: "2026-07-26",
    checkOut: "2026-07-30",
    room: "Executive Suite",
    amount: 32000,
    status: "confirmed",
  },
  {
    id: "B-1005",
    guest: "Vikram Reddy",
    checkIn: "2026-07-24",
    checkOut: "2026-07-26",
    room: "Deluxe Double",
    amount: 15500,
    status: "checked-in",
  },
];

const properties: Property[] = [
  {
    id: "p1",
    name: "Grand Palace Hotel",
    location: "Jaipur, Rajasthan",
    rooms: 48,
    occupancy: 92,
    revenue: 284000,
    image: "🏰",
  },
  {
    id: "p2",
    name: "Seaside Resort",
    location: "Goa, India",
    rooms: 32,
    occupancy: 78,
    revenue: 195000,
    image: "🏖️",
  },
  {
    id: "p3",
    name: "Mountain View Lodge",
    location: "Manali, Himachal",
    rooms: 24,
    occupancy: 95,
    revenue: 168000,
    image: "⛰️",
  },
];

const revenueData = [
  { day: "Mon", revenue: 42000, bookings: 12 },
  { day: "Tue", revenue: 38000, bookings: 10 },
  { day: "Wed", revenue: 56000, bookings: 15 },
  { day: "Thu", revenue: 49000, bookings: 13 },
  { day: "Fri", revenue: 72000, bookings: 18 },
  { day: "Sat", revenue: 68000, bookings: 16 },
  { day: "Sun", revenue: 45000, bookings: 11 },
];

const occupancyData = [
  { name: "Occupied", value: 92 },
  { name: "Available", value: 8 },
];

const COLORS = ["#10b981", "#1f2937"];

const statusColors = {
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "checked-in": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "checked-out": "bg-gray-500/10 text-gray-400 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

// ===================== MAIN DASHBOARD =====================
export default function PartnerDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "bookings" | "properties" | "analytics">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const totalRevenue = properties.reduce((sum, p) => sum + p.revenue, 0);
  const totalRooms = properties.reduce((sum, p) => sum + p.rooms, 0);
  const avgOccupancy = Math.round(properties.reduce((sum, p) => sum + p.occupancy, 0) / properties.length);
  const totalBookings = bookingsData.length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ===== SIDEBAR ===== */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-white/5 bg-[#0f0f1a] transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/5 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold">JX</div>
          <span className="text-sm font-semibold">JAAGA X Partners</span>
        </div>

        <nav className="p-3">
          <p className="mb-2 px-3 text-xs font-medium uppercase text-white/30">Main</p>
          {[
            { id: "overview", label: "Overview", icon: Home },
            { id: "bookings", label: "Bookings", icon: Calendar },
            { id: "properties", label: "Properties", icon: Building2 },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                activeTab === item.id
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}

          <p className="mb-2 mt-6 px-3 text-xs font-medium uppercase text-white/30">Account</p>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white">
            <User size={18} />
            Profile
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white">
            <Settings size={18} />
            Settings
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400">
            <LogOut size={18} />
            Logout
          </button>
        </nav>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        {/* ===== HEADER ===== */}
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0f0f1a]/80 backdrop-blur-lg">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-lg font-semibold capitalize">{activeTab}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white">
                <RefreshCw size={18} />
              </button>
              <button className="relative rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white">
                <Bell size={18} />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500"></span>
              </button>
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-medium text-emerald-400">
                AK
              </div>
            </div>
          </div>
        </header>

        {/* ===== DASHBOARD CONTENT ===== */}
        <main className="p-6">
          {activeTab === "overview" && <OverviewTab properties={properties} bookings={bookingsData} />}
          {activeTab === "bookings" && <BookingsTab bookings={bookingsData} />}
          {activeTab === "properties" && <PropertiesTab properties={properties} />}
          {activeTab === "analytics" && <AnalyticsTab revenueData={revenueData} occupancyData={occupancyData} />}
        </main>
      </div>
    </div>
  );
}

// ===================== OVERVIEW TAB =====================
function OverviewTab({ properties, bookings }: { properties: Property[]; bookings: Booking[] }) {
  const totalRevenue = properties.reduce((s, p) => s + p.revenue, 0);
  const totalRooms = properties.reduce((s, p) => s + p.rooms, 0);
  const avgOccupancy = Math.round(properties.reduce((s, p) => s + p.occupancy, 0) / properties.length);

  const stats = [
    {
      label: "Total Revenue",
      value: `₹${(totalRevenue / 1000).toFixed(1)}L`,
      change: "+12%",
      up: true,
      icon: DollarSign,
    },
    { label: "Total Bookings", value: bookings.length, change: "+8%", up: true, icon: Calendar },
    { label: "Occupancy Rate", value: `${avgOccupancy}%`, change: "+5%", up: true, icon: TrendingUp },
    { label: "Active Properties", value: properties.length, change: "0", up: true, icon: Building2 },
  ];

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/5 bg-white/5 p-5 backdrop-blur"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/40">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <stat.icon size={18} />
              </div>
            </div>
            <div className={`mt-2 flex items-center gap-1 text-xs ${stat.up ? "text-emerald-400" : "text-red-400"}`}>
              {stat.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {stat.change} from last month
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart + Occupancy */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Revenue Overview</h3>
            <button className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/50 hover:bg-white/5">
              Weekly
            </button>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="day" stroke="#ffffff30" fontSize={12} />
                <YAxis stroke="#ffffff30" fontSize={12} tickFormatter={(v) => `₹${v / 1000}K`} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-sm font-semibold">Occupancy</h3>
          <div className="mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {occupancyData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8 }}
                  formatter={(v) => [`${v}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6">
            {occupancyData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className={`h-2.5 w-2.5 rounded-full`} style={{ background: COLORS[i] }}></span>
                {item.name}: {item.value}%
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Bookings</h3>
          <button className="text-xs text-emerald-400 hover:underline">View All</button>
        </div>
        <div className="mt-4 space-y-2">
          {bookings.slice(0, 5).map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3 hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-medium text-emerald-400">
                  {b.guest.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{b.guest}</p>
                  <p className="text-xs text-white/40">
                    {b.room} · {b.checkIn} → {b.checkOut}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">₹{b.amount.toLocaleString()}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${statusColors[b.status]}`}>
                  {b.status.replace("-", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== BOOKINGS TAB =====================
function BookingsTab({ bookings }: { bookings: Booking[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.guest.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || b.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-10 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked In</option>
            <option value="checked-out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
          <Plus size={16} />
          New Booking
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-white/5 bg-white/5 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5 bg-white/5">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3 font-medium">Booking ID</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Check In</th>
                <th className="px-4 py-3 font-medium">Check Out</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-white/5 transition hover:bg-white/5">
                  <td className="px-4 py-3 text-sm font-medium text-emerald-400">{b.id}</td>
                  <td className="px-4 py-3 text-sm">{b.guest}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{b.checkIn}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{b.checkOut}</td>
                  <td className="px-4 py-3 text-sm">{b.room}</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{b.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${statusColors[b.status]}`}>
                      {b.status.replace("-", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-white/30">
            <Calendar className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>No bookings found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== PROPERTIES TAB =====================
function PropertiesTab({ properties }: { properties: Property[] }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{properties.length} properties</p>
        <button className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
          <Plus size={16} />
          Add Property
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group rounded-xl border border-white/5 bg-white/5 p-5 backdrop-blur transition hover:border-emerald-500/20"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl">
                  {p.image}
                </div>
                <div>
                  <h4 className="font-semibold">{p.name}</h4>
                  <p className="text-xs text-white/40">{p.location}</p>
                </div>
              </div>
              <button className="rounded p-1 text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-white/5">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-white/5 p-3">
              <div className="text-center">
                <p className="text-xs text-white/40">Rooms</p>
                <p className="text-sm font-semibold">{p.rooms}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/40">Occupancy</p>
                <p className="text-sm font-semibold text-emerald-400">{p.occupancy}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/40">Revenue</p>
                <p className="text-sm font-semibold">₹{(p.revenue / 1000).toFixed(0)}K</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.occupancy}%` }} />
              </div>
              <span className="ml-3 text-xs text-white/40">{p.occupancy}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ===================== ANALYTICS TAB =====================
function AnalyticsTab({ revenueData, occupancyData }: any) {
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-sm font-semibold">Weekly Revenue</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="day" stroke="#ffffff30" fontSize={12} />
                <YAxis stroke="#ffffff30" fontSize={12} tickFormatter={(v) => `₹${v / 1000}K`} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8 }}
                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings Chart */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-sm font-semibold">Daily Bookings</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="day" stroke="#ffffff30" fontSize={12} />
                <YAxis stroke="#ffffff30" fontSize={12} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8 }} />
                <Area type="monotone" dataKey="bookings" stroke="#6366f1" fill="url(#bookingGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-6 backdrop-blur">
        <h3 className="mb-4 text-sm font-semibold">Key Metrics</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Avg. Daily Rate", value: "₹4,800", change: "+6%" },
            { label: "RevPAR", value: "₹3,950", change: "+8%" },
            { label: "Avg. Stay", value: "2.4 nights", change: "+2%" },
            { label: "Conversion", value: "18.6%", change: "-1%" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-white/5 bg-white/5 p-4 text-center">
              <p className="text-xs text-white/40">{m.label}</p>
              <p className="mt-1 text-lg font-bold">{m.value}</p>
              <p className={`mt-0.5 text-xs ${m.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                {m.change}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
