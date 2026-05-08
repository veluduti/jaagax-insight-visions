import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, MapPin, IndianRupee, Calendar, Sparkles, Image as ImageIcon,
  FileText, User, Save, ArrowLeft, Upload, X, Loader2, CheckCircle2,
} from "lucide-react";

const PROJECT_TYPES = ["Apartment", "Villa", "Plot"];
const PROJECT_STATUSES = ["Upcoming", "Under Construction", "Ready to Move"];
const CITIES = ["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Pune", "Chennai", "Kolkata", "Ahmedabad"];
const UNIT_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK", "5BHK", "Studio", "Penthouse", "Plot"];
const AMENITIES = [
  "Parking", "Gym", "Swimming Pool", "Security", "Lift", "Clubhouse",
  "Power Backup", "Garden", "Children's Play Area", "Jogging Track",
  "Indoor Games", "CCTV", "Fire Safety", "Visitor Parking",
];

interface Form {
  // Basic
  name: string;
  project_type: string;
  status: string;
  description: string;
  // Location
  city: string;
  locality: string;
  address: string;
  pincode: string;
  latitude: string;
  longitude: string;
  // Specs
  total_towers: string;
  total_units: string;
  floors_per_tower: string;
  bhk_types: string[];
  // Pricing
  price_min: string;
  price_max: string;
  price_per_sqft: string;
  // Timeline
  launch_date: string;
  possession_date: string;
  // Amenities
  amenities: string[];
  // Media
  images: string[];
  videos: string[];
  video_url: string;
  virtual_tour_url: string;
  master_plan_url: string;
  // Documents
  rera_id: string;
  rera_document_url: string;
  layout_plan_url: string;
  brochure_url: string;
  environmental_clearance_url: string;
}

const empty: Form = {
  name: "", project_type: "Apartment", status: "Upcoming", description: "",
  city: "", locality: "", address: "", pincode: "", latitude: "", longitude: "",
  total_towers: "", total_units: "", floors_per_tower: "", bhk_types: [],
  price_min: "", price_max: "", price_per_sqft: "",
  launch_date: "", possession_date: "",
  amenities: [],
  images: [], videos: [], video_url: "", virtual_tour_url: "", master_plan_url: "",
  rera_id: "", rera_document_url: "", layout_plan_url: "", brochure_url: "", environmental_clearance_url: "",
};

export default function AddProject() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [builder, setBuilder] = useState<any>(null);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);
      const { data: bp } = await supabase
        .from("builder_profiles").select("*").eq("user_id", user.id).maybeSingle();
      setBuilder(bp);
    })();
  }, [navigate]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggle = (key: "bhk_types" | "amenities", val: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));
  };

  const uploadFile = async (
    file: File,
    field: keyof Form,
    multiple = false,
  ) => {
    if (!user) return;
    setUploading(field as string);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${field}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("project-media").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("project-media").getPublicUrl(path);
      if (multiple) {
        set(field, [...(form[field] as string[]), publicUrl] as any);
      } else {
        set(field, publicUrl as any);
      }
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const removeFromArray = (field: "images" | "videos", url: string) => {
    set(field, (form[field] as string[]).filter((u) => u !== url) as any);
  };

  const validate = (draft: boolean): string | null => {
    if (draft) return form.name ? null : "Project name is required even for drafts";
    if (!form.name) return "Project name is required";
    if (!form.project_type) return "Project type is required";
    if (!form.status) return "Project status is required";
    if (!form.city) return "City is required";
    if (!form.locality) return "Locality is required";
    if (!form.address) return "Full address is required";
    if (!form.price_min) return "Starting price is required";
    if (!form.possession_date) return "Possession date is required";
    if (form.bhk_types.length === 0) return "Select at least one unit type";
    if (!form.rera_id) return "RERA ID is required";
    if (!form.rera_document_url) return "RERA certificate upload is required";
    return null;
  };

  const submit = async (draft = false) => {
    if (!user) { toast.error("Please login"); return; }
    const err = validate(draft);
    if (err) { toast.error(err); return; }

    setSubmitting(true);
    try {
      const payload: any = {
        submitted_by: user.id,
        builder_name: builder?.builder_name || "Unknown Builder",
        name: form.name,
        project_type: form.project_type,
        status: form.status,
        description: form.description || null,
        city: form.city,
        locality: form.locality,
        address: form.address || null,
        pincode: form.pincode || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        total_towers: form.total_towers ? parseInt(form.total_towers) : null,
        total_units: form.total_units ? parseInt(form.total_units) : null,
        floors_per_tower: form.floors_per_tower ? parseInt(form.floors_per_tower) : null,
        bhk_types: form.bhk_types.join(", "),
        price_min: form.price_min ? parseFloat(form.price_min) : null,
        price_max: form.price_max ? parseFloat(form.price_max) : null,
        price_per_sqft: form.price_per_sqft ? parseFloat(form.price_per_sqft) : null,
        avg_price: form.price_min ? parseFloat(form.price_min) : null,
        launch_date: form.launch_date || null,
        possession_date: form.possession_date || null,
        amenities: form.amenities,
        images: form.images,
        image: form.images[0] || null,
        videos: [...form.videos, ...(form.video_url ? [form.video_url] : [])],
        virtual_tour_url: form.virtual_tour_url || null,
        master_plan_url: form.master_plan_url || null,
        rera_id: form.rera_id || null,
        rera_document_url: form.rera_document_url || null,
        layout_plan_url: form.layout_plan_url || null,
        brochure_url: form.brochure_url || null,
        environmental_clearance_url: form.environmental_clearance_url || null,
        is_draft: draft,
        verified: false,
        trust_score: 70,
      };

      const { data, error } = await (supabase.from("projects") as any).insert(payload).select().single();
      if (error) throw error;

      toast.success(draft ? "Draft saved" : "🎉 Project created successfully!");
      navigate(`/builder/dashboard?tab=projects&newProject=${data.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const Section = ({ icon: Icon, title, desc, children }: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" /> {title}
        </CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/builder/dashboard")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Launch a New Project</h1>
          <p className="text-muted-foreground">
            Create a complete real estate project. You can add individual units (properties) once the project is created.
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. Basic */}
          <Section icon={Building2} title="1. Basic Project Information" desc="Tell buyers what your project is">
            <div>
              <Label>Project Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Prestige Lakeside Habitat" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Project Type *</Label>
                <Select value={form.project_type} onValueChange={(v) => set("project_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project Status *</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Project Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Highlight the vision, USPs, and what makes this project special..." />
            </div>
          </Section>

          {/* 2. Location */}
          <Section icon={MapPin} title="2. Location Details" desc="Where is the project located?">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>City *</Label>
                <Select value={form.city} onValueChange={(v) => set("city", v)}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Locality *</Label>
                <Input value={form.locality} onChange={(e) => set("locality", e.target.value)} placeholder="e.g. Whitefield" />
              </div>
            </div>
            <div>
              <Label>Full Address *</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Plot no, street, landmark..." />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Pin Code</Label>
                <Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="560066" maxLength={6} />
              </div>
              <div>
                <Label>Latitude</Label>
                <Input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="12.9716" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="77.5946" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Tip: Get lat/long from Google Maps — right-click a location → copy coordinates.
            </p>
          </Section>

          {/* 3. Specs */}
          <Section icon={Building2} title="3. Project Specifications" desc="The structural blueprint">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Total Towers / Blocks</Label>
                <Input type="number" value={form.total_towers} onChange={(e) => set("total_towers", e.target.value)} placeholder="4" />
              </div>
              <div>
                <Label>Total Units</Label>
                <Input type="number" value={form.total_units} onChange={(e) => set("total_units", e.target.value)} placeholder="320" />
              </div>
              <div>
                <Label>Floors per Tower</Label>
                <Input type="number" value={form.floors_per_tower} onChange={(e) => set("floors_per_tower", e.target.value)} placeholder="22" />
              </div>
            </div>
            <div>
              <Label>Unit Types Available *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {UNIT_TYPES.map((t) => (
                  <Badge
                    key={t}
                    variant={form.bhk_types.includes(t) ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5"
                    onClick={() => toggle("bhk_types", t)}
                  >
                    {form.bhk_types.includes(t) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </Section>

          {/* 4. Pricing */}
          <Section icon={IndianRupee} title="4. Pricing Overview" desc="Individual unit pricing can be added later">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Starting Price (₹) *</Label>
                <Input type="number" value={form.price_min} onChange={(e) => set("price_min", e.target.value)} placeholder="5000000" />
                <p className="text-xs text-muted-foreground mt-1">e.g. 5000000 = ₹50L</p>
              </div>
              <div>
                <Label>Maximum Price (₹)</Label>
                <Input type="number" value={form.price_max} onChange={(e) => set("price_max", e.target.value)} placeholder="15000000" />
              </div>
              <div>
                <Label>Price per sqft (₹)</Label>
                <Input type="number" value={form.price_per_sqft} onChange={(e) => set("price_per_sqft", e.target.value)} placeholder="6500" />
              </div>
            </div>
          </Section>

          {/* 5. Timeline */}
          <Section icon={Calendar} title="5. Project Timeline">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Launch Date</Label>
                <Input type="date" value={form.launch_date} onChange={(e) => set("launch_date", e.target.value)} />
              </div>
              <div>
                <Label>Expected Possession Date *</Label>
                <Input type="date" value={form.possession_date} onChange={(e) => set("possession_date", e.target.value)} />
              </div>
            </div>
          </Section>

          {/* 6. Amenities */}
          <Section icon={Sparkles} title="6. Amenities" desc="What lifestyle does the project offer?">
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <Badge
                  key={a}
                  variant={form.amenities.includes(a) ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => toggle("amenities", a)}
                >
                  {form.amenities.includes(a) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {a}
                </Badge>
              ))}
            </div>
          </Section>

          {/* 7. Media */}
          <Section icon={ImageIcon} title="7. Media Uploads" desc="Show buyers what they're investing in">
            <FileUploader
              label="Project Images (multiple)"
              accept="image/*"
              multiple
              uploading={uploading === "images"}
              onUpload={(f) => uploadFile(f, "images", true)}
            />
            {form.images.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {form.images.map((url) => (
                  <div key={url} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={url} alt="" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                    <button onClick={() => removeFromArray("images", url)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <FileUploader
              label="Videos (optional)"
              accept="video/*"
              multiple
              uploading={uploading === "videos"}
              onUpload={(f) => uploadFile(f, "videos", true)}
            />
            {form.videos.length > 0 && (
              <ul className="text-sm space-y-1">
                {form.videos.map((u) => (
                  <li key={u} className="flex items-center justify-between p-2 border rounded">
                    <span className="truncate">{u.split("/").pop()}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeFromArray("videos", u)}><X className="h-3 w-3" /></Button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Label>YouTube / Video URL (optional)</Label>
              <Input
                value={form.video_url}
                onChange={(e) => set("video_url", e.target.value)}
                placeholder="https://youtu.be/..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a YouTube link to showcase your project walkthrough.
              </p>
            </div>

            <div>
              <Label>360° Virtual Tour URL (optional)</Label>
              <Input
                value={form.virtual_tour_url}
                onChange={(e) => set("virtual_tour_url", e.target.value)}
                placeholder="https://... (Matterport, Kuula, YouTube 360°)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a 360° tour link so buyers can explore the property immersively.
              </p>
            </div>

            <FileUploader
              label="Master Plan Image"
              accept="image/*"
              uploading={uploading === "master_plan_url"}
              onUpload={(f) => uploadFile(f, "master_plan_url")}
            />
            {form.master_plan_url && (
              <img src={form.master_plan_url} alt="Master Plan" className="max-h-48 rounded border"  loading="lazy" decoding="async" />
            )}
          </Section>

          {/* 8. Documents */}
          <Section icon={FileText} title="8. Project Documents" desc="Required for verification & buyer trust">
            <div>
              <Label>RERA ID *</Label>
              <Input value={form.rera_id} onChange={(e) => set("rera_id", e.target.value)} placeholder="PRM/KA/RERA/1251/446/PR/..." />
            </div>
            <FileUploader
              label="RERA Certificate (PDF/Image) *"
              accept=".pdf,image/*"
              uploading={uploading === "rera_document_url"}
              onUpload={(f) => uploadFile(f, "rera_document_url")}
            />
            {form.rera_document_url && <UploadedBadge url={form.rera_document_url} label="RERA Certificate" />}

            <FileUploader
              label="Layout Plan (PDF/Image)"
              accept=".pdf,image/*"
              uploading={uploading === "layout_plan_url"}
              onUpload={(f) => uploadFile(f, "layout_plan_url")}
            />
            {form.layout_plan_url && <UploadedBadge url={form.layout_plan_url} label="Layout Plan" />}

            <FileUploader
              label="Brochure (PDF)"
              accept=".pdf"
              uploading={uploading === "brochure_url"}
              onUpload={(f) => uploadFile(f, "brochure_url")}
            />
            {form.brochure_url && <UploadedBadge url={form.brochure_url} label="Brochure" />}

            <FileUploader
              label="Environmental Clearance (optional)"
              accept=".pdf,image/*"
              uploading={uploading === "environmental_clearance_url"}
              onUpload={(f) => uploadFile(f, "environmental_clearance_url")}
            />
            {form.environmental_clearance_url && <UploadedBadge url={form.environmental_clearance_url} label="Environmental Clearance" />}
          </Section>

          {/* 9. Builder info (read-only) */}
          <Section icon={User} title="9. Builder Information" desc="Auto-filled from your builder profile">
            {builder ? (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Builder Name:</span> <strong>{builder.builder_name}</strong></div>
                <div><span className="text-muted-foreground">Phone:</span> <strong>{builder.phone || "—"}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> <strong>{builder.email || "—"}</strong></div>
                <div><span className="text-muted-foreground">RERA #:</span> <strong>{builder.rera_number || "—"}</strong></div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                ⚠️ No builder profile found. <Button variant="link" className="px-1" onClick={() => navigate("/add-builder-profile")}>Create one →</Button>
              </div>
            )}
          </Section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background/90 backdrop-blur p-4 rounded-xl border shadow-lg">
            <Button variant="outline" onClick={() => submit(true)} disabled={submitting} className="flex-1">
              <Save className="h-4 w-4 mr-2" /> Save as Draft
            </Button>
            <Button onClick={() => submit(false)} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Launch Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileUploader({
  label, accept, multiple = false, uploading, onUpload,
}: {
  label: string; accept: string; multiple?: boolean; uploading: boolean;
  onUpload: (f: File) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <label className="mt-1 flex items-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span className="text-sm text-muted-foreground">
          {uploading ? "Uploading..." : "Click to upload"}
        </span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            files.forEach((f) => onUpload(f));
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function UploadedBadge({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
      <CheckCircle2 className="h-4 w-4" /> {label} uploaded — view
    </a>
  );
}
