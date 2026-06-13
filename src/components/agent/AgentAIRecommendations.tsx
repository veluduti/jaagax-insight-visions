import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, MapPin, TrendingUp, Megaphone, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AgentAIRecommendations() {
  const navigate = useNavigate();

  const recommendations = [
    { icon: Calendar, title: "Hyderabad Real Estate Expo 2026", subtitle: "Network with 200+ buyers", action: "Book Event", cta: () => navigate("/events"), badge: "Event" },
    { icon: Megaphone, title: "Sponsor Sunday Property Walk", subtitle: "Reach 500+ qualified leads · ₹1,499", action: "Sponsor Now", cta: () => navigate("/events"), badge: "Sponsor" },
    { icon: Route, title: "Smart Visit Plan: 4 visits in Gachibowli", subtitle: "Save 90 min with optimized route", action: "Create Plan", cta: () => navigate("/agent/route"), badge: "AI Plan" },
    { icon: TrendingUp, title: "Trending: 3BHK in Kondapur", subtitle: "+22% search demand this week", action: "View Properties", cta: () => navigate("/search?locality=Kondapur"), badge: "Trending" },
    { icon: MapPin, title: "Hot Lead Zone: Madhapur", subtitle: "12 new buyer enquiries", action: "View Leads", cta: () => navigate("/agent/dashboard"), badge: "Lead Score" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition">
              <div className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{r.title}</p>
                  <Badge variant="outline" className="text-[10px]">{r.badge}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
              </div>
              <Button size="sm" variant="outline" onClick={r.cta}>{r.action}</Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
