import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  Save,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  Star,
  Clock,
  UserCheck,
  ChevronDown,
  Filter,
} from "lucide-react";
import { format, parseISO, isToday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

// Types
type Guest = {
  id: string;
  hotel_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_bookings: number;
  total_spent: number;
  last_stay_at: string | null;
  next_stay_at: string | null;
  notes: string | null;
  created_at: string;
  preferred_room_type?: string;
};

type Booking = {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  status: string;
  room_type: string;
};

const DATE_FILTERS = [
  { value: "all", label: "All Guests" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Date" },
];

const SORT_OPTIONS = [
  { value: "most_stays", label: "Most Stays" },
  { value: "last_stay", label: "Last Stay" },
  { value: "alphabetical", label: "A-Z" },
];

export default function PartnerGuests() {
  const { loading: gate, hotelId } = usePartnerHotel();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<Partial<Guest> | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [sortBy, setSortBy] = useState("most_stays");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "upcoming">("all");

  // Load data
  useEffect(() => {
    if (!hotelId) return;
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load guests
      const { data: guestData } = await supabase.from("hotel_guests").select("*").eq("hotel_id", hotelId);

      // Load bookings for calendar
      const { data: bookingData } = await supabase
        .from("hotel_bookings")
        .select("*")
        .eq("hotel_id", hotelId)
        .in("status", ["confirmed", "checked_in", "checked_out"]);

      setBookings(bookingData || []);

      // Auto-derive guests from bookings if empty
      if (!guestData || guestData.length === 0) {
        const byKey: Record<string, Guest> = {};
        (bookingData || []).forEach((b: any) => {
          const key = (b.guest_phone || b.guest_email || b.guest_name || "").toLowerCase();
          if (!key) return;
          if (!byKey[key]) {
            byKey[key] = {
              id: key,
              hotel_id: hotelId,
              name: b.guest_name,
              email: b.guest_email,
              phone: b.guest_phone,
              total_bookings: 0,
              total_spent: 0,
              last_stay_at: null,
              next_stay_at: null,
              notes: null,
              created_at: new Date().toISOString(),
              preferred_room_type: b.room_type,
            };
          }
          byKey[key].total_bookings += 1;
          byKey[key].total_spent += Number(b.total_amount || 0);
          if (!byKey[key].last_stay_at || b.check_out > byKey[key].last_stay_at!) {
            byKey[key].last_stay_at = b.check_out;
          }
          if (!byKey[key].next_stay_at || b.check_in < byKey[key].next_stay_at!) {
            byKey[key].next_stay_at = b.check_in;
          }
        });
        setGuests(Object.values(byKey));
      } else {
        setGuests(guestData);
      }
    } catch (error) {
      toast.error("Failed to load guests");
    } finally {
      setLoading(false);
    }
  };

  // Filter guests by date
  const filterByDate = (guest: Guest) => {
    if (dateFilter === "all") return true;

    const lastStay = guest.last_stay_at ? parseISO(guest.last_stay_at) : null;
    const nextStay = guest.next_stay_at ? parseISO(guest.next_stay_at) : null;

    // For custom date, check if guest has any stay on that date
    if (dateFilter === "custom" && customDate) {
      const dateStr = format(customDate, "yyyy-MM-dd");
      // Check if guest has a stay on this date (either last stay or next stay matches)
      const hasStayOnDate =
        (guest.last_stay_at && format(parseISO(guest.last_stay_at), "yyyy-MM-dd") === dateStr) ||
        (guest.next_stay_at && format(parseISO(guest.next_stay_at), "yyyy-MM-dd") === dateStr);

      return hasStayOnDate;
    }

    // For preset filters
    switch (dateFilter) {
      case "today":
        return (lastStay && isToday(lastStay)) || (nextStay && isToday(nextStay));
      case "week":
        return (lastStay && isThisWeek(lastStay)) || (nextStay && isThisWeek(nextStay));
      case "month":
        return (lastStay && isThisMonth(lastStay)) || (nextStay && isThisMonth(nextStay));
      default:
        return true;
    }
  };

  // Additional tab filtering
  const filterByTab = (guest: Guest) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") {
      // Guest has stayed in the last 30 days or has upcoming stay
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const lastStay = guest.last_stay_at ? parseISO(guest.last_stay_at) : null;
      const nextStay = guest.next_stay_at ? parseISO(guest.next_stay_at) : null;
      return (lastStay && lastStay > thirtyDaysAgo) || (nextStay && nextStay > new Date());
    }
    if (activeTab === "upcoming") {
      // Guest has upcoming stay
      const nextStay = guest.next_stay_at ? parseISO(guest.next_stay_at) : null;
      return nextStay && nextStay > new Date();
    }
    return true;
  };

  // Search and filter guests
  const filteredGuests = useMemo(() => {
    let result = guests;

    // Search
    if (searchQuery.trim()) {
      const term = searchQuery.trim().toLowerCase();
      result = result.filter((g) => `${g.name} ${g.email || ""} ${g.phone || ""}`.toLowerCase().includes(term));
    }

    // Date filter
    result = result.filter(filterByDate);

    // Tab filter
    result = result.filter(filterByTab);

    // Sort
    switch (sortBy) {
      case "most_stays":
        result.sort((a, b) => b.total_bookings - a.total_bookings);
        break;
      case "last_stay":
        result.sort((a, b) => {
          if (!a.last_stay_at && !b.last_stay_at) return 0;
          if (!a.last_stay_at) return 1;
          if (!b.last_stay_at) return -1;
          return new Date(b.last_stay_at).getTime() - new Date(a.last_stay_at).getTime();
        });
        break;
      case "alphabetical":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return result;
  }, [guests, searchQuery, dateFilter, customDate, sortBy, activeTab]);

  // Get guest bookings for details view
  const getGuestBookings = (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return [];

    return bookings.filter(
      (b) => b.guest_phone === guest.phone || b.guest_email === guest.email || b.guest_name === guest.name,
    );
  };

  const saveGuest = async () => {
    if (!editing || !hotelId) return;
    if (!editing.name?.trim()) {
      toast.error("Name required");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        hotel_id: hotelId,
        name: editing.name,
        email: editing.email || null,
        phone: editing.phone || null,
        notes: editing.notes || null,
        preferred_room_type: editing.preferred_room_type || null,
      };

      if (editing.id && !editing.id.includes("@") && editing.id.length === 36) {
        const { error } = await supabase.from("hotel_guests").update(payload).eq("id", editing.id);
        if (error) throw error;
        setGuests((gs) => gs.map((g) => (g.id === editing.id ? { ...g, ...payload } : g)));
      } else {
        const { data, error } = await supabase.from("hotel_guests").insert(payload).select().single();
        if (error) throw error;
        setGuests((gs) => [data as Guest, ...gs.filter((g) => g.id !== editing.id)]);
      }
      toast.success("Guest saved successfully");
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save guest");
    } finally {
      setSaving(false);
    }
  };

  const deleteGuest = async (id: string) => {
    if (id.length !== 36) {
      setGuests((gs) => gs.filter((g) => g.id !== id));
      return;
    }
    if (!confirm("Are you sure you want to delete this guest?")) return;

    try {
      const { error } = await supabase.from("hotel_guests").delete().eq("id", id);
      if (error) throw error;
      setGuests((gs) => gs.filter((g) => g.id !== id));
      toast.success("Guest deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete guest");
    }
  };

  const getGuestStatus = (guest: Guest) => {
    if (guest.total_bookings > 5) return "loyal";
    if (guest.total_bookings > 2) return "regular";
    return "new";
  };

  const getGuestStatusIcon = (status: string) => {
    switch (status) {
      case "loyal":
        return <Star className="h-4 w-4 text-amber-400" />;
      case "regular":
        return <UserCheck className="h-4 w-4 text-emerald-400" />;
      default:
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "loyal":
        return "Loyal";
      case "regular":
        return "Regular";
      default:
        return "New";
    }
  };

  if (gate || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <PartnerNav />
        <PartnerSubNav />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <PartnerNav />
      <PartnerSubNav />

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-400">Guest CRM</p>
              <h1 className="text-3xl font-bold tracking-tight">Guests</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your guest relationships and view stay history
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setEditing({ name: "" })}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Guest
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Total Guests</p>
              <p className="text-2xl font-bold">{guests.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Loyal Guests</p>
              <p className="text-2xl font-bold">{guests.filter((g) => g.total_bookings > 5).length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Repeat Guests</p>
              <p className="text-2xl font-bold">{guests.filter((g) => g.total_bookings > 1).length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                ₹{guests.reduce((sum, g) => sum + g.total_spent, 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("all")}
            className={activeTab === "all" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
          >
            All Guests
          </Button>
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("active")}
            className={activeTab === "active" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
          >
            Active
          </Button>
          <Button
            variant={activeTab === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("upcoming")}
            className={activeTab === "upcoming" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
          >
            Upcoming Stays
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search guests by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {dateFilter === "custom" && customDate
                    ? format(customDate, "dd MMM yyyy")
                    : DATE_FILTERS.find((f) => f.value === dateFilter)?.label || "Filter by date"}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2">
                  <div className="space-y-1">
                    {DATE_FILTERS.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => {
                          setDateFilter(filter.value);
                          if (filter.value !== "custom") setCustomDate(undefined);
                        }}
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-sm text-left transition-colors",
                          dateFilter === filter.value ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                    {dateFilter === "custom" && (
                      <div className="mt-2 pt-2 border-t">
                        <Calendar mode="single" selected={customDate} onSelect={setCustomDate} initialFocus />
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Filter */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Guest Cards */}
        {filteredGuests.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No guests found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchQuery || dateFilter !== "all" || activeTab !== "all"
                  ? "Try adjusting your filters to see more results"
                  : "Guests will appear here as they check in"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGuests.map((guest) => {
              const status = getGuestStatus(guest);
              const guestBookings = getGuestBookings(guest.id);
              const upcomingStay = guestBookings.find((b) => b.check_in && new Date(b.check_in) > new Date());

              return (
                <Card key={guest.id} className="group relative overflow-hidden transition-all hover:shadow-lg border">
                  <CardContent
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      setSelectedGuest(guest);
                      setShowGuestDetails(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">{guest.name}</h4>
                          {getGuestStatusIcon(status)}
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {getStatusLabel(status)}
                        </Badge>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(guest);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGuest(guest.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1 text-sm">
                      {guest.phone && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{guest.phone}</span>
                        </p>
                      )}
                      {guest.email && (
                        <p className="flex items-center gap-2 text-muted-foreground truncate">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{guest.email}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Stays</p>
                        <p className="font-semibold">{guest.total_bookings}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="font-semibold">₹{guest.total_spent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last stay</p>
                        <p className="font-semibold text-sm">
                          {guest.last_stay_at ? format(parseISO(guest.last_stay_at), "dd MMM yyyy") : "—"}
                        </p>
                      </div>
                    </div>

                    {upcomingStay && (
                      <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-500/10 px-2 py-1">
                        <Clock className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-xs text-blue-400">
                          Next stay: {format(parseISO(upcomingStay.check_in), "dd MMM")}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Guest Details Dialog */}
      <Dialog open={showGuestDetails} onOpenChange={setShowGuestDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedGuest && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{selectedGuest.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {selectedGuest.total_bookings} bookings
                      </Badge>
                      {selectedGuest.total_bookings > 5 && (
                        <Badge className="bg-amber-500/15 text-amber-400 text-xs">Loyal Guest</Badge>
                      )}
                    </DialogDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(selectedGuest);
                      setShowGuestDetails(false);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Contact</Label>
                    {selectedGuest.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedGuest.phone}
                      </p>
                    )}
                    {selectedGuest.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedGuest.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Statistics</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Spent</p>
                        <p className="font-semibold">₹{selectedGuest.total_spent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Stay</p>
                        <p className="font-semibold">
                          {selectedGuest.last_stay_at
                            ? format(parseISO(selectedGuest.last_stay_at), "dd MMM yyyy")
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking History */}
                <div>
                  <Label className="text-muted-foreground">Booking History</Label>
                  <div className="mt-2 space-y-2">
                    {getGuestBookings(selectedGuest.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No bookings found</p>
                    ) : (
                      getGuestBookings(selectedGuest.id)
                        .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime())
                        .map((booking, idx) => (
                          <div key={idx} className="rounded-md border p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {format(parseISO(booking.check_in), "dd MMM yyyy")} -
                                  {format(parseISO(booking.check_out), "dd MMM yyyy")}
                                </p>
                                <p className="text-sm text-muted-foreground">{booking.room_type || "Standard"}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">₹{booking.total_amount.toLocaleString()}</p>
                                <Badge variant="outline" className="text-xs">
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {selectedGuest.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="mt-1 text-sm bg-muted/50 rounded-md p-3">{selectedGuest.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Add Guest Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id && editing.id.length === 36 ? "Edit Guest" : "Add Guest"}</DialogTitle>
            <DialogDescription>
              {editing?.id && editing.id.length === 36 ? "Update guest information" : "Add a new guest to your CRM"}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Guest's full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editing.phone || ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editing.email || ""}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div>
                <Label>Preferred Room Type</Label>
                <Input
                  value={editing.preferred_room_type || ""}
                  onChange={(e) => setEditing({ ...editing, preferred_room_type: e.target.value })}
                  placeholder="e.g., Deluxe Suite, Ocean View"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Special requests, preferences, or notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveGuest}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
