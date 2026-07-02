import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Hotel, Plus, Edit, Trash2, Eye, Calendar, Users, TrendingUp,
  IndianRupee, Star, MapPin, Phone, Mail, Loader2, BarChart3,
  BedDouble, CheckCircle2, XCircle, Clock, Building2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PartnerHotel {
  id: string;
  name: string;
  city: string;
  locality: string;
  address: string | null;
  star_rating: number | null;
  price_per_night: number;
  discount_percentage: number | null;
  amenities: string[] | null;
  images: string[] | null;
  contact_phone: string | null;
  contact_email: string | null;
  description: string | null;
  total_rooms: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  is_active: boolean | null;
  manager_id: string | null;
  created_at: string;
}

interface HotelBooking {
  id: string;
  hotel_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  room_type: string;
  num_guests: number;
  num_rooms: number;
  total_amount: number;
  status: string;
  special_requests: string | null;
  booking_type: string;
  created_at: string;
}

const emptyHotel = {
  name: "", city: "", locality: "", address: "", star_rating: 3,
  price_per_night: 0, discount_percentage: 0, amenities: [] as string[],
  images: [] as string[], contact_phone: "", contact_email: "",
  description: "", total_rooms: 50, check_in_time: "14:00",
  check_out_time: "12:00", is_active: true,
};

const amenityOptions = [
  "WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar",
  "Business Center", "Parking", "Breakfast", "Concierge",
  "Room Service", "Laundry", "Airport Shuttle", "Pet Friendly"
];

const HotelManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [hotels, setHotels] = useState<PartnerHotel[]>([]);
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingHotel, setEditingHotel] = useState<PartnerHotel | null>(null);
  const [formData, setFormData] = useState(emptyHotel);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // First-login gate: if the hotel account hasn't submitted the setup wizard,
    // send them to /hotels/partner. We check hotel_partner_applications for a row
    // belonging to this user (any status = setup completed / in review).
    (async () => {
      if (authLoading) return;
      if (!user) return; // let existing auth flow handle unauth
      const { data } = await supabase
        .from("hotel_partner_applications" as any)
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (!data || data.length === 0) {
        navigate("/hotels/partner", { replace: true });
        return;
      }
      fetchHotels();
      fetchBookings();
    })();
  }, [user, authLoading, navigate]);

  const fetchHotels = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_hotels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHotels(data || []);
    } catch (err: any) {
      console.error("Error fetching hotels:", err);
      toast.error("Failed to load hotels");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("hotel_bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
    }
  };

  const handleSaveHotel = async () => {
    if (!formData.name || !formData.city || !formData.locality) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const hotelData = {
        ...formData,
        manager_id: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (editingHotel) {
        const { error } = await supabase
          .from("partner_hotels")
          .update(hotelData)
          .eq("id", editingHotel.id);
        if (error) throw error;
        toast.success("Hotel updated successfully!");
      } else {
        const { error } = await supabase
          .from("partner_hotels")
          .insert([hotelData]);
        if (error) throw error;
        toast.success("Hotel created successfully!");
      }

      setShowCreateDialog(false);
      setEditingHotel(null);
      setFormData(emptyHotel);
      fetchHotels();
    } catch (err: any) {
      console.error("Error saving hotel:", err);
      toast.error("Failed to save hotel");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHotel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hotel?")) return;
    try {
      const { error } = await supabase
        .from("partner_hotels")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Hotel deleted");
      fetchHotels();
    } catch (err: any) {
      toast.error("Failed to delete hotel");
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("hotel_bookings")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", bookingId);
      if (error) throw error;
      toast.success(`Booking ${newStatus}`);
      fetchBookings();
    } catch (err: any) {
      toast.error("Failed to update booking");
    }
  };

  const openEditDialog = (hotel: PartnerHotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      city: hotel.city,
      locality: hotel.locality,
      address: hotel.address || "",
      star_rating: hotel.star_rating || 3,
      price_per_night: hotel.price_per_night,
      discount_percentage: hotel.discount_percentage || 0,
      amenities: hotel.amenities || [],
      images: hotel.images || [],
      contact_phone: hotel.contact_phone || "",
      contact_email: hotel.contact_email || "",
      description: hotel.description || "",
      total_rooms: hotel.total_rooms || 50,
      check_in_time: hotel.check_in_time || "14:00",
      check_out_time: hotel.check_out_time || "12:00",
      is_active: hotel.is_active ?? true,
    });
    setShowCreateDialog(true);
  };

  // Analytics calculations
  const totalRevenue = bookings
    .filter(b => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.total_amount, 0);
  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
  const totalGuests = bookings
    .filter(b => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.num_guests, 0);
  const avgBookingValue = bookings.length > 0 ? totalRevenue / bookings.filter(b => b.status !== "cancelled").length : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 pt-10 md:pt-12 pb-12">
        <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Hotel className="h-8 w-8 text-primary" />
                  Hotel Manager Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your hotel listings, bookings, and performance
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingHotel(null);
                  setFormData(emptyHotel);
                  setShowCreateDialog(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Hotel
              </Button>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-lg">
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="hotels" className="gap-1.5">
                <Building2 className="h-4 w-4" />
                Hotels
              </TabsTrigger>
              <TabsTrigger value="bookings" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Hotels</p>
                        <p className="text-3xl font-bold">{hotels.length}</p>
                      </div>
                      <Hotel className="h-10 w-10 text-primary/30" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                      </div>
                      <IndianRupee className="h-10 w-10 text-primary/30" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Bookings</p>
                        <p className="text-3xl font-bold">{pendingBookings}</p>
                      </div>
                      <Clock className="h-10 w-10 text-amber-500/30" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Guests</p>
                        <p className="text-3xl font-bold">{totalGuests}</p>
                      </div>
                      <Users className="h-10 w-10 text-primary/30" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bookings.slice(0, 5).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No bookings yet</p>
                    ) : (
                      <div className="space-y-3">
                        {bookings.slice(0, 5).map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium">{booking.guest_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(booking.check_in), "MMM d")} - {format(new Date(booking.check_out), "MMM d, yyyy")}
                              </p>
                            </div>
                            <Badge variant={
                              booking.status === "confirmed" ? "default" :
                              booking.status === "pending" ? "secondary" :
                              booking.status === "cancelled" ? "destructive" : "outline"
                            }>
                              {booking.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Hotel Listings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hotels.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No hotels listed yet</p>
                    ) : (
                      <div className="space-y-3">
                        {hotels.slice(0, 5).map((hotel) => (
                          <div key={hotel.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                                {hotel.images?.[0] && (
                                  <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{hotel.name}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {hotel.city}
                                </p>
                              </div>
                            </div>
                            <Badge variant={hotel.is_active ? "default" : "secondary"}>
                              {hotel.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Hotels Tab */}
            <TabsContent value="hotels">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {hotels.map((hotel, i) => (
                    <motion.div
                      key={hotel.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
                        <div className="relative h-40 overflow-hidden">
                          <img
                            src={hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"}
                            alt={hotel.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                           loading="lazy" decoding="async" />
                          <Badge
                            className="absolute top-3 left-3"
                            variant={hotel.is_active ? "default" : "secondary"}
                          >
                            {hotel.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-medium">{hotel.star_rating}</span>
                          </div>
                        </div>
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg">{hotel.name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {hotel.locality}, {hotel.city}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-primary font-bold text-lg">
                              ₹{hotel.price_per_night.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/night</span>
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {hotel.total_rooms} rooms
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {hotel.amenities?.slice(0, 4).map((a) => (
                              <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                            ))}
                            {(hotel.amenities?.length || 0) > 4 && (
                              <Badge variant="outline" className="text-xs">+{(hotel.amenities?.length || 0) - 4}</Badge>
                            )}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => window.open(`/hotels/${hotel.id}`, "_blank", "noopener,noreferrer")}>
                              <Eye className="h-3 w-3" /> View
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEditDialog(hotel)}>
                              <Edit className="h-3 w-3" /> Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDeleteHotel(hotel.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {hotels.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <Hotel className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Hotels Yet</h3>
                    <p className="text-muted-foreground mb-6">Start by adding your first hotel listing</p>
                    <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Hotel
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <div className="text-center py-16">
                      <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Bookings Yet</h3>
                      <p className="text-muted-foreground">Bookings will appear here once guests start booking</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left p-3 font-medium text-muted-foreground">Guest</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Dates</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Room</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((booking) => (
                            <tr key={booking.id} className="border-b border-border/30 hover:bg-muted/20">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium">{booking.guest_name}</p>
                                  <p className="text-xs text-muted-foreground">{booking.guest_email}</p>
                                </div>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {format(new Date(booking.check_in), "MMM d")} - {format(new Date(booking.check_out), "MMM d")}
                              </td>
                              <td className="p-3">
                                <span>{booking.room_type}</span>
                                <span className="text-xs text-muted-foreground ml-1">×{booking.num_rooms}</span>
                              </td>
                              <td className="p-3 font-medium">₹{booking.total_amount.toLocaleString()}</td>
                              <td className="p-3">
                                <Badge variant={
                                  booking.status === "confirmed" ? "default" :
                                  booking.status === "pending" ? "secondary" :
                                  booking.status === "checked_in" ? "default" :
                                  booking.status === "cancelled" ? "destructive" : "outline"
                                }>
                                  {booking.status}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  {booking.status === "pending" && (
                                    <>
                                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}>
                                        <CheckCircle2 className="h-3 w-3" /> Confirm
                                      </Button>
                                      <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}>
                                        <XCircle className="h-3 w-3" /> Cancel
                                      </Button>
                                    </>
                                  )}
                                  {booking.status === "confirmed" && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleUpdateBookingStatus(booking.id, "checked_in")}>
                                      <CheckCircle2 className="h-3 w-3" /> Check In
                                    </Button>
                                  )}
                                  {booking.status === "checked_in" && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleUpdateBookingStatus(booking.id, "checked_out")}>
                                      <CheckCircle2 className="h-3 w-3" /> Check Out
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Avg. Booking Value</p>
                    <p className="text-3xl font-bold mt-1">₹{Math.round(avgBookingValue).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Confirmed Rate</p>
                    <p className="text-3xl font-bold mt-1">
                      {bookings.length > 0 ? Math.round((confirmedBookings / bookings.length) * 100) : 0}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Active Hotels</p>
                    <p className="text-3xl font-bold mt-1">{hotels.filter(h => h.is_active).length}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue by Hotel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue by Hotel</CardTitle>
                </CardHeader>
                <CardContent>
                  {hotels.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Add hotels to see analytics</p>
                  ) : (
                    <div className="space-y-4">
                      {hotels.map((hotel) => {
                        const hotelBookings = bookings.filter(b => b.hotel_id === hotel.id && b.status !== "cancelled");
                        const hotelRevenue = hotelBookings.reduce((s, b) => s + b.total_amount, 0);
                        const maxRevenue = Math.max(...hotels.map(h => 
                          bookings.filter(b => b.hotel_id === h.id && b.status !== "cancelled")
                            .reduce((s, b) => s + b.total_amount, 0)
                        ), 1);

                        return (
                          <div key={hotel.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{hotel.name}</span>
                              <span className="text-sm text-muted-foreground">
                                ₹{hotelRevenue.toLocaleString()} · {hotelBookings.length} bookings
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${(hotelRevenue / maxRevenue) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create/Edit Hotel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHotel ? "Edit Hotel" : "Add New Hotel"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hotel Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Grand Hyatt" />
            </div>
            <div className="space-y-2">
              <Label>Star Rating</Label>
              <Select value={String(formData.star_rating)} onValueChange={(v) => setFormData({ ...formData, star_rating: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(r => <SelectItem key={r} value={String(r)}>{r} Star{r > 1 ? 's' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="e.g. Hyderabad" />
            </div>
            <div className="space-y-2">
              <Label>Locality *</Label>
              <Input value={formData.locality} onChange={(e) => setFormData({ ...formData, locality: e.target.value })} placeholder="e.g. HITEC City" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Full address" />
            </div>
            <div className="space-y-2">
              <Label>Price per Night (₹)</Label>
              <Input type="number" value={formData.price_per_night} onChange={(e) => setFormData({ ...formData, price_per_night: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Discount %</Label>
              <Input type="number" value={formData.discount_percentage} onChange={(e) => setFormData({ ...formData, discount_percentage: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Total Rooms</Label>
              <Input type="number" value={formData.total_rooms} onChange={(e) => setFormData({ ...formData, total_rooms: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="+91 ..." />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Check-in Time</Label>
              <Input value={formData.check_in_time} onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })} placeholder="14:00" />
            </div>
            <div className="space-y-2">
              <Label>Check-out Time</Label>
              <Input value={formData.check_out_time} onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })} placeholder="12:00" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of the hotel..." rows={3} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Image URL</Label>
              <Input 
                value={formData.images[0] || ""} 
                onChange={(e) => setFormData({ ...formData, images: e.target.value ? [e.target.value] : [] })} 
                placeholder="https://images.unsplash.com/..." 
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {amenityOptions.map((amenity) => (
                  <Badge
                    key={amenity}
                    variant={formData.amenities.includes(amenity) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        amenities: formData.amenities.includes(amenity)
                          ? formData.amenities.filter(a => a !== amenity)
                          : [...formData.amenities, amenity]
                      });
                    }}
                  >
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              <Label>Hotel is active and visible to guests</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveHotel} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingHotel ? "Update Hotel" : "Create Hotel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default HotelManagerDashboard;
