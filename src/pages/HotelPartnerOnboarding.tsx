import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hotel, MapPin, BedDouble, Sparkles, Image as ImageIcon, FileCheck,
  Check, ChevronLeft, ChevronRight, Loader2, Upload, X, ShieldCheck,
} from "lucide-react";
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
import { toast } from "sonner";
import Navigation from "@/components/Navigation";

const STEPS = [
  { id: 1, label: "Basics", icon: Hotel },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Rooms", icon: BedDouble },
  { id: 4, label: "Amenities", icon: Sparkles },
  { id: 5, label: "Photos", icon: ImageIcon },
  { id: 6, label: "Documents", icon: FileCheck },
];

const BUSINESS_TYPES = ["Hotel", "Resort", "Homestay", "Service Apartment"];
const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Family", "Executive"];
const AMENITIES = [
  "Free WiFi", "Parking", "Air Conditioning", "Restaurant",
  "Room Service", "Swimming Pool", "Gym", "24x7 Reception", "Breakfast Included",
];
const CITIES = ["Hyderabad", "Bangalore", "Mumbai", "Pune", "Chennai", "Delhi", "Gurgaon", "Noida", "Kolkata", "Ahmedabad"];

type FormState = {
  hotel_name: string; owner_name: string; email: string; phone: string; business_type: string;
  city: string; locality: string; address: string; pincode: string; latitude: number | null; longitude: number | null;
  total_rooms: number; room_types: string[]; price_min: number; price_max: number; check_in_time: string; check_out_time: string;
  amenities: string[];
  photos: string[];
  business_registration_url: string; id_proof_url: string; gst_certificate_url: string;
};

const initial: FormState = {
  hotel_name: "", owner_name: "", email: "", phone: "", business_type: "Hotel",
  city: "", locality: "", address: "", pincode: "", latitude: null, longitude: null,
  total_rooms: 10, room_types: [], price_min: 1500, price_max: 5000, check_in_time: "14:00", check_out_time: "12:00",
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
      return null;
    }
    if (step === 3) {
      if (data.total_rooms < 1) return "At least 1 room";
      if (data.room_types.length === 0) return "Select at least one room type";
      if (data.price_min <= 0 || data.price_max <= data.price_min) return "Price range invalid";
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
    if (!userId) return;
    setUploading(key);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (error) throw error;
      if (bucket === "hotel-photos") {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        update("photos", [...data.photos, pub.publicUrl]);
      } else {
        // private bucket — store path; serve via signed URL on read
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
    if (!userId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("hotel_partner_applications").insert({
        user_id: userId,
        ...data,
        status: "pending",
      } as any);
      if (error) throw error;
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
                {step === 3 && <Step3 data={data} update={update} toggle={(v) => toggleInArray("room_types", v)} />}
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
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Where are you located?</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="City *">
          <Select value={data.city} onValueChange={(v) => update("city", v)}>
            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
            <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Locality / Area *"><Input value={data.locality} onChange={(e) => update("locality", e.target.value)} placeholder="e.g. Gachibowli" /></Field>
        <div className="md:col-span-2">
          <Field label="Full Address *"><Textarea value={data.address} onChange={(e) => update("address", e.target.value)} placeholder="Street, building, landmark" rows={2} /></Field>
        </div>
        <Field label="Pincode *"><Input value={data.pincode} onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="500032" /></Field>
        <Field label="Coordinates (optional)" hint="Auto-filled when you save the address">
          <div className="flex gap-2">
            <Input placeholder="Latitude" type="number" value={data.latitude ?? ""} onChange={(e) => update("latitude", e.target.value ? parseFloat(e.target.value) : null)} />
            <Input placeholder="Longitude" type="number" value={data.longitude ?? ""} onChange={(e) => update("longitude", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
        </Field>
      </div>
    </div>
  );
}

function Step3({ data, update, toggle }: any) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Rooms & pricing</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Total Rooms *"><Input type="number" min={1} value={data.total_rooms} onChange={(e) => update("total_rooms", parseInt(e.target.value) || 0)} /></Field>
        <div>
          <Label className="text-sm mb-2 block">Room Types Available *</Label>
          <div className="flex flex-wrap gap-2">
            {ROOM_TYPES.map((rt) => (
              <Badge key={rt} variant={data.room_types.includes(rt) ? "default" : "outline"}
                className={`cursor-pointer ${data.room_types.includes(rt) ? "bg-emerald-500 hover:bg-emerald-600" : "hover:bg-muted"}`}
                onClick={() => toggle(rt)}>{rt}</Badge>
            ))}
          </div>
        </div>
        <Field label="Min Price / Night (₹) *"><Input type="number" value={data.price_min} onChange={(e) => update("price_min", parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Max Price / Night (₹) *"><Input type="number" value={data.price_max} onChange={(e) => update("price_max", parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Check-in Time"><Input type="time" value={data.check_in_time} onChange={(e) => update("check_in_time", e.target.value)} /></Field>
        <Field label="Check-out Time"><Input type="time" value={data.check_out_time} onChange={(e) => update("check_out_time", e.target.value)} /></Field>
      </div>
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
              <img src={url} alt="Hotel" className="w-full h-full object-cover" />
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
