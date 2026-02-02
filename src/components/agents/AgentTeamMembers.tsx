import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Phone, Mail, MessageSquare, MapPin, Award } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface AgentTeamMembersProps {
  agencyName: string;
  currentAgentId: string;
}

const AgentTeamMembers = ({ agencyName, currentAgentId }: AgentTeamMembersProps) => {
  const navigate = useNavigate();

  // Mock team data - in production, fetch from agents table by agency_name
  const teamMembers = [
    {
      id: 2,
      name: "Kavya Reddy",
      role: "Senior Property Consultant",
      photo: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200",
      specialization: "Luxury Apartments",
      serviceAreas: "Jubilee Hills, Banjara Hills",
      salesCount: 45,
      trustScore: 92,
      languages: "English, Telugu, Hindi"
    },
    {
      id: 3,
      name: "Arjun Patel",
      role: "Investment Specialist",
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
      specialization: "Commercial Properties",
      serviceAreas: "Gachibowli, HITEC City",
      salesCount: 38,
      trustScore: 88,
      languages: "English, Hindi, Gujarati"
    },
    {
      id: 4,
      name: "Meera Singh",
      role: "Residential Expert",
      photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200",
      specialization: "Family Homes & Villas",
      serviceAreas: "Kondapur, Madhapur",
      salesCount: 52,
      trustScore: 95,
      languages: "English, Hindi, Punjabi"
    }
  ];

  const handleContactMember = (memberId: number, method: string) => {
    if (method === "profile") {
      navigate(`/agents/${memberId}`);
    } else if (method === "whatsapp") {
      window.open(`https://wa.me/919876543210?text=Hi, I found your profile on JaagaX`, "_blank");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Members from {agencyName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect with other specialists in our agency
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarImage src={member.photo} alt={member.name} />
                  <AvatarFallback className="text-lg">
                    {member.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>

                {/* Details */}
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h4 className="font-bold text-lg">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Award className="h-3 w-3" />
                        {member.trustScore}
                      </Badge>
                    </div>
                  </div>

                  {/* Specialization */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Specialization:</span>
                      <Badge variant="secondary">{member.specialization}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{member.serviceAreas}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{member.languages}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Deals: </span>
                      <span className="font-semibold">{member.salesCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trust Score: </span>
                      <span className="font-semibold text-primary">{member.trustScore}/100</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleContactMember(member.id, "profile")}
                    >
                      View Profile
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleContactMember(member.id, "whatsapp")}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Contact
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AgentTeamMembers;
