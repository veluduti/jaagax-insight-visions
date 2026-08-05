import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Building2, Upload, MapPin, Image as ImageIcon, X, Loader2, Lock,
  IndianRupee, Home, Sparkles, FileText, Phone, Map as MapIcon, Compass,
} from "lucide-react";
import { classifyProperty, getMissingForFeatured } from "@/lib/propertyClassifier";

const AMENITY_OPTIONS = [
  "Gym", "Swimming Pool", "Lift", "Security", "Power Backup",
  "Parking", "Clubhouse", "Garden", "CCTV",
  "Children's Play Area", "Jogging Track", "Indoor Games", "Spa",
];

// All fields optional — the form is intentionally permissive.
// Property tier (draft / basic / featured) is derived AFTER submit
// via the shared classifier in src/lib/propertyClassifier.ts.
const propertySchema = z.object({
  // Basics
  title: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: z.string().optional().or(z.literal("")),
  completion_stage: z.string().optional().or(z.literal("")),
  listing_type: z.string().optional().or(z.literal("")),
  furnishing: z.string().optional().or(z.literal("")),
  property_age: z.string().optional(),
  facing_direction: z.string().optional(),
  ownership_type: z.string().optional(),

  // Configuration
  bhk: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  balconies: z.string().optional(),
  area_sqft: z.string().optional(),
  floor_number: z.string().optional(),

  // Building
  building_name: z.string().optional(),
  total_floors: z.string().optional(),
  total_parking: z.string().optional(),
  building_area_sqft: z.string().optional(),
  elevators: z.string().optional(),

  // Location
  city: z.string().trim().max(80).optional().or(z.literal("")),
  locality: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  pincode: z.string().trim().optional().or(z.literal("")),
  nearby_landmarks: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),

  // Pricing
  price: z.string().optional(),
  price_per_sqft: z.string().optional(),
  maintenance_charges: z.string().optional(),
  booking_amount: z.string().optional(),
  price_negotiable: z.boolean().default(false),

  // Project / Builder specifics
  project_name: z.string().optional(),
  rera_id: z.string().optional(),
  possession_date: z.string().optional(),
  total_units: z.string().optional(),

  // Media
  video_urls: z.string().optional(),
  virtual_tour_url: z.string().optional(),

  // Contact & Visibility
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  show_contact: z.boolean().default(true),
  is_draft: z.boolean().default(false),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyUploadFormProps {
  onSuccess?: () => void;
}

const toNum = (v?: string) => {
  if (!v || !v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toList = (v?: string) =>
  (v || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const SectionHeading = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="flex items-start gap-3 border-b pb-3">
    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  </div>
);

export default function PropertyUploadForm({ onSuccess }: PropertyUploadFormProps) {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<{ url: string; path: string }[]>([]);
  const [floorPlanFiles, setFloorPlanFiles] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: "", description: "", type: "Apartment", completion_stage: "Ready",
      listing_type: "sale", furnishing: "Unfurnished", property_age: "",
      facing_direction: "", ownership_type: "",
      bhk: "", bedrooms: "", bathrooms: "", balconies: "", area_sqft: "", floor_number: "",
      building_name: "", total_floors: "", total_parking: "", building_area_sqft: "", elevators: "",
      city: "", locality: "", address: "", pincode: "", nearby_landmarks: "",
      latitude: "", longitude: "",
      price: "", price_per_sqft: "", maintenance_charges: "", booking_amount: "",
      price_negotiable: false,
      project_name: "", rera_id: "", possession_date: "", total_units: "",
      video_urls: "", virtual_tour_url: "",
      contact_name: "", contact_phone: "", show_contact: true, is_draft: false,
    },
  });

  // Auto-fill contact name from user
  useEffect(() => {
    if (user?.email && !form.getValues("contact_name")) {
      const meta: any = user.user_metadata || {};
      if (meta.name) form.setValue("contact_name", meta.name);
      if (meta.phone) form.setValue("contact_phone", meta.phone);
    }
  }, [user, form]);

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const uploadFiles = async (
    files: FileList,
    folder: "images" | "floor-plans",
    setter: typeof setImageFiles,
  ) => {
    if (!user) {
      toast.error("Please sign in to upload files");
      return;
    }
    setUploading(true);
    try {
      const uploaded: { url: string; path: string }[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 8MB limit`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("property-images").upload(path, file, { upsert: false });
        if (upErr) {
          toast.error(`Upload failed: ${upErr.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
        uploaded.push({ url: pub.publicUrl, path });
      }
      if (uploaded.length) {
        setter((prev) => [...prev, ...uploaded]);
        toast.success(`${uploaded.length} file(s) uploaded`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (path: string, setter: typeof setImageFiles) => {
    await supabase.storage.from("property-images").remove([path]).catch(() => {});
    setter((prev) => prev.filter((f) => f.path !== path));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this browser");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue("latitude", pos.coords.latitude.toFixed(6));
        form.setValue("longitude", pos.coords.longitude.toFixed(6));
        setGeoStatus("ok");
        toast.success("Location captured");
      },
      () => {
        setGeoStatus("error");
        toast.error("Could not capture location. Please allow permission.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = async (values: PropertyFormValues) => {
    if (!user) {
      toast.error("You must be logged in to submit a property");
      return;
    }
    if (role !== "builder") {
      toast.error("Only Builder accounts can submit properties");
      return;
    }
    if (imageFiles.length === 0) {
      toast.error("Please upload at least one property image");
      return;
    }

    setIsSubmitting(true);
    try {
      // Classify based on the data the user actually provided
      const tier = classifyProperty({
        title: values.title,
        type: values.type,
        listing_type: values.listing_type,
        city: values.city,
        locality: values.locality,
        price: toNum(values.price),
        bhk: toNum(values.bhk),
        area_sqft: toNum(values.area_sqft),
        images: imageFiles,
      });

      // Drafts: either explicitly chosen, OR auto-classified as draft (missing essentials)
      const isDraft = !!values.is_draft || tier === "draft";

      const payload: any = {
        title: values.title || "Untitled property",
        description: values.description || null,
        type: values.type || null,
        completion_stage: values.completion_stage || null,
        listing_type: values.listing_type || null,
        furnishing: values.furnishing || null,
        property_age: values.property_age || null,

        bhk: toNum(values.bhk),
        bedrooms: toNum(values.bedrooms),
        bathrooms: toNum(values.bathrooms),
        balconies: toNum(values.balconies),
        area_sqft: toNum(values.area_sqft),
        floor_number: toNum(values.floor_number),

        building_name: values.building_name || null,
        total_floors: toNum(values.total_floors),
        total_parking: toNum(values.total_parking),
        building_area_sqft: toNum(values.building_area_sqft),
        elevators: toNum(values.elevators),

        city: values.city || "Unknown",
        locality: values.locality || "Unknown",
        address: values.address || null,
        pincode: values.pincode || null,
        latitude: toNum(values.latitude),
        longitude: toNum(values.longitude),

        price: toNum(values.price) ?? 0,
        maintenance_charges: toNum(values.maintenance_charges),
        booking_amount: toNum(values.booking_amount),
        price_negotiable: values.price_negotiable,

        rera_id: values.rera_id || null,

        amenities,
        images: imageFiles.map((f) => f.url),
        video_urls: toList(values.video_urls),

        document_urls: {
          floor_plans: floorPlanFiles.map((f) => f.url),
          virtual_tour: values.virtual_tour_url || null,
          project_name: values.project_name || null,
          possession_date: values.possession_date || null,
          total_units: toNum(values.total_units),
          price_per_sqft: toNum(values.price_per_sqft),
          facing_direction: values.facing_direction || null,
          ownership_type: values.ownership_type || null,
          nearby_landmarks: toList(values.nearby_landmarks),
          contact_name: values.show_contact ? values.contact_name || null : null,
          contact_phone: values.show_contact ? values.contact_phone || null : null,
          show_contact: values.show_contact,
          listing_tier: tier,
        },

        listed_by: "builder",
        submitted_by: user.id,
        is_draft: isDraft,
        verification_status: isDraft ? "draft" : "pending",
        // Featured listings auto-publish; basic listings still need admin review
        verified: tier === "featured" && !isDraft,
      };

      const { data: inserted, error } = await supabase
        .from("properties")
        .insert(payload)
        .select("id, title")
        .single();

      if (error) throw error;

      if (!isDraft) {
        try {
          const { data: adminRoles } = await supabase
            .from("user_roles").select("user_id").eq("role", "admin");
          if (adminRoles?.length) {
            const notifications = adminRoles.map((r: any) => ({
              user_id: r.user_id,
              type: "property",
              title: "New property pending verification",
              message: `"${inserted?.title}" was submitted by a builder and needs review.`,
              link: `/admin`,
            }));
            await supabase.from("notifications").insert(notifications);
          }
        } catch (notifyErr) {
          console.warn("Admin notification failed:", notifyErr);
        }
      }

      // Tier-based feedback + navigation
      if (tier === "draft") {
        toast.info("Saved as draft — add a title, type and city to publish.");
      } else if (tier === "basic") {
        const missing = getMissingForFeatured({
          title: values.title, type: values.type, listing_type: values.listing_type,
          city: values.city, locality: values.locality, price: toNum(values.price),
          bhk: toNum(values.bhk), area_sqft: toNum(values.area_sqft), images: imageFiles,
        });
        toast.success("Listed as a basic property", {
          description: missing.length
            ? `To unlock featured placement add: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}`
            : undefined,
        });
      } else {
        toast.success("🎉 Submitted as a featured listing!", {
          description: "Eligible for promotions and reels.",
        });
      }

      form.reset();
      setAmenities([]);
      setImageFiles([]);
      setFloorPlanFiles([]);
      onSuccess?.();

      // Navigate to the matching tier page
      if (tier === "featured") navigate("/featured-properties");
      else if (tier === "basic") navigate("/partial-properties");
    } catch (error: any) {
      console.error("Error submitting property:", error);
      toast.error(error?.message || "Failed to submit property");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Access control gates ----------
  if (authLoading) {
    return (
      <Card><CardContent className="py-12 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Checking access…
      </CardContent></Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Sign in required</AlertTitle>
            <AlertDescription>You must be signed in with a Builder account to add properties.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

const ALLOWED_UPLOAD_ROLES = ["builder", "customer", "buyer", "seller", "agent", "admin"];
  if (role && !ALLOWED_UPLOAD_ROLES.includes(role)) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertTitle>Access restricted</AlertTitle>
            <AlertDescription>
              This role cannot list properties here. Your current role is <strong>{role}</strong>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Add New Property
        </CardTitle>
        <CardDescription>
          Fill what you have — we'll save the rest. Provide title, type, status, location, price, BHK, area and 5+ images to qualify as a <strong>Featured</strong> listing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

            {/* SECTION: BASICS */}
            <section className="space-y-4">
              <SectionHeading icon={Home} title="Basic Information" subtitle="Title, type, status & description" />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Property Title</FormLabel>
                    <FormControl><Input placeholder="3 BHK Luxury Apartment in Gachibowli" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["Apartment", "Villa", "Plot", "Commercial", "Penthouse", "Townhouse"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="listing_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="sale">For Sale</SelectItem>
                        <SelectItem value="rent">For Rent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="completion_stage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Stage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Ready">Ready to Move</SelectItem>
                        <SelectItem value="Under Construction">Under Construction</SelectItem>
                        <SelectItem value="New Launch">New Launch</SelectItem>
                        <SelectItem value="Resale">Resale</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="furnishing" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Furnishing</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Furnished">Furnished</SelectItem>
                        <SelectItem value="Semi-Furnished">Semi-Furnished</SelectItem>
                        <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="property_age" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Age</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select age" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["New", "0-1 years", "1-5 years", "5-10 years", "10+ years"].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="facing_direction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facing Direction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select facing" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="ownership_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ownership Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select ownership" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["Freehold", "Leasehold", "Co-operative Society", "Power of Attorney"].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the property features, amenities, location highlights..." className="min-h-[110px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </section>

            {/* SECTION: CONFIGURATION */}
            <section className="space-y-4">
              <SectionHeading icon={Building2} title="Configuration" subtitle="Rooms, area & floor details" />
              <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="bhk" render={({ field }) => (
                  <FormItem>
                    <FormLabel>BHK</FormLabel>
                    <FormControl><Input type="number" placeholder="3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bedrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl><Input type="number" placeholder="3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bathrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl><Input type="number" placeholder="2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="balconies" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balconies</FormLabel>
                    <FormControl><Input type="number" placeholder="2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="area_sqft" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carpet Area (sq.ft)</FormLabel>
                    <FormControl><Input type="number" placeholder="1200" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="floor_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor Number</FormLabel>
                    <FormControl><Input type="number" placeholder="5" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="building_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building Name</FormLabel>
                    <FormControl><Input placeholder="Tower A" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="total_floors" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Floors</FormLabel>
                    <FormControl><Input type="number" placeholder="20" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="total_parking" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parking Spaces</FormLabel>
                    <FormControl><Input type="number" placeholder="2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="elevators" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Elevators</FormLabel>
                    <FormControl><Input type="number" placeholder="4" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="building_area_sqft" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Building Area (sq.ft)</FormLabel>
                    <FormControl><Input type="number" placeholder="500000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* SECTION: LOCATION */}
            <section className="space-y-4">
              <SectionHeading icon={MapPin} title="Location" subtitle="Address, PIN code & coordinates" />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address</FormLabel>
                  <FormControl><Input placeholder="Tower A, Prestige Lakeside Habitat, Whitefield" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="Hyderabad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="locality" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locality</FormLabel>
                    <FormControl><Input placeholder="Gachibowli" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pincode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN Code</FormLabel>
                    <FormControl><Input placeholder="500032" maxLength={6} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="nearby_landmarks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nearby Landmarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Comma-separated: e.g. DLF Mall, Metro Station, Cyber Towers" className="min-h-[70px]" {...field} />
                  </FormControl>
                  <FormDescription>Helps buyers locate the property quickly.</FormDescription>
                </FormItem>
              )} />

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <MapIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium">Pin Location on Map</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={geoStatus === "loading"}>
                    {geoStatus === "loading" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Compass className="h-4 w-4 mr-1" />}
                    Use my current location
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormField control={form.control} name="latitude" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Latitude</FormLabel>
                      <FormControl><Input type="number" step="any" placeholder="17.4435" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="longitude" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Longitude</FormLabel>
                      <FormControl><Input type="number" step="any" placeholder="78.3772" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                {form.watch("latitude") && form.watch("longitude") && (
                  <a
                    href={`https://www.google.com/maps?q=${form.watch("latitude")},${form.watch("longitude")}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-primary underline inline-flex items-center gap-1"
                  >
                    <MapIcon className="h-3 w-3" /> Preview pin on Google Maps
                  </a>
                )}
              </div>
            </section>

            {/* SECTION: PRICING */}
            <section className="space-y-4">
              <SectionHeading icon={IndianRupee} title="Pricing" subtitle="All amounts in ₹ (INR)" />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Price (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="5000000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="price_per_sqft" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per sq.ft</FormLabel>
                    <FormControl><Input type="number" placeholder="4500" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="maintenance_charges" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Charges (₹/month)</FormLabel>
                    <FormControl><Input type="number" placeholder="3500" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="booking_amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Amount (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="100000" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="price_negotiable" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Price Negotiable</FormLabel>
                    <FormDescription className="text-xs">Buyers will see a “Negotiable” badge.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </section>

            {/* SECTION: AMENITIES */}
            <section className="space-y-4">
              <SectionHeading icon={Sparkles} title="Amenities" subtitle="Select all that apply" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {AMENITY_OPTIONS.map((a) => {
                  const checked = amenities.includes(a);
                  return (
                    <label
                      key={a}
                      className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleAmenity(a)} />
                      <span className="text-sm">{a}</span>
                    </label>
                  );
                })}
              </div>
              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {amenities.map((a) => (
                    <Badge key={a} variant="secondary">{a}</Badge>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION: PROJECT DETAILS */}
            <section className="space-y-4">
              <SectionHeading icon={FileText} title="Project Details" subtitle="Builder & RERA information" />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="project_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl><Input placeholder="Prestige Lakeside Habitat" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="rera_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RERA Number</FormLabel>
                    <FormControl><Input placeholder="P02400001234" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="possession_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Possession Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="total_units" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Units in Project</FormLabel>
                    <FormControl><Input type="number" placeholder="350" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </section>

            {/* SECTION: MEDIA */}
            <section className="space-y-4">
              <SectionHeading icon={ImageIcon} title="Media" subtitle="Upload images & floor plans" />

              {/* Property Images */}
              <div className="space-y-2">
                <FormLabel>Property Images <span className="text-xs text-muted-foreground">(JPG/PNG, max 8MB each)</span></FormLabel>
                <input
                  ref={imageInputRef}
                  type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => e.target.files && uploadFiles(e.target.files, "images", setImageFiles)}
                />
                <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Choose Images
                </Button>
                {imageFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
                    {imageFiles.map((f) => (
                      <div key={f.path} className="relative group aspect-square rounded-md overflow-hidden border">
                        <img src={f.url} alt="" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                        <button
                          type="button"
                          onClick={() => removeFile(f.path, setImageFiles)}
                          className="absolute top-1 right-1 bg-background/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Floor Plans */}
              <div className="space-y-2">
                <FormLabel>Floor Plan(s) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                <input
                  ref={floorPlanInputRef}
                  type="file" accept="image/*,.pdf" multiple className="hidden"
                  onChange={(e) => e.target.files && uploadFiles(e.target.files, "floor-plans", setFloorPlanFiles)}
                />
                <Button type="button" variant="outline" onClick={() => floorPlanInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" /> Upload Floor Plans
                </Button>
                {floorPlanFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {floorPlanFiles.map((f) => (
                      <div key={f.path} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1 bg-muted/40">
                        <FileText className="h-3 w-3" />
                        <a href={f.url} target="_blank" rel="noreferrer" className="underline truncate max-w-[140px]">
                          {f.path.split("/").pop()}
                        </a>
                        <button type="button" onClick={() => removeFile(f.path, setFloorPlanFiles)}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FormField control={form.control} name="virtual_tour_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>Virtual Tour Link (optional)</FormLabel>
                  <FormControl><Input placeholder="https://my.matterport.com/show/?m=..." {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="video_urls" render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URLs (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="YouTube / MP4 / Vimeo URLs, one per line" className="min-h-[60px]" {...field} />
                  </FormControl>
                </FormItem>
              )} />
            </section>

            {/* SECTION: CONTACT & VISIBILITY */}
            <section className="space-y-4">
              <SectionHeading icon={Phone} title="Contact & Visibility" subtitle="How buyers reach you" />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="contact_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl><Input placeholder="Sales Team" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="show_contact" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Show contact publicly</FormLabel>
                    <FormDescription className="text-xs">If off, buyers will only contact via the platform.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="is_draft" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Save as Draft</FormLabel>
                    <FormDescription className="text-xs">Drafts are private — not sent for verification.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </section>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting || uploading} size="lg">
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> {form.watch("is_draft") ? "Save Draft" : "Submit for Verification"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
