import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MapPin, Bed, Maximize, Clock, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UnverifiedProperty {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  bedrooms: number | null;
  area_sqft: number | null;
  images: any;
  trust_score: number | null;
  bhk: number | null;
  type: string | null;
  completion_stage: string | null;
  created_at: string | null;
}

const SneakPeekListings = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<UnverifiedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnverifiedProperties();
  }, []);

  const fetchUnverifiedProperties = async () => {
    try {
      const { data, error } = await (supabase
        .from("properties" as any)
        .select("*") as any)
        .or("verified.eq.false,verified.is.null")
        .not("title", "is", null)
        .not("city", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      setProperties((data as any) || []);
    } catch (error) {
      console.error("Error fetching unverified properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationProgress = (p: UnverifiedProperty) => {
    let score = 0;
    if (p.title) score += 15;
    if (p.city) score += 10;
    if (p.locality) score += 10;
    if (p.price && p.price > 0) score += 15;
    if (p.bhk || p.bedrooms) score += 10;
    if (p.area_sqft) score += 10;
    if (Array.isArray(p.images) && p.images.length > 0) score += 15;
    if (p.type) score += 5;
    if (p.completion_stage) score += 5;
    if (p.trust_score && p.trust_score > 0) score += 5;
    return Math.min(score, 100);
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Recently";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  if (loading || properties.length === 0) return null;

  return (
    <section className="section-spacing relative overflow-hidden">
      {/* Subtle animated background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, hsl(var(--primary)) 0, hsl(var(--primary)) 1px, transparent 0, transparent 50%)`,
          backgroundSize: '24px 24px'
        }} />
      </div>

      <div className="container mx-auto container-padding relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/50 border border-accent mb-md">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Sneak Peek</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-md">
            Fresh <span className="text-gradient">Arrivals</span>
          </h2>
          <p className="text-foreground/60 text-base max-w-xl mx-auto">
            New listings awaiting verification — get early access before they go live
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {properties.map((property, index) => {
            const progress = getVerificationProgress(property);
            return (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <Card
                  className="group relative overflow-hidden border-dashed border-foreground/20 hover:border-primary/50 bg-card/60 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  {/* Image with frosted overlay */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={Array.isArray(property.images) && property.images[0] ? property.images[0] : "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 saturate-[0.7] group-hover:saturate-100"
                      loading="lazy"
                    />
                    {/* Frosted glass strip at top */}
                    <div className="absolute top-0 inset-x-0 px-3 py-2 bg-background/70 backdrop-blur-md flex items-center justify-between">
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/10 text-[10px] px-2">
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        Awaiting Verification
                      </Badge>
                      <span className="text-[10px] text-foreground/50 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(property.created_at)}
                      </span>
                    </div>

                    {/* Diagonal "PREVIEW" watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 group-hover:opacity-5 transition-opacity">
                      <span className="text-4xl font-black tracking-[0.3em] text-foreground rotate-[-30deg] select-none">
                        PREVIEW
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-md">
                    <h3 className="font-semibold text-base line-clamp-1 mb-1">{property.title}</h3>

                    <div className="flex items-center gap-1 text-foreground/50 text-xs mb-md">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">{property.locality || 'TBD'}, {property.city || 'TBD'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-foreground/60 mb-md">
                      {(property.bhk || property.bedrooms) && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-3.5 w-3.5" />
                          <span>{property.bhk || property.bedrooms} BHK</span>
                        </div>
                      )}
                      {property.area_sqft && (
                        <div className="flex items-center gap-1">
                          <Maximize className="h-3.5 w-3.5" />
                          <span>{property.area_sqft} sqft</span>
                        </div>
                      )}
                      {property.type && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {property.type}
                        </Badge>
                      )}
                    </div>

                    {/* Price — blurred for unverified */}
                    <div className="flex items-center justify-between mb-md">
                      <span className="text-primary font-bold text-sm blur-[3px] select-none group-hover:blur-[2px] transition-all">
                        ₹{(property.price / 100000).toFixed(0)} L
                      </span>
                      <span className="text-[10px] text-foreground/40 italic">Price unverified</span>
                    </div>

                    {/* Verification progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-foreground/50">Listing Completeness</span>
                        <span className="text-primary font-medium">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-primary to-primary"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${progress}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-lg"
        >
          <Button
            variant="outline"
            className="border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 gap-2"
            onClick={() => navigate("/search?verified=false")}
          >
            <Sparkles className="h-4 w-4" />
            Explore All New Arrivals
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default SneakPeekListings;
