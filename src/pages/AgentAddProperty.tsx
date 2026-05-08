import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Home, MapPin, Building2, IndianRupee, Sparkles,
  ImagePlus, FileText, User, Save, CheckCircle2, X, Upload,
} from "lucide-react";
import { classifyProperty, getMissingForFeatured } from "@/lib/propertyClassifier";

const PROPERTY_TYPES = ["Apartment", "Villa", "Independent House", "Plot"] as const;
const FURNISHING = ["Furnished", "Semi-Furnished", "Unfurnished"] as const;
const PROPERTY_AGES = ["New", "1-5 years", "5-10 years", "10+ years"] as const;
const CITIES = ["Bangalore", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Goa", "Mysore"];
const AMENITIES = [
  "Parking", "Lift", "Security", "Power Backup",
  "Gym", "Swimming Pool", "Garden", "Clubhouse",
];

type ListingType = "sale" | "rent";

export default function AgentAddProperty() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Section 1
  const [title, setTitle] = useState("");
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [propertyType, setPropertyType] = useState<string>("Apartment");
  const [description, setDescription] = useState("");

  // Section 2
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Section 3
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [balconies, setBalconies] = useState<string>("");
  const [areaSqft, setAreaSqft] = useState<string>("");
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [totalFloors, setTotalFloors] = useState<string>("");
  const [furnishing, setFurnishing] = useState<string>("Unfurnished");
  const [propertyAge, setPropertyAge] = useState<string>("New");

  // Section 4
  const [price, setPrice] = useState<string>("");
  const [negotiable, setNegotiable] = useState(false);
  const [maintenance, setMaintenance] = useState<string>("");
  const [securityDeposit, setSecurityDeposit] = useState<string>("");

  // Section 5
  const [amenities, setAmenities] = useState<string[]>([]);

  // Section 6
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  // Section 7
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null);
  const [authLetterFile, setAuthLetterFile] = useState<File | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [agentIsOwner, setAgentIsOwner] = useState(false);

  // Section 8
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast.error("Please sign in to add a property");
        navigate("/auth");
        return;
      }
      setUser(authUser);
    })();
  }, [navigate]);

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles((prev) => [...prev, ...files].slice(0, 12));
  };

  const removeImage = (i: number) =>
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));

  const onPickVideos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setVideoFiles((prev) => [...prev, ...files].slice(0, 3));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        toast.success("Location captured");
      },
      () => toast.error("Could not get your location")
    );
  };

  // Validation is intentionally permissive — partial data is allowed.
  // Tier (draft / basic / featured) is computed from what was filled.
  const validate = (_asDraft = false): true | string => true;

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("property-media").upload(path, file, {
      cacheControl: "3600", upsert: false,
    });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("property-media").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleSubmit = async (asDraft = false) => {
    const v = validate(asDraft);
    if (v !== true) return toast.error(v);
    if (!user) return toast.error("Not signed in");

    setSubmitting(true);
    try {
      // Upload media
      const imageUrls: string[] = [];
      for (const f of imageFiles) {
        try { imageUrls.push(await uploadFile(f, "images")); }
        catch (e: any) { console.warn("image upload failed", e); }
      }
      const videoUrls: string[] = [];
      for (const f of videoFiles) {
        try { videoUrls.push(await uploadFile(f, "videos")); }
        catch (e: any) { console.warn("video upload failed", e); }
      }
      const docs: Record<string, string> = {};
      if (ownershipFile) {
        try { docs.ownership = await uploadFile(ownershipFile, "docs"); } catch {}
      }
      if (authLetterFile) {
        try { docs.authorization = await uploadFile(authLetterFile, "docs"); } catch {}
      }
      if (idProofFile) {
        try { docs.id_proof = await uploadFile(idProofFile, "docs"); } catch {}
      }
      docs.owner_name = ownerName;
      docs.owner_phone = ownerPhone;
      if (ownerEmail) docs.owner_email = ownerEmail;
      docs.agent_is_owner = String(agentIsOwner);
      docs.listed_by = "agent";
      docs.agent_user_id = user.id;
      if (listingType === "rent") {
        docs.security_deposit = securityDeposit;
      }

      // Classify based on what was actually filled in
      const tier = classifyProperty({
        title,
        type: propertyType,
        listing_type: listingType,
        city,
        locality,
        price: price ? Number(price) : null,
        bhk: bedrooms ? Number(bedrooms) : null,
        area_sqft: areaSqft ? Number(areaSqft) : null,
        images: imageUrls,
      });
      const finalDraft = asDraft || tier === "draft";

      const payload: any = {
        title: title.trim() || "Untitled property",
        description: description.trim() || null,
        type: propertyType || null,
        listing_type: listingType || null,
        city: city || "Unknown",
        locality: locality.trim() || "Unknown",
        address: address.trim() || null,
        pincode: pincode || null,
        latitude, longitude,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bhk: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        balconies: balconies ? Number(balconies) : null,
        area_sqft: areaSqft ? Number(areaSqft) : null,
        floor_number: floorNumber ? Number(floorNumber) : null,
        total_floors: totalFloors ? Number(totalFloors) : null,
        furnishing,
        property_age: propertyAge,
        price: Number(price || 0),
        price_negotiable: negotiable,
        maintenance_charges: maintenance ? Number(maintenance) : null,
        amenities,
        images: imageUrls,
        video_urls: videoUrls,
        document_urls: { ...docs, listing_tier: tier },
        is_draft: finalDraft,
        verification_status: finalDraft ? "draft" : "pending",
        // Featured listings auto-publish; basic listings still need admin review
        verified: tier === "featured" && !finalDraft,
        submitted_by: user.id,
      };

      // Look up the agent's own agents.id row so we can mark them as the assigned agent
      const { data: agentRow } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const fullPayload = {
        ...payload,
        listed_by: "agent",
        // For agent-listed properties, the agent IS the assigned agent automatically
        assigned_agent_id: agentRow?.id || null,
      };

      const { data: inserted, error } = await supabase
        .from("properties")
        .insert(fullPayload)
        .select("id, title, city")
        .single();
      if (error) throw error;

      // Notify admins so they can approve
      if (!finalDraft && inserted) {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (admins?.length) {
          await supabase.from("notifications").insert(
            admins.map((a: any) => ({
              user_id: a.user_id,
              type: "property_submitted",
              title: "Agent listing — needs verification",
              message: `${inserted.title} (${inserted.city || "N/A"}) submitted by agent. Listing agent already assigned.`,
              link: "/admin",
            }))
          );
        }
      }

      // Tier-based feedback + navigation
      if (tier === "draft") {
        toast.info("Saved as draft — add a title, type and city to publish.");
        navigate("/dashboard/agent");
      } else if (tier === "basic") {
        const missing = getMissingForFeatured({
          title, type: propertyType, listing_type: listingType,
          city, locality, price: price ? Number(price) : null,
          bhk: bedrooms ? Number(bedrooms) : null,
          area_sqft: areaSqft ? Number(areaSqft) : null,
          images: imageUrls,
        });
        toast.success("Listed as a basic property", {
          description: missing.length
            ? `To unlock featured placement add: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}`
            : undefined,
        });
        navigate("/partial-properties");
      } else {
        toast.success("🎉 Submitted as a featured listing!", {
          description: "Eligible for promotions and reels.",
        });
        navigate("/featured-properties");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit property");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background pb-32">
      {/* Top bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b">
        <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/agent")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg md:text-xl font-bold">Add Property</h1>
              <p className="text-xs text-muted-foreground">
                Resale or rental listing · Reviewed before going live
              </p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSubmit(true)} disabled={submitting}>
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button size="sm" onClick={() => handleSubmit(false)} disabled={submitting}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Submit for Review
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-6 max-w-4xl space-y-5">
        {/* 1. Basic Info */}
        <SectionCard icon={Home} title="Basic Information" subtitle="Tell buyers what you're listing">
          <div className="grid gap-4">
            <Field label="Property Title *">
              <Input placeholder="e.g. Spacious 3BHK in Whitefield with park view"
                value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Listing Type *">
                <Select value={listingType} onValueChange={(v) => setListingType(v as ListingType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Property Type *">
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Description *" hint="At least 30 characters. Highlight what makes this property special.">
              <Textarea rows={5} maxLength={1500}
                placeholder="Describe the property, neighbourhood, recent renovations, view, etc."
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        {/* 2. Location */}
        <SectionCard icon={MapPin} title="Location Details" subtitle="Where is the property located?">
          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="City *">
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Locality *">
                <Input placeholder="e.g. Whitefield" value={locality}
                  onChange={(e) => setLocality(e.target.value)} list="locality-suggestions" />
                <datalist id="locality-suggestions">
                  {["Whitefield","Indiranagar","HSR Layout","Koramangala","Powai","Bandra","Andheri","Gurgaon","Noida","Hitech City"].map((l) =>
                    <option key={l} value={l} />)}
                </datalist>
              </Field>
            </div>
            <Field label="Address *">
              <Input placeholder="Building / Street / Landmark" value={address}
                onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Pin Code">
                <Input inputMode="numeric" maxLength={6} value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Latitude">
                <Input type="number" step="0.000001" value={latitude ?? ""}
                  onChange={(e) => setLatitude(e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="Longitude">
                <Input type="number" step="0.000001" value={longitude ?? ""}
                  onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} className="w-fit">
              <MapPin className="h-4 w-4 mr-2" /> Use Current Location
            </Button>
          </div>
        </SectionCard>

        {/* 3. Property Details */}
        <SectionCard icon={Building2} title="Property Details" subtitle="The specs buyers care about">
          <div className="grid md:grid-cols-3 gap-4">
            <Field label={propertyType === "Plot" ? "Bedrooms" : "BHK / Bedrooms *"}>
              <Input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </Field>
            <Field label={propertyType === "Plot" ? "Bathrooms" : "Bathrooms *"}>
              <Input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </Field>
            <Field label="Balconies">
              <Input type="number" min={0} value={balconies} onChange={(e) => setBalconies(e.target.value)} />
            </Field>
            <Field label="Area (sq ft) *">
              <Input type="number" min={1} value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} />
            </Field>
            <Field label="Floor Number">
              <Input type="number" min={0} value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} />
            </Field>
            <Field label="Total Floors">
              <Input type="number" min={0} value={totalFloors} onChange={(e) => setTotalFloors(e.target.value)} />
            </Field>
            <Field label="Furnishing">
              <Select value={furnishing} onValueChange={setFurnishing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FURNISHING.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Property Age">
              <Select value={propertyAge} onValueChange={setPropertyAge}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_AGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SectionCard>

        {/* 4. Pricing */}
        <SectionCard icon={IndianRupee} title="Pricing Details" subtitle={listingType === "rent" ? "Monthly rent & deposit" : "Expected sale price"}>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={listingType === "rent" ? "Monthly Rent (₹) *" : "Expected Price (₹) *"}>
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Maintenance Charges (₹)">
              <Input type="number" min={0} value={maintenance} onChange={(e) => setMaintenance(e.target.value)} />
            </Field>
            {listingType === "rent" && (
              <Field label="Security Deposit (₹) *">
                <Input type="number" min={0} value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)} />
              </Field>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Checkbox id="negotiable" checked={negotiable}
                onCheckedChange={(v) => setNegotiable(Boolean(v))} />
              <Label htmlFor="negotiable" className="cursor-pointer">Price is negotiable</Label>
            </div>
          </div>
        </SectionCard>

        {/* 5. Amenities */}
        <SectionCard icon={Sparkles} title="Amenities" subtitle="What the property offers">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {AMENITIES.map((a) => {
              const active = amenities.includes(a);
              return (
                <button
                  type="button" key={a} onClick={() => toggleAmenity(a)}
                  className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                    active
                      ? "bg-primary/10 border-primary text-primary font-medium"
                      : "border-border hover:border-primary/40 hover:bg-accent/40"
                  }`}
                >
                  {active && <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />}
                  {a}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* 6. Media */}
        <SectionCard icon={ImagePlus} title="Media Upload" subtitle="At least 3 images required">
          <div className="space-y-4">
            <label className="block border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drop images or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG · up to 12 images</p>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
            </label>
            {imageFiles.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {imageFiles.map((f, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden aspect-square border">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-background/80 backdrop-blur rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label className="text-sm">Video (optional)</Label>
              <Input type="file" accept="video/*" multiple onChange={onPickVideos} className="mt-1.5" />
              {videoFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{videoFiles.length} video(s) selected</p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* 7. Documents */}
        <SectionCard icon={FileText} title="Documents (for Verification)" subtitle="Required for trust & approval">
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/40 border">
              <Checkbox id="agent-owner" checked={agentIsOwner}
                onCheckedChange={(v) => setAgentIsOwner(Boolean(v))} />
              <Label htmlFor="agent-owner" className="cursor-pointer text-sm">
                I am the owner of this property
              </Label>
            </div>
            <DocField label="Ownership Proof *" file={ownershipFile} setFile={setOwnershipFile} />
            {!agentIsOwner && (
              <DocField label="Authorization Letter *" file={authLetterFile} setFile={setAuthLetterFile} />
            )}
            <DocField label="ID Proof (optional)" file={idProofFile} setFile={setIdProofFile} />
          </div>
        </SectionCard>

        {/* 8. Owner */}
        <SectionCard icon={User} title="Owner Details" subtitle="The owner the lead will reach if approved">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Owner Name *">
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </Field>
            <Field label="Owner Contact Number *">
              <Input inputMode="tel" maxLength={15} value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)} />
            </Field>
            <Field label="Owner Email">
              <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* Sticky mobile submit */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t p-3 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => handleSubmit(true)} disabled={submitting}>
          <Save className="h-4 w-4 mr-2" /> Draft
        </Button>
        <Button ref={submitRef} className="flex-1" onClick={() => handleSubmit(false)} disabled={submitting}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Small helpers ---------- */
function SectionCard({
  icon: Icon, title, subtitle, children,
}: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
          {title}
        </CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DocField({
  label, file, setFile,
}: { label: string; file: File | null; setFile: (f: File | null) => void }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2 mt-1.5">
        <Input type="file" accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {file && (
          <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
    </div>
  );
}
