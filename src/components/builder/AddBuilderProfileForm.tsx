import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2, User, Briefcase, Image, Phone, Layers, Globe, Award, Users, Target,
  Check, Wifi, Car, Dumbbell, Trees, Shield, Waves, Wind, Droplets,
  Zap, Baby, Dog, Flower2, Gamepad2, BookOpen, Coffee, Upload, X, Loader2,
  MapPin, Plus, Trash2, FileText, Compass, Clock
} from "lucide-react";

const AMENITY_OPTIONS = [
  { name: "Swimming Pool", icon: Waves },
  { name: "Gym", icon: Dumbbell },
  { name: "Parking", icon: Car },
  { name: "Garden", icon: Trees },
  { name: "Security", icon: Shield },
  { name: "Wi-Fi", icon: Wifi },
  { name: "AC", icon: Wind },
  { name: "Water Supply", icon: Droplets },
  { name: "Power Backup", icon: Zap },
  { name: "Kids Play Area", icon: Baby },
  { name: "Pet Friendly", icon: Dog },
  { name: "Landscaping", icon: Flower2 },
  { name: "Game Room", icon: Gamepad2 },
  { name: "Library", icon: BookOpen },
  { name: "Cafeteria", icon: Coffee },
];

const UNIT_TYPES = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "Villa", "Penthouse", "Duplex", "Studio", "Plot"];
const SPECIALIZATIONS = ["Luxury Residences", "Affordable Housing", "Commercial Spaces", "Retail Malls", "Villas", "Gated Communities", "Townships", "Hospitality", "SEZ & Tech Parks", "Plotted Development"];
const FACING_OPTIONS = ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];

// Known locations for auto lat/lng
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  "narsingi": { lat: 17.3616, lng: 78.3573 },
  "kondapur": { lat: 17.4577, lng: 78.3531 },
  "gachibowli": { lat: 17.4401, lng: 78.3489 },
  "madhapur": { lat: 17.4484, lng: 78.3908 },
  "hitech city": { lat: 17.4435, lng: 78.3772 },
  "banjara hills": { lat: 17.4156, lng: 78.4347 },
  "jubilee hills": { lat: 17.4325, lng: 78.4073 },
  "kukatpally": { lat: 17.4947, lng: 78.3996 },
  "miyapur": { lat: 17.4969, lng: 78.3537 },
  "manikonda": { lat: 17.4008, lng: 78.3867 },
  "kokapet": { lat: 17.3869, lng: 78.3289 },
  "tellapur": { lat: 17.4348, lng: 78.2907 },
  "bachupally": { lat: 17.5381, lng: 78.3668 },
  "nallagandla": { lat: 17.4497, lng: 78.3144 },
  "shamshabad": { lat: 17.2432, lng: 78.4288 },
  "kompally": { lat: 17.5532, lng: 78.4878 },
  "lb nagar": { lat: 17.3497, lng: 78.5481 },
  "uppal": { lat: 17.4039, lng: 78.5640 },
  "dilsukhnagar": { lat: 17.3673, lng: 78.5247 },
  "ameerpet": { lat: 17.4375, lng: 78.4483 },
  "begumpet": { lat: 17.4432, lng: 78.4707 },
  "secunderabad": { lat: 17.4399, lng: 78.4983 },
  "attapur": { lat: 17.3683, lng: 78.4107 },
  "bandlaguda": { lat: 17.3333, lng: 78.3922 },
  "financial district": { lat: 17.4218, lng: 78.3384 },
  "puppalguda": { lat: 17.3807, lng: 78.3756 },
  "mokila": { lat: 17.3888, lng: 78.2630 },
  "shadnagar": { lat: 17.0699, lng: 78.2075 },
  "adibatla": { lat: 17.2665, lng: 78.5236 },
  "maheshwaram": { lat: 17.1583, lng: 78.4250 },
};

interface FloorPlanVariant {
  name: string;
  size: string;
  facing: string;
  carpetArea: string;
  beds: number;
  baths: number;
  balconies: number;
  image: string;
  priceRange: string;
  highlights: string[];
}

interface TimelineEntry {
  year: string;
  title: string;
  desc: string;
}

const classifyBuilder = (numberOfProjects: number): "luxury" | "standard" | "budget" => {
  if (numberOfProjects > 100) return "luxury";
  if (numberOfProjects >= 50) return "standard";
  return "budget";
};

const emptyFloorPlan = (): FloorPlanVariant => ({
  name: "", size: "", facing: "East", carpetArea: "", beds: 2, baths: 2, balconies: 1, image: "", priceRange: "", highlights: [],
});

const emptyTimeline = (): TimelineEntry => ({ year: "", title: "", desc: "" });

// Try to auto-detect lat/lng from project location text
const autoDetectCoords = (location: string): { lat: string; lng: string } | null => {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (lower.includes(key)) {
      return { lat: coords.lat.toString(), lng: coords.lng.toString() };
    }
  }
  return null;
};

const AddBuilderProfileForm = ({ editId }: { editId?: string }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editId);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    builderName: "", tagline: "", description: "",
    yearsOfExperience: "", certifications: "", reraNumber: "",
    numberOfProjects: "", priceRangeMin: "", priceRangeMax: "",
    unitTypes: [] as string[], locations: [] as string[], locationInput: "",
    amenities: [] as string[], images: [] as string[], imageInput: "",
    videos: [] as string[], videoInput: "",
    phone: "", whatsapp: "", email: "",
    logo: "", website: "", establishedYear: "",
    companyRegistrationNumber: "", aboutMission: "", aboutVision: "",
    specializations: [] as string[],
    completedProjectsCount: "", ongoingProjectsCount: "", upcomingProjectsCount: "",
    totalUnitsDelivered: "", totalLandDevelopedSqft: "",
    awards: [] as string[], awardInput: "",
    operatingCities: [] as string[], operatingCityInput: "",
    socialLinkedin: "", socialFacebook: "", socialInstagram: "", socialYoutube: "",
    projectSubtitle: "", projectLocation: "", heroImage: "",
    bhkTypesOffered: "", sizeRange: "", landArea: "",
    totalUnitsCount: "", totalFloorsCount: "", towersCount: "",
    clubhouseDescription: "", clubhouseImages: [] as string[], clubhouseImageInput: "",
    masterPlanImage: "",
    galleryImages: [] as string[], galleryImageInput: "",
    latitude: "", longitude: "", googleMapsLink: "",
    brochureUrl: "",
    aboutFeatures: [] as string[], aboutFeatureInput: "",
    // Amenity images with descriptions
    amenityImages: [] as { url: string; description: string }[],
    amenityImageUrl: "",
    amenityImageDesc: "",
  });

  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);

  const [floorPlans, setFloorPlans] = useState<Record<string, FloorPlanVariant[]>>({
    "2BHK": [emptyFloorPlan()],
    "3BHK": [emptyFloorPlan()],
  });
  const [activeFpTab, setActiveFpTab] = useState("2BHK");
  const [highlightInput, setHighlightInput] = useState<Record<string, string>>({});

  // Auto-detect coordinates when project location changes
  useEffect(() => {
    if (form.latitude || form.longitude) return; // Don't override manual entries
    const coords = autoDetectCoords(form.projectLocation);
    if (coords) {
      setForm((prev) => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
    }
  }, [form.projectLocation]);

  // Load existing profile for edit
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      const { data } = await supabase.from("builder_profiles").select("*").eq("id", editId).single();
      if (!data) { setIsLoading(false); return; }
      const b = data as any;
      const social = (b.social_links || {}) as Record<string, string>;
      setForm({
        builderName: b.builder_name || "", tagline: b.tagline || "", description: b.description || "",
        yearsOfExperience: b.years_of_experience?.toString() || "", certifications: b.certifications || "", reraNumber: b.rera_number || "",
        numberOfProjects: b.number_of_projects?.toString() || "", priceRangeMin: b.price_range_min?.toString() || "", priceRangeMax: b.price_range_max?.toString() || "",
        unitTypes: b.unit_types || [], locations: b.locations || [], locationInput: "",
        amenities: b.amenities || [], images: b.images || [], imageInput: "",
        videos: b.videos || [], videoInput: "",
        phone: b.phone || "", whatsapp: b.whatsapp || "", email: b.email || "",
        logo: b.logo || "", website: b.website || "", establishedYear: b.established_year?.toString() || "",
        companyRegistrationNumber: b.company_registration_number || "", aboutMission: b.about_mission || "", aboutVision: b.about_vision || "",
        specializations: b.specializations || [],
        completedProjectsCount: b.completed_projects_count?.toString() || "", ongoingProjectsCount: b.ongoing_projects_count?.toString() || "", upcomingProjectsCount: b.upcoming_projects_count?.toString() || "",
        totalUnitsDelivered: b.total_units_delivered?.toString() || "", totalLandDevelopedSqft: b.total_land_developed_sqft?.toString() || "",
        awards: b.awards || [], awardInput: "",
        operatingCities: b.operating_cities || [], operatingCityInput: "",
        socialLinkedin: social.linkedin || "", socialFacebook: social.facebook || "", socialInstagram: social.instagram || "", socialYoutube: social.youtube || "",
        projectSubtitle: b.project_subtitle || "", projectLocation: b.project_location || "", heroImage: b.hero_image || "",
        bhkTypesOffered: b.bhk_types_offered || "", sizeRange: b.size_range || "", landArea: b.land_area || "",
        totalUnitsCount: b.total_units_count?.toString() || "", totalFloorsCount: b.total_floors_count || "", towersCount: b.towers_count?.toString() || "",
        clubhouseDescription: b.clubhouse_description || "", clubhouseImages: b.clubhouse_images || [], clubhouseImageInput: "",
        masterPlanImage: b.master_plan_image || "",
        galleryImages: b.gallery_images || [], galleryImageInput: "",
        latitude: b.latitude?.toString() || "", longitude: b.longitude?.toString() || "", googleMapsLink: b.google_maps_link || "",
        brochureUrl: b.brochure_url || "",
        aboutFeatures: b.about_features || [], aboutFeatureInput: "",
        amenityImages: Array.isArray(b.amenity_images) ? b.amenity_images : [],
        amenityImageUrl: "",
        amenityImageDesc: "",
      });
      if (b.floor_plans_data && Object.keys(b.floor_plans_data).length > 0) {
        setFloorPlans(b.floor_plans_data);
        setActiveFpTab(Object.keys(b.floor_plans_data)[0] || "2BHK");
      }
      // Load timeline
      if (Array.isArray(b.timeline_data) && b.timeline_data.length > 0) {
        setTimelineEntries(b.timeline_data);
      }
      setIsLoading(false);
    };
    load();
  }, [editId]);

  const updateField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleArrayItem = (field: "unitTypes" | "amenities" | "specializations", item: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(item) ? prev[field].filter((i) => i !== item) : [...prev[field], item],
    }));
  };

  const addToArray = (field: string, inputField: string) => {
    if ((form as any)[inputField]?.trim()) {
      setForm((prev) => ({ ...prev, [field]: [...((prev as any)[field] || []), (prev as any)[inputField].trim()], [inputField]: "" }));
    }
  };

  const removeFromArray = (field: string, index: number) => {
    setForm((prev) => ({ ...prev, [field]: ((prev as any)[field] || []).filter((_: any, i: number) => i !== index) }));
  };

  // Timeline helpers
  const addTimelineEntry = () => setTimelineEntries((prev) => [...prev, emptyTimeline()]);
  const removeTimelineEntry = (index: number) => setTimelineEntries((prev) => prev.filter((_, i) => i !== index));
  const updateTimelineEntry = (index: number, field: keyof TimelineEntry, value: string) => {
    setTimelineEntries((prev) => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  // Floor plan helpers
  const addFloorPlanVariant = (category: string) => {
    setFloorPlans((prev) => ({ ...prev, [category]: [...(prev[category] || []), emptyFloorPlan()] }));
  };
  const removeFloorPlanVariant = (category: string, index: number) => {
    setFloorPlans((prev) => ({ ...prev, [category]: prev[category].filter((_, i) => i !== index) }));
  };
  const updateFloorPlan = (category: string, index: number, field: string, value: any) => {
    setFloorPlans((prev) => ({
      ...prev,
      [category]: prev[category].map((fp, i) => i === index ? { ...fp, [field]: value } : fp),
    }));
  };
  const addFpHighlight = (category: string, index: number) => {
    const key = `${category}-${index}`;
    const val = highlightInput[key]?.trim();
    if (!val) return;
    setFloorPlans((prev) => ({
      ...prev,
      [category]: prev[category].map((fp, i) => i === index ? { ...fp, highlights: [...fp.highlights, val] } : fp),
    }));
    setHighlightInput((prev) => ({ ...prev, [key]: "" }));
  };
  const removeFpHighlight = (category: string, fpIndex: number, hlIndex: number) => {
    setFloorPlans((prev) => ({
      ...prev,
      [category]: prev[category].map((fp, i) => i === fpIndex ? { ...fp, highlights: fp.highlights.filter((_, j) => j !== hlIndex) } : fp),
    }));
  };
  const addFpCategory = () => {
    const cats = Object.keys(floorPlans);
    const next = `${cats.length + 1}BHK`;
    if (!floorPlans[next]) {
      setFloorPlans((prev) => ({ ...prev, [next]: [emptyFloorPlan()] }));
      setActiveFpTab(next);
    }
  };

  const handleSubmit = async () => {
    if (!form.builderName.trim()) {
      toast({ title: "Required", description: "Builder name is required.", variant: "destructive" });
      return;
    }
    if (!form.phone.trim()) {
      toast({ title: "Required", description: "Phone number is required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const type = classifyBuilder(Number(form.numberOfProjects) || 0);
    const { data: userData } = await supabase.auth.getUser();

    const socialLinks: Record<string, string> = {};
    if (form.socialLinkedin) socialLinks.linkedin = form.socialLinkedin;
    if (form.socialFacebook) socialLinks.facebook = form.socialFacebook;
    if (form.socialInstagram) socialLinks.instagram = form.socialInstagram;
    if (form.socialYoutube) socialLinks.youtube = form.socialYoutube;

    // Clean floor plans
    const cleanedFloorPlans: Record<string, FloorPlanVariant[]> = {};
    for (const [cat, plans] of Object.entries(floorPlans)) {
      const valid = plans.filter((p) => p.name.trim() || p.size.trim());
      if (valid.length > 0) cleanedFloorPlans[cat] = valid;
    }

    // Clean timeline
    const cleanedTimeline = timelineEntries.filter((t) => t.year.trim() && t.title.trim());

    const payload = {
      user_id: userData?.user?.id || null,
      builder_name: form.builderName,
      tagline: form.tagline || null,
      description: form.description || null,
      type,
      price_range_min: Number(form.priceRangeMin) || null,
      price_range_max: Number(form.priceRangeMax) || null,
      number_of_projects: Number(form.numberOfProjects) || 0,
      unit_types: form.unitTypes,
      locations: form.locations,
      amenities: form.amenities,
      images: form.images,
      videos: form.videos,
      phone: form.phone,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      years_of_experience: Number(form.yearsOfExperience) || null,
      certifications: form.certifications || null,
      rera_number: form.reraNumber || null,
      logo: form.logo || null,
      website: form.website || null,
      established_year: Number(form.establishedYear) || null,
      company_registration_number: form.companyRegistrationNumber || null,
      about_mission: form.aboutMission || null,
      about_vision: form.aboutVision || null,
      specializations: form.specializations,
      completed_projects_count: Number(form.completedProjectsCount) || 0,
      ongoing_projects_count: Number(form.ongoingProjectsCount) || 0,
      upcoming_projects_count: Number(form.upcomingProjectsCount) || 0,
      total_units_delivered: Number(form.totalUnitsDelivered) || 0,
      total_land_developed_sqft: Number(form.totalLandDevelopedSqft) || 0,
      awards: form.awards,
      operating_cities: form.operatingCities,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      project_subtitle: form.projectSubtitle || null,
      project_location: form.projectLocation || null,
      hero_image: form.heroImage || null,
      bhk_types_offered: form.bhkTypesOffered || null,
      size_range: form.sizeRange || null,
      land_area: form.landArea || null,
      total_units_count: Number(form.totalUnitsCount) || 0,
      total_floors_count: form.totalFloorsCount || null,
      towers_count: Number(form.towersCount) || 0,
      clubhouse_description: form.clubhouseDescription || null,
      clubhouse_images: form.clubhouseImages,
      master_plan_image: form.masterPlanImage || null,
      floor_plans_data: cleanedFloorPlans,
      gallery_images: form.galleryImages,
      latitude: Number(form.latitude) || null,
      longitude: Number(form.longitude) || null,
      google_maps_link: form.googleMapsLink || null,
      brochure_url: form.brochureUrl || null,
      about_features: form.aboutFeatures,
      timeline_data: cleanedTimeline.length > 0 ? cleanedTimeline : null,
    } as any;

    let error;
    if (editId) {
      const res = await supabase.from("builder_profiles").update(payload).eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("builder_profiles").insert(payload);
      error = res.error;
    }

    setIsSubmitting(false);
    if (error) {
      console.error("Builder profile error:", error.message, error.details, error.hint);
      toast({ title: "Error", description: `Failed to ${editId ? "update" : "create"} builder profile: ${error.message}`, variant: "destructive" });
      return;
    }
    toast({ title: "Success!", description: `Builder profile ${editId ? "updated" : "created"} as "${type}" category.` });
    navigate("/");
  };

  const currentType = classifyBuilder(Number(form.numberOfProjects) || 0);

  const ArrayInputField = ({ label, field, inputField, placeholder }: { label: string; field: string; inputField: string; placeholder: string }) => (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <Input value={(form as any)[inputField]} onChange={(e) => updateField(inputField, e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray(field, inputField))} />
        <Button type="button" variant="outline" onClick={() => addToArray(field, inputField)}>Add</Button>
      </div>
      {((form as any)[field] || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {((form as any)[field] || []).map((item: string, i: number) => (
            <Badge key={i} variant="secondary" className="gap-1">{item}<X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray(field, i)} /></Badge>
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-20 pb-24 px-4 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-7 w-7 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{editId ? "Edit" : "Add"} Builder Profile</h1>
          <p className="text-sm text-muted-foreground">Create a comprehensive builder profile with project details</p>
        </div>
      </div>

      {/* ═══ BASIC INFO ═══ */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-primary" />Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Builder Name <span className="text-destructive">*</span></label><Input value={form.builderName} onChange={(e) => updateField("builderName", e.target.value)} placeholder="e.g. Prestige Group" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Established Year</label><Input type="number" value={form.establishedYear} onChange={(e) => updateField("establishedYear", e.target.value)} placeholder="e.g. 1986" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Tagline</label><Input value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="e.g. Building Dreams Since 1986" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Project Subtitle</label><Input value={form.projectSubtitle} onChange={(e) => updateField("projectSubtitle", e.target.value)} placeholder="e.g. Premium 2 & 3 BHK Residences" /></div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project Location (Full Address)</label>
              <Input value={form.projectLocation} onChange={(e) => updateField("projectLocation", e.target.value)} placeholder="e.g. Survey No. 42, Kondapur, Hyderabad" />
              {form.projectLocation && autoDetectCoords(form.projectLocation) && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location auto-detected for map</p>
              )}
            </div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">About / Description</label><Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Tell us about the builder..." rows={4} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Mission</label><Textarea value={form.aboutMission} onChange={(e) => updateField("aboutMission", e.target.value)} placeholder="Our mission..." rows={2} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Vision</label><Textarea value={form.aboutVision} onChange={(e) => updateField("aboutVision", e.target.value)} placeholder="Our vision..." rows={2} /></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Logo URL</label><Input value={form.logo} onChange={(e) => updateField("logo", e.target.value)} placeholder="https://example.com/logo.png" /></div>
          <ArrayInputField label="About Features / Highlights" field="aboutFeatures" inputField="aboutFeatureInput" placeholder="e.g. Smart home automation" />
        </CardContent>
      </Card>

      {/* ═══ OUR LEGACY / TIMELINE ═══ */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5 text-primary" />Our Legacy (Timeline)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addTimelineEntry}><Plus className="h-3 w-3 mr-1" /> Add Entry</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Add milestones to show your builder's journey. Leave empty to hide this section.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {timelineEntries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No timeline entries yet. Click "Add Entry" to start building your legacy.</p>
          )}
          {timelineEntries.map((entry, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Milestone {idx + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeTimelineEntry(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Year (e.g. 1998)" value={entry.year} onChange={(e) => updateTimelineEntry(idx, "year", e.target.value)} />
                <Input placeholder="Title (e.g. Founded)" value={entry.title} onChange={(e) => updateTimelineEntry(idx, "title", e.target.value)} />
              </div>
              <Textarea placeholder="Description (e.g. Established with a vision for quality living)" value={entry.desc} onChange={(e) => updateTimelineEntry(idx, "desc", e.target.value)} rows={2} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══ PROJECT HIGHLIGHTS ═══ */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-primary" />Project Highlights</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">BHK Types</label><Input value={form.bhkTypesOffered} onChange={(e) => updateField("bhkTypesOffered", e.target.value)} placeholder="e.g. 2 & 3 BHK" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Size Range</label><Input value={form.sizeRange} onChange={(e) => updateField("sizeRange", e.target.value)} placeholder="e.g. 1,250–2,200 Sft" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Land Area</label><Input value={form.landArea} onChange={(e) => updateField("landArea", e.target.value)} placeholder="e.g. 5.5 Acres" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Total Units</label><Input type="number" value={form.totalUnitsCount} onChange={(e) => updateField("totalUnitsCount", e.target.value)} placeholder="e.g. 480" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Floors</label><Input value={form.totalFloorsCount} onChange={(e) => updateField("totalFloorsCount", e.target.value)} placeholder="e.g. G+25" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Towers</label><Input type="number" value={form.towersCount} onChange={(e) => updateField("towersCount", e.target.value)} placeholder="e.g. 4" /></div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ BUSINESS & LEGAL ═══ */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" />Business & Legal</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Years of Experience</label><Input type="number" value={form.yearsOfExperience} onChange={(e) => updateField("yearsOfExperience", e.target.value)} placeholder="e.g. 15" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">RERA Number</label><Input value={form.reraNumber} onChange={(e) => updateField("reraNumber", e.target.value)} placeholder="e.g. P02400003243" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">CIN / Registration</label><Input value={form.companyRegistrationNumber} onChange={(e) => updateField("companyRegistrationNumber", e.target.value)} placeholder="e.g. U45200KA1986PLC007191" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Certifications</label><Input value={form.certifications} onChange={(e) => updateField("certifications", e.target.value)} placeholder="e.g. ISO 9001, IGBC Gold" /></div>
          <ArrayInputField label="Awards & Recognition" field="awards" inputField="awardInput" placeholder="e.g. Best Builder Award 2023" />
        </CardContent>
      </Card>

      {/* ═══ PROJECT PORTFOLIO ═══ */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Layers className="h-5 w-5 text-primary" />Project Portfolio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Total Projects</label><Input type="number" value={form.numberOfProjects} onChange={(e) => updateField("numberOfProjects", e.target.value)} placeholder="e.g. 50" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Completed</label><Input type="number" value={form.completedProjectsCount} onChange={(e) => updateField("completedProjectsCount", e.target.value)} placeholder="e.g. 35" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Ongoing</label><Input type="number" value={form.ongoingProjectsCount} onChange={(e) => updateField("ongoingProjectsCount", e.target.value)} placeholder="e.g. 10" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Upcoming</label><Input type="number" value={form.upcomingProjectsCount} onChange={(e) => updateField("upcomingProjectsCount", e.target.value)} placeholder="e.g. 5" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Units Delivered</label><Input type="number" value={form.totalUnitsDelivered} onChange={(e) => updateField("totalUnitsDelivered", e.target.value)} placeholder="e.g. 20000" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Land Developed (sqft)</label><Input type="number" value={form.totalLandDevelopedSqft} onChange={(e) => updateField("totalLandDevelopedSqft", e.target.value)} placeholder="e.g. 50000000" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Min Price (₹)</label><Input type="number" value={form.priceRangeMin} onChange={(e) => updateField("priceRangeMin", e.target.value)} placeholder="e.g. 3000000" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Max Price (₹)</label><Input type="number" value={form.priceRangeMax} onChange={(e) => updateField("priceRangeMax", e.target.value)} placeholder="e.g. 15000000" /></div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Unit Types</label>
            <div className="flex flex-wrap gap-2">
              {UNIT_TYPES.map((u) => (
                <Badge key={u} variant={form.unitTypes.includes(u) ? "default" : "outline"} className="cursor-pointer transition-all hover:scale-105" onClick={() => toggleArrayItem("unitTypes", u)}>{u}</Badge>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Specializations</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((s) => (
                <Badge key={s} variant={form.specializations.includes(s) ? "default" : "outline"} className="cursor-pointer transition-all hover:scale-105 text-xs" onClick={() => toggleArrayItem("specializations", s)}>{s}</Badge>
              ))}
            </div>
          </div>
          <ArrayInputField label="Locations" field="locations" inputField="locationInput" placeholder="e.g. Gachibowli, Hyderabad" />
          <ArrayInputField label="Operating Cities" field="operatingCities" inputField="operatingCityInput" placeholder="e.g. Hyderabad" />
        </CardContent>
      </Card>

      {/* ═══ AMENITIES ═══ */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5 text-primary" />Amenities</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {AMENITY_OPTIONS.map((a) => {
              const Icon = a.icon;
              const selected = form.amenities.includes(a.name);
              return (
                <button key={a.name} type="button" onClick={() => toggleArrayItem("amenities", a.name)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-xs ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                  <Icon className="h-5 w-5" /><span className="text-center leading-tight">{a.name}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══ FLOOR PLANS ═══ */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg"><Compass className="h-5 w-5 text-primary" />Floor Plans</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addFpCategory}><Plus className="h-3 w-3 mr-1" /> Add Category</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {Object.keys(floorPlans).map((cat) => (
              <Button key={cat} type="button" variant={activeFpTab === cat ? "default" : "outline"} size="sm" onClick={() => setActiveFpTab(cat)}>{cat}</Button>
            ))}
          </div>
          <div className="space-y-4">
            {(floorPlans[activeFpTab] || []).map((fp, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Variant {idx + 1}</span>
                  {(floorPlans[activeFpTab] || []).length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFloorPlanVariant(activeFpTab, idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Type Name (e.g. Type A Compact)" value={fp.name} onChange={(e) => updateFloorPlan(activeFpTab, idx, "name", e.target.value)} />
                  <Input placeholder="Size (e.g. 1,250 Sft)" value={fp.size} onChange={(e) => updateFloorPlan(activeFpTab, idx, "size", e.target.value)} />
                  <Select value={fp.facing} onValueChange={(v) => updateFloorPlan(activeFpTab, idx, "facing", v)}>
                    <SelectTrigger><SelectValue placeholder="Facing" /></SelectTrigger>
                    <SelectContent>
                      {FACING_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Carpet Area (e.g. 925 Sft)" value={fp.carpetArea} onChange={(e) => updateFloorPlan(activeFpTab, idx, "carpetArea", e.target.value)} />
                  <Input type="number" placeholder="Beds" value={fp.beds} onChange={(e) => updateFloorPlan(activeFpTab, idx, "beds", Number(e.target.value))} />
                  <Input type="number" placeholder="Baths" value={fp.baths} onChange={(e) => updateFloorPlan(activeFpTab, idx, "baths", Number(e.target.value))} />
                  <Input type="number" placeholder="Balconies" value={fp.balconies} onChange={(e) => updateFloorPlan(activeFpTab, idx, "balconies", Number(e.target.value))} />
                  <Input placeholder="Price Range (e.g. ₹80L–1Cr)" value={fp.priceRange} onChange={(e) => updateFloorPlan(activeFpTab, idx, "priceRange", e.target.value)} />
                </div>
                <Input placeholder="Floor Plan Image URL" value={fp.image} onChange={(e) => updateFloorPlan(activeFpTab, idx, "image", e.target.value)} />
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Highlights</label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. Morning sunlight" value={highlightInput[`${activeFpTab}-${idx}`] || ""}
                      onChange={(e) => setHighlightInput((prev) => ({ ...prev, [`${activeFpTab}-${idx}`]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFpHighlight(activeFpTab, idx))} />
                    <Button type="button" variant="outline" size="sm" onClick={() => addFpHighlight(activeFpTab, idx)}>Add</Button>
                  </div>
                  {fp.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {fp.highlights.map((h, hi) => (
                        <Badge key={hi} variant="secondary" className="text-xs gap-1">{h}<X className="h-2.5 w-2.5 cursor-pointer" onClick={() => removeFpHighlight(activeFpTab, idx, hi)} /></Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={() => addFloorPlanVariant(activeFpTab)}>
              <Plus className="h-4 w-4 mr-2" /> Add {activeFpTab} Variant
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══ MEDIA ═══ */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Image className="h-5 w-5 text-primary" />Media & Gallery</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">Hero Image URL</label><Input value={form.heroImage} onChange={(e) => updateField("heroImage", e.target.value)} placeholder="Main hero background image URL" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Master Plan Image URL</label><Input value={form.masterPlanImage} onChange={(e) => updateField("masterPlanImage", e.target.value)} placeholder="Master plan / site layout image URL" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Brochure PDF URL</label><Input value={form.brochureUrl} onChange={(e) => updateField("brochureUrl", e.target.value)} placeholder="https://example.com/brochure.pdf" /></div>

          <ArrayInputField label="Project Images" field="images" inputField="imageInput" placeholder="Paste image URL" />
          {form.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <button onClick={() => removeFromArray("images", i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          <ArrayInputField label="Gallery Images" field="galleryImages" inputField="galleryImageInput" placeholder="Gallery image URL" />
          {form.galleryImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.galleryImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <button onClick={() => removeFromArray("galleryImages", i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          <ArrayInputField label="Clubhouse Images" field="clubhouseImages" inputField="clubhouseImageInput" placeholder="Clubhouse image URL" />
          <div><label className="text-sm font-medium mb-1.5 block">Clubhouse Description</label><Textarea value={form.clubhouseDescription} onChange={(e) => updateField("clubhouseDescription", e.target.value)} placeholder="Describe the clubhouse..." rows={2} /></div>

          {/* Amenity Images with Descriptions */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Amenity Images (with descriptions)</label>
            <div className="flex gap-2">
              <Input value={form.amenityImageUrl} onChange={(e) => updateField("amenityImageUrl", e.target.value)} placeholder="Amenity image URL" className="flex-1" />
              <Input value={form.amenityImageDesc} onChange={(e) => updateField("amenityImageDesc", e.target.value)} placeholder="Description (optional)" className="flex-1" />
              <Button type="button" variant="outline" onClick={() => {
                if (form.amenityImageUrl.trim()) {
                  setForm((prev) => ({
                    ...prev,
                    amenityImages: [...prev.amenityImages, { url: prev.amenityImageUrl.trim(), description: prev.amenityImageDesc.trim() }],
                    amenityImageUrl: "",
                    amenityImageDesc: "",
                  }));
                }
              }}>Add</Button>
            </div>
            {form.amenityImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.amenityImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.url} alt={img.description} className="w-16 h-16 object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = "none")} />
                    <p className="text-[10px] text-muted-foreground truncate max-w-[64px]">{img.description || "No desc"}</p>
                    <button onClick={() => setForm((prev) => ({ ...prev, amenityImages: prev.amenityImages.filter((_, j) => j !== i) }))}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ArrayInputField label="Video URLs" field="videos" inputField="videoInput" placeholder="Paste YouTube URL" />
        </CardContent>
      </Card>

      {/* ═══ LOCATION / MAP ═══ */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><MapPin className="h-5 w-5 text-primary" />Location & Map</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Latitude</label><Input value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} placeholder="e.g. 17.3885 (auto-detected from location)" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Longitude</label><Input value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} placeholder="e.g. 78.3365 (auto-detected from location)" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Google Maps Link</label><Input value={form.googleMapsLink} onChange={(e) => updateField("googleMapsLink", e.target.value)} placeholder="https://www.google.com/maps/place/..." /></div>
          {form.latitude && form.longitude && (
            <div className="rounded-xl overflow-hidden border border-border">
              <iframe
                src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d5000!2d${form.longitude}!3d${form.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1`}
                width="100%" height="200" className="border-0" loading="lazy" allowFullScreen title="Location Preview" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ CONTACT & SOCIAL ═══ */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Phone className="h-5 w-5 text-primary" />Contact & Social</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Phone <span className="text-destructive">*</span></label><Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+91 98765 43210" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">WhatsApp</label><Input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} placeholder="+91 98765 43210" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Email</label><Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="contact@builder.com" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Website</label><Input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://www.builder.com" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">LinkedIn</label><Input value={form.socialLinkedin} onChange={(e) => updateField("socialLinkedin", e.target.value)} placeholder="https://linkedin.com/company/..." /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Facebook</label><Input value={form.socialFacebook} onChange={(e) => updateField("socialFacebook", e.target.value)} placeholder="https://facebook.com/..." /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Instagram</label><Input value={form.socialInstagram} onChange={(e) => updateField("socialInstagram", e.target.value)} placeholder="https://instagram.com/..." /></div>
            <div><label className="text-sm font-medium mb-1.5 block">YouTube</label><Input value={form.socialYoutube} onChange={(e) => updateField("socialYoutube", e.target.value)} placeholder="https://youtube.com/..." /></div>
          </div>
        </CardContent>
      </Card>

      {/* Classification Preview */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Auto Classification:</span>
          <Badge className={`text-sm ${currentType === "luxury" ? "bg-amber-500/20 text-amber-700 border-amber-500/50" : currentType === "standard" ? "bg-blue-500/20 text-blue-700 border-blue-500/50" : "bg-emerald-500/20 text-emerald-700 border-emerald-500/50"}`}>
            {currentType.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-2 pb-8">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          {editId ? "Update" : "Submit"} Builder Profile
        </Button>
      </div>
    </div>
  );
};

export default AddBuilderProfileForm;
