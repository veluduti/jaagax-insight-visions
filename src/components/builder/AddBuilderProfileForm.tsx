import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Building2, User, Briefcase, Image, Phone, Layers,
  Check, Wifi, Car, Dumbbell, Trees, Shield, Waves, Wind, Droplets,
  Zap, Baby, Dog, Flower2, Gamepad2, BookOpen, Coffee, Upload, X, Loader2
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

const classifyBuilder = (data: {
  priceRangeMax: number;
  amenities: string[];
  videos: string[];
}): "luxury" | "standard" | "budget" => {
  if (data.priceRangeMax > 10000000 || data.amenities.length > 8 || data.videos.length > 0) return "luxury";
  if (data.priceRangeMax > 4000000) return "standard";
  return "budget";
};

const AddBuilderProfileForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    builderName: "",
    tagline: "",
    description: "",
    yearsOfExperience: "",
    certifications: "",
    reraNumber: "",
    numberOfProjects: "",
    priceRangeMin: "",
    priceRangeMax: "",
    unitTypes: [] as string[],
    locations: [] as string[],
    locationInput: "",
    amenities: [] as string[],
    images: [] as string[],
    imageInput: "",
    videos: [] as string[],
    videoInput: "",
    phone: "",
    whatsapp: "",
    email: "",
  });

  const updateField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleArrayItem = (field: "unitTypes" | "amenities", item: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(item) ? prev[field].filter((i) => i !== item) : [...prev[field], item],
    }));
  };

  const addToArray = (field: "locations" | "images" | "videos", inputField: "locationInput" | "imageInput" | "videoInput") => {
    if (form[inputField].trim()) {
      setForm((prev) => ({ ...prev, [field]: [...prev[field], prev[inputField].trim()], [inputField]: "" }));
    }
  };

  const removeFromArray = (field: "locations" | "images" | "videos", index: number) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
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
    const type = classifyBuilder({
      priceRangeMax: Number(form.priceRangeMax) || 0,
      amenities: form.amenities,
      videos: form.videos,
    });

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("builder_profiles").insert({
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
    } as any);

    setIsSubmitting(false);

    if (error) {
      toast({ title: "Error", description: "Failed to create builder profile. Please try again.", variant: "destructive" });
      return;
    }

    toast({ title: "Success!", description: `Builder profile created as "${type}" category.` });
    navigate("/");
  };

  const currentType = classifyBuilder({
    priceRangeMax: Number(form.priceRangeMax) || 0,
    amenities: form.amenities,
    videos: form.videos,
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Add Builder Profile</h1>
          <p className="text-sm text-muted-foreground">Fill in the details below to create a new builder profile</p>
        </div>
      </div>

      {/* SECTION 1: Basic Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Builder Name <span className="text-destructive">*</span></label>
            <Input value={form.builderName} onChange={(e) => updateField("builderName", e.target.value)} placeholder="e.g. Prestige Group" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tagline</label>
            <Input value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="e.g. Building Dreams Since 1986" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Tell us about the builder..." rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Business Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            Business Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Years of Experience</label>
              <Input type="number" value={form.yearsOfExperience} onChange={(e) => updateField("yearsOfExperience", e.target.value)} placeholder="e.g. 15" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">RERA Number</label>
              <Input value={form.reraNumber} onChange={(e) => updateField("reraNumber", e.target.value)} placeholder="e.g. P02400003243" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Certifications</label>
            <Input value={form.certifications} onChange={(e) => updateField("certifications", e.target.value)} placeholder="e.g. ISO 9001, IGBC Gold" />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Project Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" />
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Number of Projects</label>
              <Input type="number" value={form.numberOfProjects} onChange={(e) => updateField("numberOfProjects", e.target.value)} placeholder="e.g. 50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Min Price (₹)</label>
              <Input type="number" value={form.priceRangeMin} onChange={(e) => updateField("priceRangeMin", e.target.value)} placeholder="e.g. 3000000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Max Price (₹)</label>
              <Input type="number" value={form.priceRangeMax} onChange={(e) => updateField("priceRangeMax", e.target.value)} placeholder="e.g. 15000000" />
            </div>
          </div>

          {/* Unit Types */}
          <div>
            <label className="text-sm font-medium mb-2 block">Unit Types</label>
            <div className="flex flex-wrap gap-2">
              {UNIT_TYPES.map((u) => (
                <Badge key={u} variant={form.unitTypes.includes(u) ? "default" : "outline"} className="cursor-pointer transition-all hover:scale-105" onClick={() => toggleArrayItem("unitTypes", u)}>
                  {u}
                </Badge>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Locations</label>
            <div className="flex gap-2">
              <Input value={form.locationInput} onChange={(e) => updateField("locationInput", e.target.value)} placeholder="e.g. Gachibowli, Hyderabad" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("locations", "locationInput"))} />
              <Button type="button" variant="outline" onClick={() => addToArray("locations", "locationInput")}>Add</Button>
            </div>
            {form.locations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.locations.map((loc, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {loc}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray("locations", i)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: Amenities */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Amenities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {AMENITY_OPTIONS.map((a) => {
              const Icon = a.icon;
              const selected = form.amenities.includes(a.name);
              return (
                <button key={a.name} type="button" onClick={() => toggleArrayItem("amenities", a.name)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-xs ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{a.name}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 5: Media Upload */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="h-5 w-5 text-primary" />
            Media Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Images */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Image URLs</label>
            <div className="flex gap-2">
              <Input value={form.imageInput} onChange={(e) => updateField("imageInput", e.target.value)} placeholder="Paste image URL" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("images", "imageInput"))} />
              <Button type="button" variant="outline" onClick={() => addToArray("images", "imageInput")}>
                <Upload className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {form.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = "none")} />
                    <button onClick={() => removeFromArray("images", i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Video URLs (optional)</label>
            <div className="flex gap-2">
              <Input value={form.videoInput} onChange={(e) => updateField("videoInput", e.target.value)} placeholder="Paste YouTube URL" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("videos", "videoInput"))} />
              <Button type="button" variant="outline" onClick={() => addToArray("videos", "videoInput")}>
                <Upload className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {form.videos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.videos.map((v, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 max-w-[250px] truncate">
                    {v}
                    <X className="h-3 w-3 cursor-pointer flex-shrink-0" onClick={() => removeFromArray("videos", i)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 6: Contact Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-primary" />
            Contact Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone <span className="text-destructive">*</span></label>
              <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">WhatsApp</label>
              <Input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="contact@builder.com" />
          </div>
        </CardContent>
      </Card>

      {/* Auto Classification Preview */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Auto Classification:</span>
          <Badge className={`text-sm ${currentType === "luxury" ? "bg-amber-500/20 text-amber-700 border-amber-500/50" : currentType === "standard" ? "bg-blue-500/20 text-blue-700 border-blue-500/50" : "bg-emerald-500/20 text-emerald-700 border-emerald-500/50"}`}>
            {currentType.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between pt-2 pb-8">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Submit Builder Profile
        </Button>
      </div>
    </div>
  );
};

export default AddBuilderProfileForm;
