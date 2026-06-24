import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hotel, MapPin, BedDouble, Sparkles, Image as ImageIcon, FileCheck,
  Check, ChevronLeft, ChevronRight, Loader2, Upload, X, ShieldCheck,
  Plus, Trash2, Pencil, ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import InlineLocationSearch from "@/components/location/InlineLocationSearch";
import GoogleMapPicker from "@/components/location/GoogleMapPicker";
import { loadGoogleMaps, createSessionToken, fetchAutocompleteSuggestions, fetchPlaceDetails } from "@/lib/googleMaps";
import { Search } from "lucide-react";
import { INDIAN_CITIES } from "@/data/indianCities";

const STEPS = [
  { id: 1, label: "Basics", icon: Hotel },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Rooms", icon: BedDouble },
  { id: 4, label: "Amenities", icon: Sparkles },
  { id: 5, label: "Photos", icon: ImageIcon },
  { id: 6, label: "Documents", icon: FileCheck },
];

const BUSINESS_TYPES = ["Hotel", "Resort", "Homestay", "Service Apartment"];
const ROOM_TYPE_OPTIONS = [
  "Standard Room", "Deluxe Room", "Premium Deluxe Room", "Executive Room",
  "Family Room", "Junior Suite", "Suite Room", "Presidential Suite",
  "Dormitory", "Villa", "Cottage", "Tent", "Other",
];
const ROOM_AMENITIES = [
  "Air Conditioner", "WiFi", "TV", "Balcony", "Mini Fridge", "Bathtub",
  "Room Service", "Coffee Maker", "Work Desk", "Wardrobe", "Sea View",
  "Mountain View", "Pool View", "Kitchenette",
];
const AMENITIES = [
  "Free WiFi", "Parking", "Air Conditioning", "Restaurant",
  "Room Service", "Swimming Pool", "Gym", "24x7 Reception", "Breakfast Included",
];
const CITIES = INDIAN_CITIES;

export type RoomCategory = {
  id: string;
  room_type: string;
  custom_room_name?: string;
  room_count: number;
  room_size_sqft?: number | null;
  max_occupancy: number;
  base_price: number;
  weekend_price?: number | null;
  extra_bed_available: boolean;
  children_allowed: boolean;
  amenities: string[];
};

type FormState = {
  hotel_name: string; owner_name: string; email: string; phone: string; business_type: string;
  city: string; locality: string; address: string; pincode: string; latitude: number | null; longitude: number | null;
  room_categories: RoomCategory[];
  total_rooms: number; room_types: string[]; price_min: number; price_max: number;
  check_in_time: string; check_out_time: string; check_in_24h: boolean; front_desk_24h: boolean;
  amenities: string[];
  photos: string[];
  business_registration_url: string; id_proof_url: string; gst_certificate_url: string;
};

const initial: FormState = {
  hotel_name: "", owner_name: "", email: "", phone: "", business_type: "Hotel",
  city: "", locality: "", address: "", pincode: "", latitude: null, longitude: null,
  room_categories: [],
  total_rooms: 0, room_types: [], price_min: 0, price_max: 0,
  check_in_time: "14:00", check_out_time: "12:00", check_in_24h: false, front_desk_24h: false,
  amenities: [],
  photos: [],
  business_registration_url: "", id_proof_url: "", gst_certificate_url: "",
};

const phoneRegex = /^[6-9]\d{9}$/;

export default function HotelPartnerOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormState>(initial);
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setData((d) => ({ ...d, email: d.email || user.email || "" }));
      }
    });
  }, []);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setData((d) => ({ ...d, [k]: v }));
  const toggleInArray = (k: "room_types" | "amenities", val: string) =>
    setData((d) => ({ ...d, [k]: d[k].includes(val) ? d[k].filter((x) => x !== val) : [...d[k], val] }));

  const validateStep = (): string | null => {
    if (step === 1) {
      const s = z.object({
        hotel_name: z.string().trim().min(2, "Hotel name required").max(120),
        owner_name: z.string().trim().min(2, "Owner name required").max(80),
        email: z.string().trim().email("Valid email required"),
        phone: z.string().regex(phoneRegex, "Enter a valid 10-digit phone"),
        business_type: z.string().min(1),
      }).safeParse(data);
      return s.success ? null : s.error.issues[0].message;
    }
    if (step === 2) {
      if (!data.city) return "Select a city";
      if (!data.locality.trim()) return "Locality required";
      if (!data.address.trim()) return "Address required";
      if (!/^\d{6}$/.test(data.pincode)) return "Valid 6-digit pincode required";
      if (data.latitude === null || data.longitude === null) return "Pin your exact location on the map";
      return null;
    }
    if (step === 3) {
      if (!data.room_categories || data.room_categories.length === 0) return "Add at least one room category";
      for (const rc of data.room_categories) {
        if (!rc.room_type) return "Room type is required for every category";
        if (rc.room_type === "Other" && !rc.custom_room_name?.trim()) return "Custom room name required";
        if (!rc.room_count || rc.room_count <= 0) return "Number of rooms must be greater than 0";
        if (!rc.max_occupancy || rc.max_occupancy <= 0) return "Maximum occupancy must be greater than 0";
        if (!rc.base_price || rc.base_price <= 0) return "Base price must be greater than 0";
      }
      if (!data.check_in_time || !data.check_out_time) return "Check-in & check-out time required";
      return null;
    }
    if (step === 4) return data.amenities.length === 0 ? "Pick a few amenities" : null;
    if (step === 5) return data.photos.length < 3 ? "Upload at least 3 photos" : null;
    if (step === 6) {
      if (!data.business_registration_url) return "Business registration required";
      if (!data.id_proof_url) return "ID proof required";
      return null;
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setStep((s) => Math.min(6, s + 1));
  };

  const uploadFile = async (file: File, bucket: "hotel-photos" | "hotel-documents", key: string) => {
    setUploading(key);
    try {
      const ext = file.name.split(".").pop();
      const folder = userId || "anon";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (error) throw error;
      if (bucket === "hotel-photos") {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        update("photos", [...data.photos, pub.publicUrl]);
      } else {
        if (key === "business_registration_url") update("business_registration_url", path);
        if (key === "id_proof_url") update("id_proof_url", path);
        if (key === "gst_certificate_url") update("gst_certificate_url", path);
      }
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setSubmitting(true);
    try {
      const cats = data.room_categories;
      const total_rooms = cats.reduce((s, c) => s + (c.room_count || 0), 0);
      const prices = cats.map((c) => c.base_price).filter((p) => p > 0);
      const price_min = prices.length ? Math.min(...prices) : 0;
      const price_max = prices.length ? Math.max(...prices) : 0;
      const room_types = Array.from(new Set(cats.map((c) => c.room_type === "Other" ? (c.custom_room_name || "Other") : c.room_type)));
      const payload = {
        ...data,
        total_rooms,
        price_min,
        price_max,
        room_types,
      };
      const { data: inserted, error } = await supabase
        .from("hotel_partner_applications")
        .insert({
          user_id: userId,
          ...payload,
          status: "pending",
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      // Persist application id locally so anonymous applicants can track status
      try {
        const existing = JSON.parse(localStorage.getItem("hotel_partner_applications") || "[]");
        const next = [{ id: inserted.id, hotel_name: data.hotel_name, submitted_at: new Date().toISOString() }, ...existing].slice(0, 10);
        localStorage.setItem("hotel_partner_applications", JSON.stringify(next));
      } catch {}
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => (step / STEPS.length) * 100, [step]);

  if (submitted) return <SuccessScreen onGoStatus={() => navigate("/hotels/partner/status")} hotelName={data.hotel_name} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Hero header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Verified Partner Program</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Become a JaagaX Partner Hotel</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get featured to thousands of property buyers visiting nearby projects. Premium placement, verified badge, zero listing fees.
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-6 border-emerald-500/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Step {step} of {STEPS.length}: <span className="text-emerald-400">{STEPS[step-1].label}</span></p>
              <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            <div className="hidden md:flex items-center justify-between gap-2">
              {STEPS.map((s) => {
                const Ic = s.icon;
                const done = s.id < step; const current = s.id === step;
                return (
                  <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                      done ? "bg-emerald-500 text-emerald-950" : current ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {done ? <Check className="h-4 w-4" /> : <Ic className="h-4 w-4" />}
                    </div>
                    <span className={`text-xs ${current ? "text-emerald-400 font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step body */}
        <Card className="border-emerald-500/10">
          <CardContent className="p-5 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && <Step1 data={data} update={update} />}
                {step === 2 && <Step2 data={data} update={update} />}
                {step === 3 && <Step3 data={data} update={update} />}
                {step === 4 && <Step4 data={data} toggle={(v) => toggleInArray("amenities", v)} />}
                {step === 5 && <Step5 data={data} update={update} uploadFile={uploadFile} uploading={uploading} />}
                {step === 6 && <Step6 data={data} uploadFile={uploadFile} uploading={uploading} />}
              </motion.div>
            </AnimatePresence>

            {/* Nav */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
              <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step < 6 ? (
                <Button onClick={next} variant="premium">Continue <ChevronRight className="h-4 w-4" /></Button>
              ) : (
                <Button onClick={submit} variant="premium" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Submit Application <Check className="h-4 w-4" /></>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Steps ---------------- */

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Step1({ data, update }: any) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Tell us about your property</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Hotel / Property Name *"><Input value={data.hotel_name} onChange={(e) => update("hotel_name", e.target.value)} placeholder="The Westin Hyderabad" /></Field>
        <Field label="Owner / Manager Name *"><Input value={data.owner_name} onChange={(e) => update("owner_name", e.target.value)} placeholder="Full name" /></Field>
        <Field label="Email Address *"><Input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="manager@hotel.com" /></Field>
        <Field label="Phone Number *" hint="10-digit Indian mobile"><Input value={data.phone} onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" /></Field>
        <Field label="Business Type *">
          <Select value={data.business_type} onValueChange={(v) => update("business_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function Step2({ data, update }: any) {
  const [mapOpen, setMapOpen] = useState(false);
  const [tempLat, setTempLat] = useState<number | null>(data.latitude);
  const [tempLng, setTempLng] = useState<number | null>(data.longitude);
  // Holds the full normalized location picked from the search box so we can
  // auto-fill city/locality/pincode/address WITHOUT relying on the browser
  // Geocoding API (which the Lovable Google Maps browser key cannot call).
  const [pendingPicked, setPendingPicked] = useState<any | null>(null);

  const cityCenters: Record<string, { lat: number; lng: number }> = {
    Hyderabad: { lat: 17.385, lng: 78.4867 },
    Bangalore: { lat: 12.9716, lng: 77.5946 },
    Mumbai: { lat: 19.076, lng: 72.8777 },
    Pune: { lat: 18.5204, lng: 73.8567 },
    Chennai: { lat: 13.0827, lng: 80.2707 },
    Delhi: { lat: 28.6139, lng: 77.209 },
    Gurgaon: { lat: 28.4595, lng: 77.0266 },
    Noida: { lat: 28.5355, lng: 77.391 },
    Kolkata: { lat: 22.5726, lng: 88.3639 },
    Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  };

  // Reverse-geocode via our edge function (gateway-backed Geocoding API).
  const reverseGeocodeViaEdge = async (lat: number, lng: number) => {
    try {
      const { data: res, error } = await supabase.functions.invoke("reverse-geocode", {
        body: { latitude: lat, longitude: lng },
      });
      if (error || !res) return null;
      return res as { city?: string; locality?: string; pincode?: string; formattedAddress?: string };
    } catch (e) {
      console.warn("[HotelOnboarding] reverse-geocode edge failed", e);
      return null;
    }
  };

  const applyLocation = (loc: { city?: string; locality?: string; pincode?: string; formattedAddress?: string }) => {
    if (loc.city) update("city", loc.city);
    if (loc.locality) update("locality", loc.locality);
    if (loc.pincode) update("pincode", loc.pincode);
    if (loc.formattedAddress) update("address", loc.formattedAddress);
  };

  const confirmMapPin = async () => {
    if (tempLat === null || tempLng === null) {
      toast.error("Drop a pin on the map first");
      return;
    }
    update("latitude", tempLat);
    update("longitude", tempLng);

    if (pendingPicked) {
      applyLocation({
        city: pendingPicked.city,
        locality: pendingPicked.locality,
        pincode: pendingPicked.postalCode,
        formattedAddress: pendingPicked.formattedAddress,
      });
    } else {
      const geocoded = await reverseGeocodeViaEdge(tempLat, tempLng);
      if (geocoded) applyLocation(geocoded);
      else toast.warning("Pinned, but couldn't auto-fill address. Please type city/locality manually.");
    }
    setMapOpen(false);
    setPendingPicked(null);
    toast.success("Location pinned & details filled");
  };

  const cityKey = data.city as string;
  const mapCenter = cityCenters[cityKey] || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Where are you located?</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="City *" hint="Type to search (e.g. 'hy' → Hyderabad)">
          <CityTypeahead
            value={data.city}
            onChange={(v) => update("city", v)}
            onSelect={(v) => {
              update("city", v);
              update("locality", "");
              update("pincode", "");
              update("latitude", null);
              update("longitude", null);
            }}
          />
        </Field>


        <Field label="Locality / Area *" hint={data.city ? `Suggestions inside ${data.city}` : "Pick a city first"}>
          <InlineLocationSearch
            key={data.city || "no-city"}
            variant="box"
            placeholder={data.city ? `Search locality in ${data.city}` : "Select a city first"}
            initialValue={data.locality}
            persistSavedLocation={false}
            onTextChange={(t) => update("locality", t)}
            onSelected={(loc) => {
              update("locality", loc.locality || loc.city || "");
              if (loc.postalCode) update("pincode", loc.postalCode);
              if (loc.latitude && loc.longitude) {
                update("latitude", loc.latitude);
                update("longitude", loc.longitude);
                setTempLat(loc.latitude);
                setTempLng(loc.longitude);
              }
              if (!data.address?.trim() && loc.formattedAddress) update("address", loc.formattedAddress);
            }}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Full Address *">
            <Textarea value={data.address} onChange={(e) => update("address", e.target.value)} placeholder="Street, building, landmark" rows={2} />
          </Field>
        </div>

        <Field label="Pincode *" hint="Auto-filled from locality / map">
          <Input value={data.pincode} onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="500032" />
        </Field>

        <Field label="Pin exact location on map *" hint="Drop a pin to auto-fill coordinates">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              setTempLat(data.latitude);
              setTempLng(data.longitude);
              setPendingPicked(null);
              setMapOpen(true);
            }}
          >
            <MapPin className="h-4 w-4 text-primary" />
            {data.latitude && data.longitude
              ? `Pinned: ${Number(data.latitude).toFixed(5)}, ${Number(data.longitude).toFixed(5)}`
              : "Select location from map"}
          </Button>
        </Field>
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Pin your hotel location
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Search a city/locality or click on the map to drop a pin, then drag to fine-tune. We'll auto-fill address, city, locality and pincode.
          </p>
          <MapSearchBox
            onPick={(loc) => {
              setTempLat(loc.latitude);
              setTempLng(loc.longitude);
              setPendingPicked(loc);
            }}
          />
          <GoogleMapPicker
            lat={tempLat}
            lng={tempLng}
            defaultCenter={mapCenter}
            height="380px"
            label=""
            onChange={(lat, lng) => {
              setTempLat(lat);
              setTempLng(lng);
              setPendingPicked(null);
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapOpen(false)}>Cancel</Button>
            <Button onClick={confirmMapPin} disabled={tempLat === null || tempLng === null}>
              OK, use this location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Step3({ data, update }: any) {
  const cats: RoomCategory[] = data.room_categories || [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<RoomCategory | null>(null);

  const newDraft = (): RoomCategory => ({
    id: (crypto as any)?.randomUUID?.() || `rc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    room_type: "",
    custom_room_name: "",
    room_count: 1,
    room_size_sqft: null,
    max_occupancy: 2,
    base_price: 0,
    weekend_price: null,
    extra_bed_available: false,
    children_allowed: true,
    amenities: [],
  });

  const startAdd = () => { setDraft(newDraft()); setEditingId("__new__"); };
  const startEdit = (rc: RoomCategory) => { setDraft({ ...rc }); setEditingId(rc.id); };
  const cancelEdit = () => { setDraft(null); setEditingId(null); };

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.room_type) return toast.error("Pick a room type");
    if (draft.room_type === "Other" && !draft.custom_room_name?.trim()) return toast.error("Enter custom room name");
    if (!draft.room_count || draft.room_count <= 0) return toast.error("Number of rooms must be > 0");
    if (!draft.max_occupancy || draft.max_occupancy <= 0) return toast.error("Max occupancy must be > 0");
    if (!draft.base_price || draft.base_price <= 0) return toast.error("Base price must be > 0");
    const exists = cats.some((c) => c.id === draft.id);
    const updated = exists ? cats.map((c) => (c.id === draft.id ? draft : c)) : [...cats, draft];
    update("room_categories", updated);
    cancelEdit();
  };

  const removeCat = (id: string) => {
    update("room_categories", cats.filter((c) => c.id !== id));
  };

  const total_rooms = cats.reduce((s, c) => s + (Number(c.room_count) || 0), 0);
  const prices = cats.map((c) => Number(c.base_price)).filter((p) => p > 0);
  const starting = prices.length ? Math.min(...prices) : 0;
  const highest = prices.length ? Math.max(...prices) : 0;

  const toggleAmenity = (a: string) => {
    if (!draft) return;
    setDraft({ ...draft, amenities: draft.amenities.includes(a) ? draft.amenities.filter((x) => x !== a) : [...draft.amenities, a] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Room inventory & pricing</h2>
        <p className="text-sm text-muted-foreground mt-1">Add every room category your property offers. Totals & pricing summary update automatically.</p>
      </div>

      {/* Auto Summary */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Property summary</p>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">Auto-calculated</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStat label="Room categories" value={cats.length.toString()} />
            <SummaryStat label="Total rooms" value={total_rooms.toString()} />
            <SummaryStat label="Starting price" value={starting ? `₹${starting.toLocaleString()}` : "—"} />
            <SummaryStat label="Highest price" value={highest ? `₹${highest.toLocaleString()}` : "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Categories list */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {cats.map((rc) => {
            const isOpen = expanded[rc.id] ?? false;
            const name = rc.room_type === "Other" ? (rc.custom_room_name || "Custom Room") : rc.room_type;
            return (
              <motion.div key={rc.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" className="flex-1 text-left" onClick={() => setExpanded((e) => ({ ...e, [rc.id]: !isOpen }))}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base">{name}</h3>
                          <Badge variant="secondary" className="text-xs">{rc.room_count} rooms</Badge>
                          <Badge variant="secondary" className="text-xs">₹{Number(rc.base_price).toLocaleString()}/night</Badge>
                          <Badge variant="secondary" className="text-xs">{rc.max_occupancy} guests</Badge>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(rc)} aria-label="Edit category"><Pencil className="h-4 w-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeCat(rc.id)} aria-label="Delete category"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setExpanded((e) => ({ ...e, [rc.id]: !isOpen }))} aria-label="Toggle">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-border/50 grid sm:grid-cols-2 gap-2 text-sm">
                        {rc.room_size_sqft ? <Info label="Room size" value={`${rc.room_size_sqft} sq.ft`} /> : null}
                        {rc.weekend_price ? <Info label="Weekend price" value={`₹${Number(rc.weekend_price).toLocaleString()}/night`} /> : null}
                        <Info label="Extra bed" value={rc.extra_bed_available ? "Yes" : "No"} />
                        <Info label="Children allowed" value={rc.children_allowed ? "Yes" : "No"} />
                        {rc.amenities.length > 0 && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">Amenities</p>
                            <div className="flex flex-wrap gap-1.5">
                              {rc.amenities.map((a) => (
                                <span key={a} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{a}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Editor card */}
        {editingId && draft && (
          <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-emerald-500/40">
              <CardContent className="p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{editingId === "__new__" ? "Add room category" : "Edit room category"}</h3>
                  <Button type="button" variant="ghost" size="icon" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Room Type *">
                    <Select value={draft.room_type} onValueChange={(v) => setDraft({ ...draft, room_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                      <SelectContent>
                        {ROOM_TYPE_OPTIONS.map((rt) => (<SelectItem key={rt} value={rt}>{rt}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {draft.room_type === "Other" && (
                    <Field label="Custom Room Name *">
                      <Input value={draft.custom_room_name || ""} onChange={(e) => setDraft({ ...draft, custom_room_name: e.target.value })} placeholder="e.g. Garden View Cabin" />
                    </Field>
                  )}
                  <Field label="Number of Rooms *">
                    <Input type="number" min={1} value={draft.room_count} onChange={(e) => setDraft({ ...draft, room_count: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Room Size (sq.ft)">
                    <Input type="number" min={0} value={draft.room_size_sqft ?? ""} onChange={(e) => setDraft({ ...draft, room_size_sqft: e.target.value ? parseInt(e.target.value) : null })} placeholder="e.g. 250" />
                  </Field>
                  <Field label="Maximum Occupancy *">
                    <Input type="number" min={1} value={draft.max_occupancy} onChange={(e) => setDraft({ ...draft, max_occupancy: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Base Price / Night (₹) *">
                    <Input type="number" min={0} value={draft.base_price} onChange={(e) => setDraft({ ...draft, base_price: parseFloat(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Weekend Price / Night (₹)">
                    <Input type="number" min={0} value={draft.weekend_price ?? ""} onChange={(e) => setDraft({ ...draft, weekend_price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Optional" />
                  </Field>
                  <Field label="Extra Bed Available">
                    <RadioGroup value={draft.extra_bed_available ? "yes" : "no"} onValueChange={(v) => setDraft({ ...draft, extra_bed_available: v === "yes" })} className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="yes" /> Yes</label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="no" /> No</label>
                    </RadioGroup>
                  </Field>
                  <Field label="Children Allowed">
                    <RadioGroup value={draft.children_allowed ? "yes" : "no"} onValueChange={(v) => setDraft({ ...draft, children_allowed: v === "yes" })} className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="yes" /> Yes</label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="no" /> No</label>
                    </RadioGroup>
                  </Field>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">Room Amenities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {ROOM_AMENITIES.map((a) => {
                      const active = draft.amenities.includes(a);
                      return (
                        <button key={a} type="button" onClick={() => toggleAmenity(a)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-all ${active ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/40"}`}>
                          <Checkbox checked={active} className="pointer-events-none" />
                          <span>{a}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  <Button type="button" onClick={saveDraft} variant="premium">{editingId === "__new__" ? "Add category" : "Save changes"}</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!editingId && (
          <Button type="button" variant="outline" onClick={startAdd} className="w-full border-dashed border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/5">
            <Plus className="h-4 w-4 mr-1" /> Add room category
          </Button>
        )}
      </div>

      {/* Check-in / Check-out */}
      <Card className="border-border/60">
        <CardContent className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold">Check-in & check-out</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Check-In Time *">
              <Input type="time" value={data.check_in_time} onChange={(e) => update("check_in_time", e.target.value)} />
            </Field>
            <Field label="Check-Out Time *">
              <Input type="time" value={data.check_out_time} onChange={(e) => update("check_out_time", e.target.value)} />
            </Field>
            <Field label="24 Hour Check-In">
              <RadioGroup value={data.check_in_24h ? "yes" : "no"} onValueChange={(v) => update("check_in_24h", v === "yes")} className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="yes" /> Yes</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="no" /> No</label>
              </RadioGroup>
            </Field>
            <Field label="Front Desk Available 24 Hours">
              <RadioGroup value={data.front_desk_24h ? "yes" : "no"} onValueChange={(v) => update("front_desk_24h", v === "yes")} className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="yes" /> Yes</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="no" /> No</label>
              </RadioGroup>
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/40 border border-emerald-500/20 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-emerald-300 mt-0.5">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function Step4({ data, toggle }: any) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">What amenities do you offer?</h2>
      <p className="text-sm text-muted-foreground">Pick all that apply — guests filter by these.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {AMENITIES.map((a) => {
          const active = data.amenities.includes(a);
          return (
            <button
              key={a} type="button" onClick={() => toggle(a)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                active ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/40"
              }`}
            >
              <Checkbox checked={active} className="pointer-events-none" />
              <span className="text-sm">{a}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step5({ data, update, uploadFile, uploading }: any) {
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) await uploadFile(f, "hotel-photos", "photos");
    e.target.value = "";
  };
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Show off your property</h2>
      <p className="text-sm text-muted-foreground">Upload at least 3 high-quality images — exterior, rooms, amenities.</p>

      <label className="block border-2 border-dashed border-emerald-500/30 rounded-xl p-8 text-center cursor-pointer hover:bg-emerald-500/5 transition-all">
        <Upload className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
        <p className="font-medium">Drop images or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 10MB each</p>
        <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} disabled={!!uploading} />
      </label>

      {uploading === "photos" && <p className="text-sm text-emerald-400 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</p>}

      {data.photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.photos.map((url: string, i: number) => (
            <div key={i} className="relative group aspect-video rounded-lg overflow-hidden border border-border">
              <img src={url} alt="Hotel" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
              <button onClick={() => update("photos", data.photos.filter((_: any, x: number) => x !== i))}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{data.photos.length} / 3 minimum</p>
    </div>
  );
}

function Step6({ data, uploadFile, uploading }: any) {
  const DocSlot = ({ label, field, optional }: { label: string; field: "business_registration_url" | "id_proof_url" | "gst_certificate_url"; optional?: boolean }) => {
    const filled = !!data[field];
    return (
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm">{label} {optional && <span className="text-muted-foreground">(optional)</span>}</Label>
          {filled && <Badge className="bg-emerald-500/20 text-emerald-300"><Check className="h-3 w-3 mr-1" /> Uploaded</Badge>}
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-emerald-400 hover:text-emerald-300">
          <Upload className="h-4 w-4" />
          {filled ? "Replace file" : "Upload file"}
          <input type="file" accept="application/pdf,image/*" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              await uploadFile(f, "hotel-documents", field);
              e.target.value = "";
            }} disabled={!!uploading} />
        </label>
        {uploading === field && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
      </div>
    );
  };
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Verification documents</h2>
      <p className="text-sm text-muted-foreground">Files are stored privately and only seen by our verification team.</p>
      <div className="space-y-3">
        <DocSlot label="Business Registration Certificate *" field="business_registration_url" />
        <DocSlot label="Owner / Manager ID Proof *" field="id_proof_url" />
        <DocSlot label="GST Certificate" field="gst_certificate_url" optional />
      </div>
    </div>
  );
}

function SuccessScreen({ onGoStatus, hotelName }: { onGoStatus: () => void; hotelName: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-emerald-950/30">
      <Navigation />
      <div className="max-w-xl mx-auto px-4 pt-32 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
          className="h-20 w-20 mx-auto bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mb-6">
          <Check className="h-10 w-10 text-emerald-400" />
        </motion.div>
        <h1 className="text-3xl font-bold mb-3">Application Submitted</h1>
        <p className="text-muted-foreground mb-2">
          <strong className="text-foreground">{hotelName}</strong> is now in our review queue.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Our team will review your hotel within 24–48 hours. You'll get a notification once approved.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => (window.location.href = "/hotels")}>Browse Hotels</Button>
          <Button variant="premium" onClick={onGoStatus}>Check Status</Button>
        </div>
      </div>
    </div>
  );
}

function CityTypeahead({ value, onChange, onSelect }: { value: string; onChange: (v: string) => void; onSelect: (v: string) => void }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  useEffect(() => { setQuery(value || ""); }, [value]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES.slice(0, 8);
    return CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <div className="relative">
      <Input
        value={query}
        placeholder="Start typing your city..."
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((c) => (
            <button
              key={c}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
              onMouseDown={(e) => { e.preventDefault(); setQuery(c); onSelect(c); setOpen(false); }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MapSearchBox({ onPick }: { onPick: (loc: { latitude: number; longitude: number }) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Array<{ placeId: string; mainText: string; secondaryText: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        await loadGoogleMaps();
        setSessionToken(createSessionToken());
      } catch (e) {
        console.warn("[MapSearchBox] gmaps load failed", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const suggestions = await fetchAutocompleteSuggestions(query, sessionToken, { country: "in" });
        setResults(suggestions);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, sessionToken]);

  const pick = async (placeId: string, label: string) => {
    try {
      const details = await fetchPlaceDetails(placeId, sessionToken);
      setQuery(label);
      setOpen(false);
      setSessionToken(createSessionToken());
      if (details.latitude && details.longitude) {
        onPick({ latitude: details.latitude, longitude: details.longitude });
      }
    } catch (e) {
      console.warn("[MapSearchBox] details failed", e);
      toast.error("Could not fetch location details");
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search city, locality or landmark…"
          className="pl-9"
        />
      </div>
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-md">
          {loading && <div className="p-2 text-xs text-muted-foreground">Searching…</div>}
          {results.map((r) => (
            <button
              key={r.placeId}
              type="button"
              onClick={() => pick(r.placeId, r.mainText + (r.secondaryText ? `, ${r.secondaryText}` : ""))}
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
            >
              <div className="font-medium">{r.mainText}</div>
              {r.secondaryText && <div className="text-xs text-muted-foreground">{r.secondaryText}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


