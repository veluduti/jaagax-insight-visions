import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Upload } from "lucide-react";

const propertySchema = z.object({
  // Basics
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(2000),
  type: z.enum(["Apartment", "Villa", "Plot", "Commercial", "Penthouse", "Townhouse"]),
  completion_stage: z.enum(["Ready", "Under Construction", "New Launch", "Resale"]),

  // Location
  city: z.string().trim().min(2, "City required").max(80),
  locality: z.string().trim().min(2, "Locality required").max(80),
  address: z.string().trim().min(5, "Full address required").max(300),
  latitude: z.string().optional(),
  longitude: z.string().optional(),

  // Configuration
  price: z.string().min(1, "Price is required"),
  area_sqft: z.string().min(1, "Area is required"),
  bhk: z.string().min(1, "BHK required"),
  bedrooms: z.string().min(1, "Bedrooms required"),
  bathrooms: z.string().min(1, "Bathrooms required"),

  // Building details (optional but recommended)
  building_name: z.string().optional(),
  total_floors: z.string().optional(),
  total_parking: z.string().optional(),
  building_area_sqft: z.string().optional(),
  elevators: z.string().optional(),
  retail_centres: z.string().optional(),

  // Media
  images: z.string().min(1, "At least one image URL required"),
  video_urls: z.string().optional(),
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

export default function PropertyUploadForm({ onSuccess }: PropertyUploadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: "",
      description: "",
      type: "Apartment",
      completion_stage: "Ready",
      city: "",
      locality: "",
      address: "",
      latitude: "",
      longitude: "",
      price: "",
      area_sqft: "",
      bhk: "",
      bedrooms: "",
      bathrooms: "",
      building_name: "",
      total_floors: "",
      total_parking: "",
      building_area_sqft: "",
      elevators: "",
      retail_centres: "",
      images: "",
      video_urls: "",
    },
  });

  const onSubmit = async (values: PropertyFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to submit a property");
        return;
      }

      const images = toList(values.images);
      const video_urls = toList(values.video_urls);

      const payload: any = {
        title: values.title,
        description: values.description,
        type: values.type,
        completion_stage: values.completion_stage,
        city: values.city,
        locality: values.locality,
        address: values.address,
        latitude: toNum(values.latitude),
        longitude: toNum(values.longitude),
        price: toNum(values.price) ?? 0,
        area_sqft: toNum(values.area_sqft),
        bhk: toNum(values.bhk),
        bedrooms: toNum(values.bedrooms),
        bathrooms: toNum(values.bathrooms),
        building_name: values.building_name || null,
        total_floors: toNum(values.total_floors),
        total_parking: toNum(values.total_parking),
        building_area_sqft: toNum(values.building_area_sqft),
        elevators: toNum(values.elevators),
        retail_centres: toNum(values.retail_centres),
        images,
        video_urls,
        submitted_by: user.id,
        verification_status: "pending",
        verified: false,
      };

      const { data: inserted, error } = await supabase
        .from("properties")
        .insert(payload)
        .select("id, title")
        .single();

      if (error) throw error;

      // Notify all admins about the new submission
      try {
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminRoles && adminRoles.length > 0) {
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

      toast.success("Property submitted! Awaiting admin verification.");
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting property:", error);
      toast.error(error?.message || "Failed to submit property");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Add New Property
        </CardTitle>
        <CardDescription>
          Fill in all required details. Your listing will be visible to you immediately and goes live after admin verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Section: Basics */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basics</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Title *</FormLabel>
                    <FormControl><Input placeholder="3 BHK Luxury Apartment in Gachibowli" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Apartment">Apartment</SelectItem>
                        <SelectItem value="Villa">Villa</SelectItem>
                        <SelectItem value="Plot">Plot</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Penthouse">Penthouse</SelectItem>
                        <SelectItem value="Townhouse">Townhouse</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="completion_stage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Stage *</FormLabel>
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
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the property features, amenities, location highlights..." className="min-h-[110px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </section>

            {/* Section: Location */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Location</h3>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address *</FormLabel>
                  <FormControl><Input placeholder="Tower A, Prestige Lakeside Habitat, Whitefield" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl><Input placeholder="Hyderabad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="locality" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locality *</FormLabel>
                    <FormControl><Input placeholder="Gachibowli" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude (optional)</FormLabel>
                    <FormControl><Input type="number" step="any" placeholder="17.4435" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude (optional)</FormLabel>
                    <FormControl><Input type="number" step="any" placeholder="78.3772" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Section: Configuration */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configuration & Pricing</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹) *</FormLabel>
                    <FormControl><Input type="number" placeholder="5000000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="area_sqft" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carpet Area (sq.ft) *</FormLabel>
                    <FormControl><Input type="number" placeholder="1200" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bhk" render={({ field }) => (
                  <FormItem>
                    <FormLabel>BHK *</FormLabel>
                    <FormControl><Input type="number" placeholder="3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bedrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms *</FormLabel>
                    <FormControl><Input type="number" placeholder="3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bathrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms *</FormLabel>
                    <FormControl><Input type="number" placeholder="2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Section: Building Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Building Details</h3>
              <div className="grid md:grid-cols-3 gap-4">
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
                <FormField control={form.control} name="building_area_sqft" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Building Area (sq.ft)</FormLabel>
                    <FormControl><Input type="number" placeholder="500000" {...field} /></FormControl>
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
                <FormField control={form.control} name="retail_centres" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retail Centres</FormLabel>
                    <FormControl><Input type="number" placeholder="2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Section: Media */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Media</h3>
              <FormField control={form.control} name="images" render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URLs *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="One URL per line, or comma-separated&#10;https://example.com/image1.jpg&#10;https://example.com/image2.jpg" className="min-h-[90px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="video_urls" render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URLs (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="YouTube / MP4 / Vimeo URLs, one per line" className="min-h-[70px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </section>

            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
              {isSubmitting ? (
                <><Upload className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Submit Property for Verification</>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
