import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Home, MapPin, Bed, IndianRupee, Sparkles, ImagePlus, FileCheck2,
  ChevronLeft, ChevronRight, CheckCircle2, Save, X, Loader2, Upload, FileText
} from "lucide-react";

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ||
  "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHR4Y3B1ZGcxMnprMmpsYjIwOG10cXh6In0.HuoJqW9PJdDjLK5O5LJRAQ";

mapboxgl.accessToken = MAPBOX_TOKEN;

const STEPS = [
  { id: 1, label: "Basic Info", icon: Home },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Details", icon: Bed },
  { id: 4, label: "Pricing", icon: IndianRupee },
  { id: 5, label: "Amenities", icon: Sparkles },
  { id: 6, label: "Media", icon: ImagePlus },
  { id: 7, label: "Documents", icon: FileCheck2 },
];

const CITIES = ["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai", "Pune", "Kolkata", "Ahmedabad"];
const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Independent House"];
const FURNISHING = ["Furnished", "Semi-Furnished", "Unfurnished"];
const PROPERTY_AGE = ["New", "1-5 years", "5-10 years", "10+ years"];
const AMENITIES = ["Parking", "Lift", "Security", "Power Backup", "Gym", "Swimming Pool", "Garden", "Clubhouse", "Children's Play Area", "CCTV"];

interface FormState {
  title: string;
  type: string;
  listing_type: string;
  description: string;
  city: string;
  locality: string;
  address: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  area_sqft: string;
  floor_number: string;
  total_floors: string;
  furnishing: string;
  property_age: string;
  price: string;
  price_negotiable: boolean;
  maintenance_charges: string;
  booking_amount: string;
  amenities: string[];
  images: string[];
  video_urls: string[];
  ownership_proof_url: string;
  id_proof_url: string;
}

const initialForm: FormState = {
  title: "", type: "", listing_type: "sale", description: "",
  city: "", locality: "", address: "", pincode: "", latitude: null, longitude: null,
  bedrooms: "", bathrooms: "", balconies: "", area_sqft: "", floor_number: "", total_floors: "",
  furnishing: "", property_age: "",
  price: "", price_negotiable: false, maintenance_charges: "", booking_amount: "",
  amenities: [], images: [], video_urls: [],
  ownership_proof_url: "", id_proof_url: "",
};

export default function SellProperty() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate("/auth?redirect=/sell-property"); return; }
      setUser(data.user);
    });
  }, [navigate]);

  // Load existing property for edit
  useEffect(() => {
    if (!editId || !user) return;
    (async () => {
      const { data } = await supabase.from("properties").select("*").eq("id", editId).maybeSingle();
      if (data && data.submitted_by === user.id) {
        setForm({
          title: data.title || "",
          type: data.type || "",
          listing_type: (data as any).listing_type || "sale",
          description: data.description || "",
          city: data.city || "",
          locality: data.locality || "",
          address: data.address || "",
          pincode: (data as any).pincode || "",
          latitude: data.latitude ? Number(data.latitude) : null,
          longitude: data.longitude ? Number(data.longitude) : null,
          bedrooms: data.bedrooms?.toString() || "",
          bathrooms: data.bathrooms?.toString() || "",
          balconies: (data as any).balconies?.toString() || "",
          area_sqft: data.area_sqft?.toString() || "",
          floor_number: (data as any).floor_number?.toString() || "",
          total_floors: data.total_floors?.toString() || "",
          furnishing: (data as any).furnishing || "",
          property_age: (data as any).property_age || "",
          price: data.price?.toString() || "",
          price_negotiable: (data as any).price_negotiable || false,
          maintenance_charges: (data as any).maintenance_charges?.toString() || "",
          booking_amount: (data as any).booking_amount?.toString() || "",
          amenities: (data as any).amenities || [],
          images: data.images || [],
          video_urls: data.video_urls || [],
          ownership_proof_url: ((data as any).document_urls?.ownership_proof) || "",
          id_proof_url: ((data as any).document_urls?.id_proof) || "",
        });
      }
    })();
  }, [editId, user]);

  // Init map on step 2
  useEffect(() => {
    if (step !== 2) return;
    if (mapRef.current) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let map: mapboxgl.Map | null = null;

    const tryInit = (attempt = 0) => {
      if (cancelled) return;
      const el = mapContainer.current;
      if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) {
        if (attempt < 30) return setTimeout(() => tryInit(attempt + 1), 100);
        return;
      }
    const center: [number, number] = form.longitude && form.latitude
      ? [form.longitude, form.latitude]
      : [78.4867, 17.3850];
    map = new mapboxgl.Map({
      container: el,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 12,
    });
    mapRef.current = map;

    map.on("load", () => map?.resize());
    map.on("styleimagemissing", () => map?.resize());
    map.on("error", (event) => {
      const message = typeof event?.error?.message === "string" ? event.error.message.toLowerCase() : "";
      if (message.includes("401") || message.includes("403") || message.includes("token") || message.includes("unauthorized")) {
        toast.error("Map could not load with the current key. Reloading with the public map key.");
      }
    });
    // Fix white/empty map when container size changes
    [50, 200, 500, 1000].forEach((d) => setTimeout(() => map?.resize(), d));
    ro = new ResizeObserver(() => map?.resize());
    ro.observe(el);

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      marker: false,
      placeholder: "Search location, area, or address",
      countries: "in",
    });
    map.addControl(geocoder as any, "top-left");

    geocoder.on("result", (e: any) => {
      const [lng, lat] = e.result.center;
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new mapboxgl.Marker({ color: "#10b981", draggable: true })
        .setLngLat([lng, lat]).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLngLat();
        setForm((f) => ({ ...f, latitude: ll.lat, longitude: ll.lng }));
      });
      setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
      toast.success("Location selected");
    });

    if (form.latitude && form.longitude) {
      markerRef.current = new mapboxgl.Marker({ color: "#10b981", draggable: true })
        .setLngLat(center).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLngLat();
        setForm((f) => ({ ...f, latitude: ll.lat, longitude: ll.lng }));
      });
    }

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new mapboxgl.Marker({ color: "#10b981", draggable: true })
        .setLngLat([lng, lat]).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLngLat();
        setForm((f) => ({ ...f, latitude: ll.lat, longitude: ll.lng }));
      });
      setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
      toast.success("Location pinned");
    });
    };

    tryInit();
    return () => {
      cancelled = true;
      ro?.disconnect();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [step]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setForm((f) => ({ ...f, latitude, longitude }));
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 15 });
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = new mapboxgl.Marker({ color: "#10b981" }).setLngLat([longitude, latitude]).addTo(mapRef.current);
      }
      toast.success("Location captured");
    }, () => toast.error("Failed to get location"));
  };

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 1:
        if (!form.title.trim()) return "Property title is required";
        if (!form.type) return "Property type is required";
        if (!form.description.trim() || form.description.length < 30) return "Description (min 30 chars)";
        return null;
      case 2:
        if (!form.city) return "City is required";
        if (!form.locality.trim()) return "Locality is required";
        if (!form.address.trim()) return "Address is required";
        return null;
      case 3:
        if (form.type !== "Plot" && !form.bedrooms) return "Bedrooms required";
        if (!form.area_sqft) return "Area is required";
        return null;
      case 4:
        if (!form.price) return "Expected price is required";
        return null;
      case 6:
        if (form.images.length < 3) return "Upload at least 3 images";
        return null;
      case 7:
        if (!form.ownership_proof_url) return "Ownership proof is required";
        if (!form.id_proof_url) return "ID proof is required";
        return null;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) return toast.error(err);
    setStep((s) => Math.min(7, s + 1));
  };

  const uploadFile = async (file: File, bucket: string, kind: string): Promise<string | null> => {
    if (!user) return null;
    try {
      setUploading(kind);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (error) throw error;
      if (bucket === "property-images") {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
      }
      // signed URL for private docs
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
      return signed?.signedUrl || path;
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
      return null;
    } finally {
      setUploading(null);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const uploaded: string[] = [];
    for (const f of Array.from(files).slice(0, 10 - form.images.length)) {
      const url = await uploadFile(f, "property-images", "image");
      if (url) uploaded.push(url);
    }
    setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
  };

  const handleDocUpload = async (file: File | null, key: "ownership_proof_url" | "id_proof_url") => {
    if (!file) return;
    const url = await uploadFile(file, "property-documents", key);
    if (url) setForm((f) => ({ ...f, [key]: url }));
  };

  const buildPayload = (asDraft: boolean) => ({
    submitted_by: user.id,
    title: form.title,
    type: form.type,
    listing_type: form.listing_type,
    description: form.description,
    city: form.city,
    locality: form.locality,
    address: form.address,
    pincode: form.pincode || null,
    latitude: form.latitude,
    longitude: form.longitude,
    bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
    bhk: form.bedrooms ? parseInt(form.bedrooms) : null,
    bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
    balconies: form.balconies ? parseInt(form.balconies) : null,
    area_sqft: form.area_sqft ? parseFloat(form.area_sqft) : null,
    floor_number: form.floor_number ? parseInt(form.floor_number) : null,
    total_floors: form.total_floors ? parseInt(form.total_floors) : null,
    furnishing: form.furnishing || null,
    property_age: form.property_age || null,
    price: form.price ? parseFloat(form.price) : 0,
    price_negotiable: form.price_negotiable,
    maintenance_charges: form.maintenance_charges ? parseFloat(form.maintenance_charges) : null,
    booking_amount: form.booking_amount ? parseFloat(form.booking_amount) : null,
    amenities: form.amenities,
    images: form.images,
    video_urls: form.video_urls,
    document_urls: { ownership_proof: form.ownership_proof_url, id_proof: form.id_proof_url },
    verification_status: asDraft ? "draft" : "pending",
    verified: false,
    is_draft: asDraft,
    rejection_reason: null,
    listed_by: "seller",
    // Sellers do NOT get to pick the agent — admin assigns one during approval
    assigned_agent_id: null,
  });

  const handleSaveDraft = async () => {
    if (!user) return;
    setSavingDraft(true);
    try {
      const payload = buildPayload(true);
      if (editId) {
        await supabase.from("properties").update(payload).eq("id", editId);
      } else {
        await supabase.from("properties").insert(payload);
      }
      toast.success("Draft saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSavingDraft(false); }
  };

  const handleSubmit = async () => {
    for (let s = 1; s <= 7; s++) {
      const err = validateStep(s);
      if (err) { setStep(s); return toast.error(err); }
    }
    setSubmitting(true);
    try {
      const payload = buildPayload(false);
      let propId = editId;
      if (editId) {
        const { error } = await supabase.from("properties").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("properties").insert(payload).select("id").single();
        if (error) throw error;
        propId = data.id;
      }
      // Notify admins
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await supabase.from("notifications").insert(admins.map((a: any) => ({
          user_id: a.user_id,
          type: "property_submitted",
          title: "New Property Awaiting Verification",
          message: `${form.title} (${form.city}) submitted by seller for review.`,
          link: "/admin",
        })));
      }
      toast.success("Submitted for verification!", {
        description: "Your property will go live after admin approval.",
      });
      navigate("/dashboard/seller");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally { setSubmitting(false); }
  };

  const progress = (step / 7) * 100;
  const StepIcon = STEPS[step - 1].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500"><Home className="h-6 w-6" /></span>
              {editId ? "Edit Listing" : "List Your Property"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Step {step} of 7 — {STEPS[step - 1].label}</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/seller")}><X className="h-4 w-4 mr-1" />Cancel</Button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <Progress value={progress} className="h-2 bg-secondary [&>div]:bg-emerald-500" />
          <div className="hidden md:flex justify-between mt-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <button key={s.id} onClick={() => setStep(s.id)} className="flex flex-col items-center gap-1 group">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    done ? "bg-emerald-500 border-emerald-500 text-white"
                    : active ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : "border-muted text-muted-foreground"
                  }`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[11px] ${active ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <Card className="border-emerald-500/20 shadow-lg">
          <CardContent className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <StepIcon className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold">{STEPS[step - 1].label}</h2>
                </div>

                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Property Title *</Label>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Spacious 3BHK Apartment in Gachibowli" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Property Type *</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Listing Type *</Label>
                        <Select value={form.listing_type} onValueChange={(v) => setForm({ ...form, listing_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sale">For Sale</SelectItem>
                            <SelectItem value="rent">For Rent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Description *</Label>
                      <Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Describe the property, neighborhood, and unique features (min 30 chars)" />
                      <p className="text-xs text-muted-foreground mt-1">{form.description.length} chars</p>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>City *</Label>
                        <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                          <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                          <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Locality *</Label>
                        <Input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} placeholder="e.g. Gachibowli" />
                      </div>
                    </div>
                    <div>
                      <Label>Full Address *</Label>
                      <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Building, street, landmark" />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Pin Code</Label>
                        <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="500032" />
                      </div>
                      <div className="md:col-span-2 flex items-end gap-2">
                        <Button type="button" variant="outline" onClick={useMyLocation} className="w-full">
                          <MapPin className="h-4 w-4 mr-1" />Use my current location
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Pin location on map (click to drop pin)</Label>
                      <div ref={mapContainer} className="h-72 w-full rounded-lg overflow-hidden border mt-2" />
                      {form.latitude && form.longitude && (
                        <p className="text-xs text-emerald-500 mt-2">📍 {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>{form.type === "Plot" ? "Bedrooms" : "Bedrooms (BHK) *"}</Label>
                      <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
                    </div>
                    <div><Label>{form.type === "Plot" ? "Bathrooms" : "Bathrooms *"}</Label>
                      <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
                    </div>
                    <div><Label>Balconies</Label>
                      <Input type="number" value={form.balconies} onChange={(e) => setForm({ ...form, balconies: e.target.value })} />
                    </div>
                    <div><Label>Area (sq ft) *</Label>
                      <Input type="number" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: e.target.value })} />
                    </div>
                    <div><Label>Floor Number</Label>
                      <Input type="number" value={form.floor_number} onChange={(e) => setForm({ ...form, floor_number: e.target.value })} />
                    </div>
                    <div><Label>Total Floors</Label>
                      <Input type="number" value={form.total_floors} onChange={(e) => setForm({ ...form, total_floors: e.target.value })} />
                    </div>
                    <div><Label>Furnishing</Label>
                      <Select value={form.furnishing} onValueChange={(v) => setForm({ ...form, furnishing: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{FURNISHING.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Property Age</Label>
                      <Select value={form.property_age} onValueChange={(v) => setForm({ ...form, property_age: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{PROPERTY_AGE.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Expected Price (₹) *</Label>
                      <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 7500000" />
                      {form.price && (
                        <p className="text-xs text-emerald-500 mt-1">
                          ₹ {new Intl.NumberFormat("en-IN").format(parseFloat(form.price))}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                      <div>
                        <p className="font-medium">Price Negotiable</p>
                        <p className="text-xs text-muted-foreground">Allow buyers to negotiate</p>
                      </div>
                      <Switch checked={form.price_negotiable} onCheckedChange={(v) => setForm({ ...form, price_negotiable: v })} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Maintenance Charges (₹/mo)</Label>
                        <Input type="number" value={form.maintenance_charges} onChange={(e) => setForm({ ...form, maintenance_charges: e.target.value })} />
                      </div>
                      <div>
                        <Label>Booking Amount (₹)</Label>
                        <Input type="number" value={form.booking_amount} onChange={(e) => setForm({ ...form, booking_amount: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">Select all amenities available at your property</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {AMENITIES.map((a) => {
                        const active = form.amenities.includes(a);
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setForm((f) => ({
                              ...f,
                              amenities: active ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
                            }))}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                              active ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-border hover:border-emerald-500/50"
                            }`}
                          >
                            {active && <CheckCircle2 className="h-4 w-4 inline mr-1" />}
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Property Images * (min 3, max 10)</Label>
                      <label className="mt-2 block border-2 border-dashed border-emerald-500/40 rounded-xl p-8 text-center cursor-pointer hover:bg-emerald-500/5 transition">
                        <Upload className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                        <p className="text-sm font-medium">Click or drag to upload images</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG up to 5MB each</p>
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files)} />
                      </label>
                      {uploading === "image" && <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Uploading…</p>}
                      {form.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                          {form.images.map((url, i) => (
                            <div key={i} className="relative group rounded-lg overflow-hidden border">
                              <img src={url} alt="" className="w-full h-28 object-cover" />
                              <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition">
                                <X className="h-3 w-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{form.images.length}/10 uploaded</p>
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Documents are securely stored and only visible to verification admins.</p>
                    {([
                      { key: "ownership_proof_url" as const, label: "Ownership Proof *", desc: "Sale deed, allotment letter, or property tax receipt" },
                      { key: "id_proof_url" as const, label: "ID Proof *", desc: "Aadhaar, PAN, or Passport" },
                    ]).map((doc) => (
                      <div key={doc.key} className="p-4 rounded-xl border-2 border-dashed border-emerald-500/30">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-500" />{doc.label}</p>
                            <p className="text-xs text-muted-foreground">{doc.desc}</p>
                          </div>
                          {form[doc.key] && <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" />Uploaded</Badge>}
                        </div>
                        <Input type="file" accept="image/*,application/pdf"
                          onChange={(e) => handleDocUpload(e.target.files?.[0] || null, doc.key)} />
                        {uploading === doc.key && <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Uploading…</p>}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Sticky footer actions */}
        <div className="sticky bottom-4 mt-6 z-30">
          <Card className="border-emerald-500/30 shadow-xl bg-background/95 backdrop-blur">
            <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
              <Button variant="outline" disabled={step === 1} onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" onClick={handleSaveDraft} disabled={savingDraft || !user}>
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Save Draft
                </Button>
                {step < 7 ? (
                  <Button onClick={handleNext} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    Next<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Submit for Verification
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
