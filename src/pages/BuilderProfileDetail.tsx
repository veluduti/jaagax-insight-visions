import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, MessageCircle, Mail, MapPin, Building2, Shield, Award, Calendar, ArrowLeft, ChevronRight, Star, Flame, Sparkles } from "lucide-react";

interface BuilderProfile {
  id: string;
  builder_name: string;
  tagline: string | null;
  description: string | null;
  type: string;
  price_range_min: number | null;
  price_range_max: number | null;
  number_of_projects: number | null;
  unit_types: string[];
  locations: string[];
  amenities: string[];
  images: string[];
  videos: string[];
  phone: string;
  whatsapp: string | null;
  email: string | null;
  years_of_experience: number | null;
  certifications: string | null;
  rera_number: string | null;
}

const formatPrice = (val: number | null) => {
  if (!val) return "N/A";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const BuilderProfileDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [builder, setBuilder] = useState<BuilderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("builder_profiles" as any).select("*").eq("id", id).single();
      setBuilder(data as any);
      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!builder) return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-xl text-center">
        <h1 className="text-2xl font-bold">Builder Not Found</h1>
        <Button className="mt-md" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    </div>
  );

  const isLuxury = builder.type === "luxury";
  const isBudget = builder.type === "budget";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <div className={`relative ${isLuxury ? "h-[60vh] min-h-[400px]" : "h-[40vh] min-h-[280px]"} overflow-hidden`}>
        {builder.images?.[0] ? (
          <img src={builder.images[0]} alt={builder.builder_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60" />
        )}
        <div className={`absolute inset-0 ${isLuxury ? "bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent" : "bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent"}`} />

        {/* Video bg for luxury */}
        {isLuxury && builder.videos?.[0] && (
          <div className="absolute top-4 right-4 z-10">
            <Button size="sm" variant="outline" className="bg-foreground/20 border-primary-foreground/30 text-primary-foreground backdrop-blur-sm"
              onClick={() => window.open(builder.videos[0], "_blank")}>
              ▶ Watch Video
            </Button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-lg z-10">
          <Button variant="ghost" size="sm" className="text-primary-foreground/80 mb-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Badge className={`mb-2 ${isLuxury ? "bg-amber-500/90 text-amber-50" : isBudget ? "bg-emerald-500/90 text-emerald-50" : "bg-blue-500/90 text-blue-50"} uppercase tracking-wider text-xs`}>
                {builder.type}
              </Badge>
              <h1 className={`font-bold text-primary-foreground ${isLuxury ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}`}>
                {builder.builder_name}
              </h1>
              {builder.tagline && <p className="text-primary-foreground/80 text-lg mt-1">{builder.tagline}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-md py-lg">
        {/* Stats Row */}
        <div className={`grid ${isLuxury ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"} gap-md -mt-8 relative z-20 mb-lg`}>
          {[
            { label: "Projects", value: builder.number_of_projects || 0, icon: Building2 },
            { label: "Experience", value: `${builder.years_of_experience || 0}+ yrs`, icon: Calendar },
            { label: "Starting From", value: formatPrice(builder.price_range_min), icon: Star },
            ...(isLuxury ? [{ label: "Up To", value: formatPrice(builder.price_range_max), icon: Sparkles }] : []),
          ].map((stat) => (
            <Card key={stat.label} className="shadow-lg border-0">
              <CardContent className="p-md text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className={`grid ${isBudget ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"} gap-lg`}>
          {/* Main Content */}
          <div className={isBudget ? "" : "lg:col-span-2"}>
            {/* Description */}
            {builder.description && (
              <Card className="mb-md">
                <CardContent className="p-md">
                  <h2 className="text-xl font-semibold mb-2">About</h2>
                  <p className="text-muted-foreground leading-relaxed">{builder.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Unit Types */}
            {builder.unit_types?.length > 0 && (
              <Card className="mb-md">
                <CardContent className="p-md">
                  <h2 className="text-xl font-semibold mb-3">Unit Types</h2>
                  <div className="flex flex-wrap gap-2">
                    {builder.unit_types.map((u) => (
                      <Badge key={u} variant="secondary" className="text-sm px-3 py-1">{u}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Amenities */}
            {builder.amenities?.length > 0 && (
              <Card className="mb-md">
                <CardContent className="p-md">
                  <h2 className="text-xl font-semibold mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {builder.amenities.map((a) => (
                      <div key={a} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{a}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Locations */}
            {builder.locations?.length > 0 && (
              <Card className="mb-md">
                <CardContent className="p-md">
                  <h2 className="text-xl font-semibold mb-3">Locations</h2>
                  <div className="flex flex-wrap gap-2">
                    {builder.locations.map((loc) => (
                      <Badge key={loc} variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" /> {loc}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {builder.images?.length > 1 && (
              <Card className="mb-md">
                <CardContent className="p-md">
                  <h2 className="text-xl font-semibold mb-3">Gallery</h2>
                  <div className={`grid ${isLuxury ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"} gap-2`}>
                    {builder.images.slice(1).map((img, i) => (
                      <img key={i} src={img} alt="" className="w-full h-40 object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Smart Features */}
            {isLuxury && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-md">
                <Flame className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">🔥 Units Filling Fast — Premium listings by this builder</span>
              </div>
            )}
            {isBudget && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-md">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">💰 Best value options — Affordable units available</span>
              </div>
            )}
          </div>

          {/* Sidebar / Contact */}
          <div className={isBudget ? "" : ""}>
            <Card className="sticky top-20 shadow-lg border-0">
              <CardContent className="p-md space-y-3">
                <h3 className="font-semibold text-lg">Contact Builder</h3>

                {builder.rera_number && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Award className="h-4 w-4 text-primary" />
                    RERA: {builder.rera_number}
                  </div>
                )}
                {builder.certifications && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    {builder.certifications}
                  </div>
                )}

                <Button className="w-full" onClick={() => window.open(`tel:${builder.phone}`)}>
                  <Phone className="h-4 w-4 mr-2" /> Call Now
                </Button>
                {builder.whatsapp && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
                    <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                  </Button>
                )}
                {builder.email && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(`mailto:${builder.email}`)}>
                    <Mail className="h-4 w-4 mr-2" /> Email
                  </Button>
                )}

                {/* Price range */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Price Range</p>
                  <p className="font-semibold text-lg">{formatPrice(builder.price_range_min)} – {formatPrice(builder.price_range_max)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Budget: Sticky bottom bar */}
      {isBudget && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg p-3 flex gap-2 z-50 lg:hidden">
          <Button className="flex-1" size="sm" onClick={() => window.open(`tel:${builder.phone}`)}>
            <Phone className="h-4 w-4 mr-1" /> Call
          </Button>
          {builder.whatsapp && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`https://wa.me/${builder.whatsapp?.replace(/[^0-9]/g, "")}`)}>
              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
            </Button>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BuilderProfileDetail;
