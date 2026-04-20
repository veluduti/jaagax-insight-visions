import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import {
  Home, MapPin, IndianRupee, Bed, Bath, Maximize2, Phone, Mail,
  MessageSquare, ExternalLink, UserCheck, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import PropertyChat from "@/components/chat/PropertyChat";

interface AssignedProperty {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  verification_status: string;
  submitted_by: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_name?: string | null;
}

interface Props {
  agentId: string;            // agents.id
  agentUserId: string;        // agents.user_id (auth.uid for the agent)
  agentName: string;
}

export default function AssignedPropertiesPanel({ agentId, agentUserId, agentName }: Props) {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<AssignedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatTarget, setChatTarget] = useState<AssignedProperty | null>(null);

  useEffect(() => { load(); }, [agentId]);

  const load = async () => {
    setLoading(true);
    const { data: props } = await supabase
      .from("properties")
      .select("id, title, city, locality, price, area_sqft, bedrooms, bathrooms, type, images, verified, verification_status, submitted_by")
      .eq("assigned_agent_id", agentId)
      .order("created_at", { ascending: false });

    const list = (props as AssignedProperty[]) || [];

    // Resolve owner contact for each unique submitted_by via signup_requests (has email/phone/name)
    const ownerIds = Array.from(new Set(list.map((p) => p.submitted_by).filter(Boolean))) as string[];
    const ownersMap: Record<string, { name?: string; email?: string; phone?: string }> = {};
    if (ownerIds.length) {
      const { data: owners } = await supabase
        .from("signup_requests")
        .select("user_id, full_name, email, phone")
        .in("user_id", ownerIds);
      (owners || []).forEach((o: any) => {
        ownersMap[o.user_id] = { name: o.full_name, email: o.email, phone: o.phone };
      });
    }

    setProperties(
      list.map((p) => ({
        ...p,
        owner_name: p.submitted_by ? ownersMap[p.submitted_by]?.name || null : null,
        owner_email: p.submitted_by ? ownersMap[p.submitted_by]?.email || null : null,
        owner_phone: p.submitted_by ? ownersMap[p.submitted_by]?.phone || null : null,
      })),
    );
    setLoading(false);
  };

  const formatPrice = (n: number) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${n.toLocaleString("en-IN")}`;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            Assigned Properties
            <Badge variant="outline" className="ml-1">{properties.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Properties where you are the dedicated agent — handle owner chat & buyer enquiries
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
        ) : properties.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-xl">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No assigned properties yet</p>
            <p className="text-xs text-muted-foreground">
              When admin assigns a seller's property to you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {properties.map((p, i) => {
              const img =
                (Array.isArray(p.images) && p.images[0]) ||
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="overflow-hidden border-2 hover:border-emerald-500/40 hover:shadow-lg transition-all h-full flex flex-col">
                    <div className="relative h-32">
                      <img src={img} alt={p.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge className="absolute top-2 left-2 bg-emerald-500 text-white border-0 gap-1">
                        <UserCheck className="h-3 w-3" />Yours
                      </Badge>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white font-semibold text-sm line-clamp-1 drop-shadow">{p.title}</p>
                        <p className="text-white/80 text-[11px] flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{p.locality}, {p.city}
                        </p>
                      </div>
                    </div>
                    <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-bold text-emerald-600 flex items-center">
                          <IndianRupee className="h-3.5 w-3.5" />{formatPrice(p.price).replace("₹", "")}
                        </p>
                        <Badge variant={p.verified ? "default" : "outline"} className="text-[10px]">
                          {p.verified ? "Live" : p.verification_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {p.bedrooms != null && <span className="flex items-center gap-0.5"><Bed className="h-3 w-3" />{p.bedrooms}</span>}
                        {p.bathrooms != null && <span className="flex items-center gap-0.5"><Bath className="h-3 w-3" />{p.bathrooms}</span>}
                        {p.area_sqft != null && <span className="flex items-center gap-0.5"><Maximize2 className="h-3 w-3" />{p.area_sqft} sqft</span>}
                      </div>

                      {/* Owner block */}
                      <div className="rounded-lg border bg-muted/30 p-2 space-y-1.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Owner</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {(p.owner_name || "O").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{p.owner_name || "Owner"}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {p.owner_phone || p.owner_email || "Contact via chat"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {p.owner_phone && (
                            <a href={`tel:${p.owner_phone}`} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full h-7 text-[11px]">
                                <Phone className="h-3 w-3 mr-1" />Call
                              </Button>
                            </a>
                          )}
                          {p.owner_email && (
                            <a href={`mailto:${p.owner_email}`} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full h-7 text-[11px]">
                                <Mail className="h-3 w-3 mr-1" />Email
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1.5 mt-auto pt-1">
                        <Button
                          size="sm"
                          className="flex-1 h-8 bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => setChatTarget(p)}
                          disabled={!p.submitted_by}
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />Chat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => window.open(`/property/${p.id}`, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>

      {chatTarget && chatTarget.submitted_by && (
        <PropertyChat
          open={!!chatTarget}
          onOpenChange={(o) => !o && setChatTarget(null)}
          propertyId={chatTarget.id}
          propertyTitle={chatTarget.title}
          agentUserId={agentUserId}
          sellerUserId={chatTarget.submitted_by}
          currentUserId={agentUserId}
          counterpart={{
            name: chatTarget.owner_name || "Owner",
            phone: chatTarget.owner_phone,
            role: "seller",
          }}
        />
      )}
    </Card>
  );
}
