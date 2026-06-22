import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Pencil, PlusCircle, FileCheck2, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";

type FieldStatus = "verified" | "corrected" | "added" | "pending";

interface FieldEntry {
  seller_value: any;
  agent_value: any;
  status: FieldStatus;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  property: any;
  agentName?: string;
  agentId?: string;
  agentUserId?: string;
  onSubmitted?: () => void;
  /** 'agent' (default) submits for admin approval; 'admin' saves edits in place and shows custom footer actions. */
  mode?: "agent" | "admin";
  /** Extra footer actions shown in admin mode (e.g. Reject / Assign Agent / Approve). */
  adminFooter?: React.ReactNode;
}

// ---------- Section / field definitions ----------
type FieldType = "text" | "number" | "textarea" | "switch" | "select" | "tags";
interface FieldDef {
  key: string;          // dot-path inside agent_data, e.g. "basic_information.title"
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  // map to seller (DB) source for pre-fill + comparison. dot path on seller object.
  sellerPath?: string;
}
interface SectionDef {
  id: string;
  title: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    id: "basic_information",
    title: "Basic Info",
    fields: [
      { key: "basic_information.title", label: "Title", type: "text", sellerPath: "title" },
      { key: "basic_information.property_type", label: "Property Type", type: "select",
        options: ["Apartment","Villa","Independent House","Plot","Commercial","Penthouse","Studio"], sellerPath: "type" },
      { key: "basic_information.listing_purpose", label: "Listing Purpose", type: "select",
        options: ["sale","rent","lease"], sellerPath: "listing_type" },
      { key: "basic_information.listed_by", label: "Listed By", type: "select",
        options: ["seller","agent","builder"], sellerPath: "listed_by" },
      { key: "basic_information.property_id", label: "Property ID", type: "text", sellerPath: "id" },
      { key: "basic_information.rera_number", label: "RERA Number", type: "text", sellerPath: "rera_id" },
    ],
  },
  {
    id: "location_details",
    title: "Location",
    fields: [
      { key: "location_details.country", label: "Country", type: "text", placeholder: "India" },
      { key: "location_details.state", label: "State", type: "text" },
      { key: "location_details.city", label: "City", type: "text", sellerPath: "city" },
      { key: "location_details.locality", label: "Locality", type: "text", sellerPath: "locality" },
      { key: "location_details.landmark", label: "Landmark", type: "text" },
      { key: "location_details.full_address", label: "Full Address", type: "textarea", sellerPath: "address" },
      { key: "location_details.pin_code", label: "PIN Code", type: "text", sellerPath: "pincode" },
    ],
  },
  {
    id: "price_details",
    title: "Price",
    fields: [
      { key: "price_details.expected_price", label: "Expected Price (₹)", type: "number", sellerPath: "price" },
      { key: "price_details.negotiable", label: "Negotiable", type: "switch", sellerPath: "price_negotiable" },
      { key: "price_details.price_per_sqft", label: "Price / sqft (₹)", type: "number" },
      { key: "price_details.maintenance_charges", label: "Maintenance (₹/mo)", type: "number", sellerPath: "maintenance_charges" },
      { key: "price_details.booking_amount", label: "Booking Amount (₹)", type: "number", sellerPath: "booking_amount" },
    ],
  },
  {
    id: "size",
    title: "Size",
    fields: [
      { key: "size.area_sqft", label: "Area (sqft)", type: "number", sellerPath: "area_sqft" },
      { key: "size.building_area_sqft", label: "Building Area (sqft)", type: "number", sellerPath: "building_area_sqft" },
    ],
  },
  {
    id: "configuration",
    title: "Configuration",
    fields: [
      { key: "configuration.bhk", label: "BHK", type: "number", sellerPath: "bhk" },
      { key: "configuration.bedrooms", label: "Bedrooms", type: "number", sellerPath: "bedrooms" },
      { key: "configuration.bathrooms", label: "Bathrooms", type: "number", sellerPath: "bathrooms" },
      { key: "configuration.balconies", label: "Balconies", type: "number", sellerPath: "balconies" },
      { key: "configuration.floor_number", label: "Floor Number", type: "number", sellerPath: "floor_number" },
      { key: "configuration.total_floors", label: "Total Floors", type: "number", sellerPath: "total_floors" },
    ],
  },
  {
    id: "furnishing",
    title: "Furnishing",
    fields: [
      { key: "furnishing.type", label: "Furnishing Type", type: "select",
        options: ["Unfurnished","Semi-Furnished","Fully Furnished"], sellerPath: "furnishing" },
    ],
  },
  {
    id: "property_status",
    title: "Property Status",
    fields: [
      { key: "property_status.completion_stage", label: "Completion Stage", type: "select",
        options: ["Ready","Under Construction","New Launch","Resale"], sellerPath: "completion_stage" },
      { key: "property_status.property_age", label: "Property Age", type: "select",
        options: ["New","<1 year","1-3 years","3-5 years","5-10 years","10+ years"], sellerPath: "property_age" },
    ],
  },
  {
    id: "amenities",
    title: "Amenities",
    fields: [
      { key: "amenities.lift", label: "Lift", type: "switch" },
      { key: "amenities.parking", label: "Parking", type: "switch" },
      { key: "amenities.security", label: "Security", type: "switch" },
      { key: "amenities.power_backup", label: "Power Backup", type: "switch" },
      { key: "amenities.gym", label: "Gym", type: "switch" },
      { key: "amenities.swimming_pool", label: "Swimming Pool", type: "switch" },
      { key: "amenities.list", label: "Other Amenities (comma separated)", type: "tags", sellerPath: "amenities" },
    ],
  },
  {
    id: "parking",
    title: "Parking",
    fields: [
      { key: "parking.total_parking", label: "Total Parking Slots", type: "number", sellerPath: "total_parking" },
      { key: "parking.covered", label: "Covered Parking", type: "switch" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    fields: [
      { key: "legal.rera_number", label: "RERA Number", type: "text", sellerPath: "rera_id" },
      { key: "legal.rera_document_url", label: "RERA Document URL", type: "text", sellerPath: "rera_document_url" },
      { key: "legal.ownership_type", label: "Ownership Type", type: "select",
        options: ["Freehold","Leasehold","Co-operative Society","Power of Attorney"] },
    ],
  },
  {
    id: "facing",
    title: "Facing",
    fields: [
      { key: "facing.direction", label: "Facing Direction", type: "select",
        options: ["North","South","East","West","North-East","North-West","South-East","South-West"] },
    ],
  },
  {
    id: "media",
    title: "Media",
    fields: [
      { key: "media.cover_photo", label: "Cover Photo URL", type: "text" },
      { key: "media.interior_photos", label: "Interior Photo URLs (one per line)", type: "textarea", sellerPath: "images" },
      { key: "media.video_url", label: "Video URL", type: "text" },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    fields: [
      { key: "contact.owner_name", label: "Owner Name", type: "text" },
      { key: "contact.owner_phone", label: "Owner Phone", type: "text" },
      { key: "contact.owner_email", label: "Owner Email", type: "text" },
    ],
  },
  {
    id: "visit_options",
    title: "Visit Options",
    fields: [
      { key: "visit_options.in_person", label: "In-Person Visit", type: "switch" },
      { key: "visit_options.virtual_tour", label: "Virtual Tour Available", type: "switch" },
      { key: "visit_options.preferred_time", label: "Preferred Visit Time", type: "text", placeholder: "e.g. Weekends 10AM–6PM" },
    ],
  },
];

// ---------- helpers ----------
const get = (obj: any, path: string) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
const set = (obj: any, path: string, value: any) => {
  const keys = path.split(".");
  const next = { ...(obj || {}) };
  let cur: any = next;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = value;
    else { cur[k] = { ...(cur[k] || {}) }; cur = cur[k]; }
  });
  return next;
};

const normalize = (v: any): string => {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(",").toLowerCase().trim();
  return String(v).toLowerCase().trim();
};

const safeObject = (value: any) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
};

const previewValue = (value: any) => {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  return String(value);
};

export default function AgentEditPropertyDialog({
  open, onOpenChange, property, agentName, agentId, agentUserId, onSubmitted, mode = "agent", adminFooter,
}: Props) {
  const isAdmin = mode === "admin";
  const safeProperty = safeObject(property);
  const [agentData, setAgentData] = useState<any>({});
  const [verification, setVerification] = useState<Record<string, FieldEntry>>({});
  const [agentNotes, setAgentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState(SECTIONS[0].id);

  // Build seller value lookup once per property
  const sellerValueFor = useMemo(() => {
    return (path?: string) => {
      if (!path || !safeProperty) return undefined;
      // Special: images is array → join with newlines for textarea
      const v = get(safeProperty, path);
      if (path === "images" && Array.isArray(v)) return v.join("\n");
      if (path === "amenities" && Array.isArray(v)) return v.join(", ");
      return v;
    };
  }, [safeProperty]);

  // Pre-fill on open
  useEffect(() => {
    if (!open || !property) return;
    // Use existing agent_data if present, otherwise pre-fill from seller
    const existing = safeObject(safeProperty.agent_data);
    let next: any = { ...existing };

    SECTIONS.forEach((sec) => {
      sec.fields.forEach((f) => {
        const current = get(next, f.key);
        if (current === undefined || current === null || current === "") {
          const sellerVal = sellerValueFor(f.sellerPath);
          if (sellerVal !== undefined && sellerVal !== null) {
            next = set(next, f.key, sellerVal);
          }
        }
      });
    });

    setAgentData(next);
    setVerification(safeObject(safeProperty.field_verification));
    setAgentNotes(typeof safeProperty.agent_notes === "string" ? safeProperty.agent_notes : "");
  }, [open, property, safeProperty, sellerValueFor]);

  if (!property) return null;

  const updateField = (key: string, value: any) => {
    setAgentData((prev: any) => set(prev, key, value));
  };

  const markStatus = (key: string, sellerPath: string | undefined, status: FieldStatus) => {
    const seller_value = sellerValueFor(sellerPath);
    const agent_value = get(agentData, key);
    setVerification((prev) => ({
      ...prev,
      [key]: { seller_value, agent_value, status },
    }));
  };

  const computeAutoStatus = (key: string, sellerPath: string | undefined): FieldStatus => {
    const manual = verification[key]?.status;
    if (manual && manual !== "pending") return manual;
    const sv = sellerValueFor(sellerPath);
    const av = get(agentData, key);
    if (sv == null || sv === "") {
      return av != null && av !== "" ? "added" : "pending";
    }
    if (av == null || av === "") return "pending";
    return normalize(sv) === normalize(av) ? "verified" : "corrected";
  };

  const renderField = (f: FieldDef) => {
    const rawValue = get(agentData, f.key);
    // Coerce to a safe scalar/string for inputs to prevent crashes on arrays/objects
    let value: any = rawValue ?? "";
    if (f.type === "textarea" && Array.isArray(value)) value = value.join("\n");
    else if (f.type === "tags" && Array.isArray(value)) value = value.join(", ");
    else if (typeof value === "object" && value !== null) {
      try { value = JSON.stringify(value); } catch { value = ""; }
    }
    const sellerVal = sellerValueFor(f.sellerPath);
    const hasSellerData = sellerVal !== undefined && sellerVal !== null && sellerVal !== "";
    const status = computeAutoStatus(f.key, f.sellerPath);

    const statusBadge = (() => {
      switch (status) {
        case "verified": return <Badge className="bg-emerald-500 text-white text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Verified</Badge>;
        case "corrected": return <Badge className="bg-amber-500 text-white text-[10px]"><Pencil className="h-2.5 w-2.5 mr-0.5" />Corrected</Badge>;
        case "added": return <Badge className="bg-blue-500 text-white text-[10px]"><PlusCircle className="h-2.5 w-2.5 mr-0.5" />Added</Badge>;
        default: return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
      }
    })();

    return (
      <div
        key={f.key}
        className={`rounded-lg border p-2.5 ${
          hasSellerData ? "border-amber-500/40 bg-amber-500/5" : "border-border"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            {f.label}
            {hasSellerData && (
              <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400">
                seller
              </span>
            )}
          </Label>
          {statusBadge}
        </div>

        {hasSellerData && (
          <div className="text-[10px] text-muted-foreground mb-1.5">
            Seller said: <span className="font-mono">{previewValue(sellerVal).slice(0, 80)}{previewValue(sellerVal).length > 80 ? "…" : ""}</span>
          </div>
        )}

        {f.type === "textarea" && (
          <Textarea
            rows={3}
            value={value}
            onChange={(e) => updateField(f.key, e.target.value)}
            placeholder={f.placeholder}
          />
        )}
        {f.type === "text" && (
          <Input
            value={value}
            onChange={(e) => updateField(f.key, e.target.value)}
            placeholder={f.placeholder}
          />
        )}
        {f.type === "tags" && (
          <Input
            value={Array.isArray(value) ? value.join(", ") : value}
            onChange={(e) => updateField(f.key, e.target.value)}
            placeholder={f.placeholder}
          />
        )}
        {f.type === "number" && (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateField(f.key, e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={f.placeholder}
          />
        )}
        {f.type === "select" && (
          <select
            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
            value={value}
            onChange={(e) => updateField(f.key, e.target.value)}
          >
            <option value="">—</option>
            {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {f.type === "switch" && (
          <div className="flex items-center gap-2">
            <Switch checked={!!value} onCheckedChange={(c) => updateField(f.key, c)} />
            <span className="text-xs text-muted-foreground">{value ? "Yes" : "No"}</span>
          </div>
        )}

        <div className="flex gap-1 mt-2 flex-wrap">
          <Button size="sm" variant={status === "verified" ? "default" : "outline"}
            className="h-6 text-[10px] px-2"
            onClick={() => markStatus(f.key, f.sellerPath, "verified")}>
            <CheckCircle2 className="h-3 w-3 mr-0.5" />Verify
          </Button>
          <Button size="sm" variant={status === "corrected" ? "default" : "outline"}
            className="h-6 text-[10px] px-2"
            onClick={() => markStatus(f.key, f.sellerPath, "corrected")}>
            <Pencil className="h-3 w-3 mr-0.5" />Corrected
          </Button>
          {!hasSellerData && (
            <Button size="sm" variant={status === "added" ? "default" : "outline"}
              className="h-6 text-[10px] px-2"
              onClick={() => markStatus(f.key, f.sellerPath, "added")}>
              <PlusCircle className="h-3 w-3 mr-0.5" />Added
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Snapshot status counters
  const counters = useMemo(() => {
    let v = 0, c = 0, a = 0, p = 0;
    SECTIONS.forEach((sec) => sec.fields.forEach((f) => {
      const s = computeAutoStatus(f.key, f.sellerPath);
      if (s === "verified") v++;
      else if (s === "corrected") c++;
      else if (s === "added") a++;
      else p++;
    }));
    return { v, c, a, p };
  }, [agentData, verification]);

  const handleSubmit = async () => {
    // Agent notes are optional — agent can submit with or without modifications.
    setSubmitting(true);

    // Build full field_verification using auto-computed statuses (preserving manual overrides)
    const fullVerification: Record<string, FieldEntry> = {};
    SECTIONS.forEach((sec) => sec.fields.forEach((f) => {
      const status = computeAutoStatus(f.key, f.sellerPath);
      fullVerification[f.key] = {
        seller_value: sellerValueFor(f.sellerPath) ?? null,
        agent_value: get(agentData, f.key) ?? null,
        status,
      };
    }));

    // Mirror critical fields back to top-level columns
    const mirrorTitle = get(agentData, "basic_information.title") || property.title;
    const mirrorPrice = Number(get(agentData, "price_details.expected_price")) || property.price;
    const mirrorArea = Number(get(agentData, "size.area_sqft")) || property.area_sqft;
    const mirrorBhk = Number(get(agentData, "configuration.bhk")) || property.bhk;
    const mirrorBedrooms = Number(get(agentData, "configuration.bedrooms")) || property.bedrooms;
    const mirrorBathrooms = Number(get(agentData, "configuration.bathrooms")) || property.bathrooms;
    const mirrorCity = get(agentData, "location_details.city") || property.city;
    const mirrorLocality = get(agentData, "location_details.locality") || property.locality;
    const mirrorAddress = get(agentData, "location_details.full_address") || property.address;
    const interiorRaw = get(agentData, "media.interior_photos");
    const interiorList = typeof interiorRaw === "string"
      ? interiorRaw.split(/\n+/).map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(interiorRaw) ? interiorRaw : [];
    const cover = get(agentData, "media.cover_photo");
    const mirrorImages = [cover, ...interiorList].filter(Boolean);

    const original_snapshot = property.original_snapshot || {
      title: property.title,
      price: property.price,
      area_sqft: property.area_sqft,
      description: property.description,
      images: Array.isArray(property.images) ? property.images : [],
      snapshot_at: new Date().toISOString(),
    };

    const baseUpdate: any = {
      title: mirrorTitle,
      price: mirrorPrice,
      area_sqft: mirrorArea,
      bhk: mirrorBhk,
      bedrooms: mirrorBedrooms,
      bathrooms: mirrorBathrooms,
      city: mirrorCity,
      locality: mirrorLocality,
      address: mirrorAddress,
      images: mirrorImages.length ? mirrorImages : property.images,
      agent_data: agentData,
      field_verification: fullVerification,
      original_snapshot,
    };

    if (!isAdmin) {
      baseUpdate.agent_notes = agentNotes.trim();
      baseUpdate.verification_status = "agent_verified_pending";
      baseUpdate.verified = false;
      baseUpdate.agent_submitted_at = new Date().toISOString();
    } else if (agentNotes.trim()) {
      baseUpdate.agent_notes = agentNotes.trim();
    }

    const { data: updatedProperty, error } = await supabase
      .from("properties")
      .update(baseUpdate as any)
      .eq("id", property.id)
      .select("id, verification_status, agent_submitted_at")
      .maybeSingle();

    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    if (!updatedProperty) {
      setSubmitting(false);
      toast.error("Could not submit this property. Please refresh and try again.");
      return;
    }

    if (!isAdmin && agentId) {
      // Mark task completed
      await supabase.from("agent_tasks" as any)
        .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("agent_id", agentId).eq("property_id", property.id);

      // Notify admins
      const { data: admins } = await supabase.from("user_roles" as any).select("user_id").eq("role", "admin");
      if (admins?.length) {
        await supabase.from("notifications").insert(admins.map((a: any) => ({
          user_id: a.user_id,
          type: "agent_verified",
          title: "Agent submitted property for final approval",
          message: `${agentName || "Agent"} verified "${mirrorTitle}" with ${counters.v} verified, ${counters.c} corrected, ${counters.a} added fields.`,
          link: `/admin`,
        })));
      }
      if (property.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: property.submitted_by,
          type: "agent_verified",
          title: "Property submitted for final approval",
          message: `${agentName || "Agent"} completed verification of "${mirrorTitle}" and submitted it for admin approval.`,
          link: `/property/${property.id}`,
        });
      }
    }

    setSubmitting(false);
    toast.success(isAdmin ? "Changes saved" : "Submitted for admin approval", {
      description: `${counters.v} verified • ${counters.c} corrected • ${counters.a} added`,
    });
    if (!isAdmin) onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-blue-500" />
            {isAdmin ? "Review & Edit Property" : "Edit & Verify Property"}
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "All seller-submitted details. Edit any field, then approve, reject, or assign an agent."
              : "Pre-filled from seller. Highlighted fields = seller-provided. Verify, correct, or add for each."}
          </DialogDescription>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge className="bg-emerald-500 text-white text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{counters.v} Verified</Badge>
            <Badge className="bg-amber-500 text-white text-[10px]"><Pencil className="h-2.5 w-2.5 mr-0.5" />{counters.c} Corrected</Badge>
            <Badge className="bg-blue-500 text-white text-[10px]"><PlusCircle className="h-2.5 w-2.5 mr-0.5" />{counters.a} Added</Badge>
            <Badge variant="outline" className="text-[10px]">{counters.p} Pending</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-3">
              {SECTIONS.map((s) => (
                <TabsTrigger key={s.id} value={s.id}
                  className="text-[11px] h-7 px-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                  {s.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {SECTIONS.map((sec) => (
              <TabsContent key={sec.id} value={sec.id} className="mt-0">
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {sec.fields.map((f) => {
                    try { return renderField(f); }
                    catch (e) {
                      console.error("Field render failed", f.key, e);
                      return (
                        <div key={f.key} className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[11px] text-destructive">
                          {f.label}: unable to render
                        </div>
                      );
                    }
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-4 rounded-lg border border-blue-500/40 bg-blue-500/5 p-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              {isAdmin ? "Admin / Agent Notes" : <>Agent Notes <span className="text-red-500">*</span></>}
            </Label>
            <Textarea
              rows={3}
              value={agentNotes}
              onChange={(e) => setAgentNotes(e.target.value)}
              placeholder={isAdmin
                ? "Internal notes for this listing (optional)…"
                : "On-site observations, condition, accuracy of seller's claims, etc."}
            />
          </div>

          {!isAdmin && (
            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                On submit: full <code>agent_data</code> + per-field <code>field_verification</code> log saved.
                Status becomes <strong>AGENT_VERIFIED_PENDING_ADMIN_APPROVAL</strong>.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/30 flex-row flex-wrap gap-2 sm:justify-between">
          {isAdmin ? (
            <>
              <Button variant="outline" disabled={submitting} onClick={handleSubmit}>
                {submitting ? "Saving…" : "Save Edits"}
              </Button>
              <div className="flex flex-wrap gap-2">{adminFooter}</div>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                <FileCheck2 className="h-4 w-4 mr-1" />
                {submitting ? "Submitting…" : "Submit for Admin Approval"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
