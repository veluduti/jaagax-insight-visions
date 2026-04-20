import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone, MessageCircle, Mail, Award, Languages, MapPin, Shield, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface NearbyAgentsProps {
  primaryAgent?: any;
  city: string;
  locality: string;
  propertyId: string;
  /** When true, hide all other agents — only the primaryAgent (assigned agent) is shown */
  exclusiveAssignedAgent?: boolean;
}

export default function NearbyAgents({ primaryAgent, city, locality, propertyId, exclusiveAssignedAgent = false }: NearbyAgentsProps) {
  const navigate = useNavigate();
  const [nearbyAgents, setNearbyAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (exclusiveAssignedAgent) {
      // Strict rule: only the assigned agent is allowed to handle this listing
      setNearbyAgents([]);
      setLoading(false);
      return;
    }
    fetchNearbyAgents();
  }, [city, locality, exclusiveAssignedAgent]);

  const fetchNearbyAgents = async () => {
    try {
      setLoading(true);

      // Query agents serving this city/locality
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .or(`cities_served.ilike.%${city}%,cities_served.ilike.%${locality}%`)
        .neq("id", primaryAgent?.id || "00000000-0000-0000-0000-000000000000")
        .eq("verified", true)
        .order("trust_score", { ascending: false })
        .limit(5);

      if (error) throw error;

      setNearbyAgents(data || []);
    } catch (error) {
      console.error("Error fetching nearby agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (agent: any, method: "call" | "whatsapp" | "message") => {
    const { data: { user } } = await supabase.auth.getUser();

    switch (method) {
      case "call":
        window.location.href = `tel:+919876543210`;
        toast.success("Opening dialer...");
        break;
      case "whatsapp":
        const message = encodeURIComponent(
          `Hi ${agent.name}, I'm interested in property ID: ${propertyId}`
        );
        window.open(`https://wa.me/919876543210?text=${message}`, "_blank");
        break;
      case "message":
        if (!user) {
          toast.error("Please login to send messages");
          return;
        }
        toast.info("Messaging feature coming soon");
        break;
    }
  };

  const AgentMiniCard = ({ agent, isPrimary = false }: { agent: any; isPrimary?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-xl p-4 relative ${isPrimary ? "border-2 border-primary" : ""}`}
    >
      {isPrimary && (
        <Badge className="absolute top-2 right-2 bg-primary">
          Primary Agent
        </Badge>
      )}
      
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-12 w-12 ring-2 ring-primary/20">
          <AvatarImage src={agent.photo_url} alt={agent.name} />
          <AvatarFallback>{agent.name?.charAt(0) || 'A'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold truncate">{agent.name}</h4>
            {agent.verified && (
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{agent.agency_name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-primary">
              <Award className="h-3 w-3" />
              {agent.sales_count || 0} sales
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Shield className="h-3 w-3" />
              {agent.trust_score || 75}/100
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Languages className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{agent.languages || "English, Hindi"}</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleContact(agent, "call")}
          className="flex-1 gap-1"
        >
          <Phone className="h-3 w-3" />
          Call
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleContact(agent, "whatsapp")}
          className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
        >
          <MessageCircle className="h-3 w-3" />
          Chat
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/agent/${agent.id}`)}
        className="w-full mt-2 text-xs"
      >
        View Full Profile
      </Button>
    </motion.div>
  );

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {exclusiveAssignedAgent ? "Your Dedicated Agent" : "Contact Agents"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {exclusiveAssignedAgent
            ? "This property is exclusively handled by the assigned agent below. All enquiries and visits route to them."
            : primaryAgent
            ? "Primary agent and nearby specialists"
            : "Agents serving this area"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary / Assigned Agent */}
        {primaryAgent && <AgentMiniCard agent={primaryAgent} isPrimary />}

        {/* Nearby Agents — hidden when exclusive */}
        {exclusiveAssignedAgent ? null : loading ? (
          <>
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </>
        ) : nearbyAgents.length > 0 ? (
          <>
            {!primaryAgent && nearbyAgents.length > 0 && (
              <div className="text-xs text-muted-foreground mb-2">
                Suggested Agents • Contact to list or inquire
              </div>
            )}
            <div className="grid gap-4">
              {nearbyAgents.slice(0, primaryAgent ? 3 : 5).map((agent) => (
                <AgentMiniCard key={agent.id} agent={agent} />
              ))}
            </div>
          </>
        ) : (
          !primaryAgent && (
            <div className="text-center py-6">
              <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No agents found for this area
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                Request Agent Contact
              </Button>
            </div>
          )
        )}

        {!exclusiveAssignedAgent && nearbyAgents.length > (primaryAgent ? 3 : 0) && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate(`/agents?city=${city}`)}
          >
            View All Agents in {city}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
