import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, MessageCircle, Mail, Shield, Star, MapPin,
  Building2, ChevronRight, Download, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  builder: any;
}

const formatPrice = (val: number | null) => {
  if (!val) return "";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const BudgetMicrosite = ({ builder }: Props) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("projects").select("*").ilike("builder_name", `%${builder.builder_name}%`).limit(10);
      if (data) setProjects(data);
    };
    if (builder.builder_name) fetch();
  }, [builder.builder_name]);

  const handleDownloadBrochure = () => {
    toast.info("Brochure download will be available soon. Contact the builder for details.");
  };

  const startingPrice = builder.price_range_min ? formatPrice(builder.price_range_min) : null;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1e293b]">

      {/* ═══ HEADER — compact ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-white border-b border-gray-200 flex items-center px-3 md:px-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex-1 text-center">
          <span className="text-xs font-semibold text-gray-700 truncate">{builder.builder_name}</span>
        </div>
        <Button size="sm" className="h-7 text-[10px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-3" onClick={() => window.open(`tel:${builder.phone}`)}>
          <Phone className="h-3 w-3 mr-1" /> Call
        </Button>
      </header>

      {/* ═══ HERO — 35vh, compact info-first ═══ */}
      <section className="pt-12 relative h-[35vh] min-h-[220px] flex items-end overflow-hidden">
        {builder.images?.[0] ? (
          <img src={builder.images[0]} alt={builder.builder_name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-blue-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 pb-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {builder.logo && <img src={builder.logo} alt="" className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur p-1 border border-white/15 object-contain" />}
                <Badge className="bg-white/15 backdrop-blur text-white/90 border border-white/20 text-[9px] rounded-md px-2 py-0.5">Value Builder</Badge>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{builder.builder_name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                {builder.operating_cities?.length > 0 && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{builder.operating_cities.join(", ")}</span>}
                {builder.customer_rating > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{builder.customer_rating}</span>}
              </div>
            </div>
            {startingPrice && (
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-white/40">Starting from</p>
                <p className="text-lg font-bold text-white">{startingPrice}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ QUICK STATS ═══ */}
      <div className="max-w-3xl mx-auto px-4 -mt-3 relative z-10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
          {builder.completed_projects_count > 0 && <div className="flex-1 text-center border-r border-gray-100 last:border-0"><p className="text-base font-bold text-blue-600">{builder.completed_projects_count}</p><p className="text-[9px] text-gray-400">Projects</p></div>}
          {builder.total_units_delivered > 0 && <div className="flex-1 text-center border-r border-gray-100 last:border-0"><p className="text-base font-bold text-blue-600">{builder.total_units_delivered.toLocaleString()}</p><p className="text-[9px] text-gray-400">Units</p></div>}
          {builder.years_of_experience && <div className="flex-1 text-center"><p className="text-base font-bold text-blue-600">{builder.years_of_experience}+</p><p className="text-[9px] text-gray-400">Years</p></div>}
        </div>
      </div>

      {/* ═══ CONTENT — tight single column ═══ */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* About — brief */}
        {builder.description && (
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 mb-2">About</h2>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">{builder.description}</p>
          </div>
        )}

        {/* Projects — list style */}
        {projects.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3"><Building2 className="h-3.5 w-3.5 text-blue-500" /> Projects</h2>
            <div className="space-y-2">
              {projects.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50">
                    {p.image || p.images?.[0] ? <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-5 w-5 text-gray-200 m-auto mt-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs text-gray-700 truncate">{p.name}</h4>
                    <p className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5"><MapPin className="h-2.5 w-2.5" />{p.locality}, {p.city}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.status && <Badge className="text-[9px] h-4 bg-blue-50 text-blue-600 border-0 px-1.5">{p.status}</Badge>}
                      {p.price_min && <span className="text-[10px] font-bold text-blue-600">{formatPrice(p.price_min)}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust — compact */}
        {(builder.rera_number || builder.certifications) && (
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-500" /> Verification</h2>
            {builder.rera_number && <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-xs text-green-700"><Shield className="h-3.5 w-3.5" /> RERA: <span className="font-mono font-medium">{builder.rera_number}</span></div>}
            {builder.certifications && <p className="text-xs text-gray-500">{builder.certifications}</p>}
          </div>
        )}

        {/* Contact — simple */}
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Get in Touch</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button className="h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 gap-1.5 text-xs" onClick={() => window.open(`tel:${builder.phone}`)}>
              <Phone className="h-3.5 w-3.5" /> Call
            </Button>
            {builder.whatsapp ? (
              <Button variant="outline" className="h-10 rounded-lg border-green-200 text-green-600 hover:bg-green-50 gap-1.5 text-xs" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
            ) : builder.email ? (
              <Button variant="outline" className="h-10 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 gap-1.5 text-xs" onClick={() => window.open(`mailto:${builder.email}`)}>
                <Mail className="h-3.5 w-3.5" /> Email
              </Button>
            ) : null}
          </div>
          <Button variant="outline" className="w-full h-9 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 gap-1.5 text-xs" onClick={handleDownloadBrochure}>
            <Download className="h-3.5 w-3.5" /> Download Brochure
          </Button>
        </div>
      </div>

      {/* ═══ FIXED BOTTOM CTA (mobile) ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-3 py-2.5 md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <Button className="flex-1 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 gap-1.5 text-xs font-medium" onClick={() => window.open(`tel:${builder.phone}`)}>
            <Phone className="h-3.5 w-3.5" /> Call Builder
          </Button>
          <Button variant="outline" className="h-10 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 px-3 text-xs" onClick={handleDownloadBrochure}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          {builder.whatsapp && (
            <Button variant="outline" className="h-10 rounded-lg border-green-200 text-green-600 hover:bg-green-50 px-3 text-xs" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="h-16 md:hidden" />
    </div>
  );
};

export default BudgetMicrosite;
