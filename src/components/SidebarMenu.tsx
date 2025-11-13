import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  TrendingUp, 
  BookOpen, 
  Building2, 
  Users, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Globe,
  DollarSign,
  Ruler,
  Settings
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

export default function SidebarMenu() {
  const [open, setOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const navigate = useNavigate();
  const { role, session } = useAuth();

  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("AED");
  const [areaUnit, setAreaUnit] = useState("Square Feet");

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-accent/50">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <div className="flex flex-col gap-6 mt-8">
          {/* Market Intelligence Section */}
          <Collapsible open={marketOpen} onOpenChange={setMarketOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">Market Intelligence</span>
              </div>
              {marketOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 ml-4 space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleNavigation("/transactions")}
              >
                Market Trends
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleNavigation("/trustscore")}
              >
                Trust Score
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleNavigation("/valuation")}
              >
                Property Valuation
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Guides Section */}
          <Collapsible open={guidesOpen} onOpenChange={setGuidesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-medium">Guides</span>
              </div>
              {guidesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 ml-4 space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleNavigation("/guides")}
              >
                Buying Guide
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleNavigation("/guides")}
              >
                Selling Guide
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleNavigation("/guides")}
              >
                Investment Tips
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Floor Plans */}
          <Button 
            variant="ghost" 
            className="w-full justify-start p-3 h-auto"
            onClick={() => handleNavigation("/projects")}
          >
            <Building2 className="h-5 w-5 text-primary mr-3" />
            <span className="font-medium">Floor Plans</span>
          </Button>

          {/* Agent Portal */}
          <Button 
            variant="ghost" 
            className="w-full justify-start p-3 h-auto"
            onClick={() => {
              if (role === "agent") {
                handleNavigation("/agent-dashboard");
              } else {
                handleNavigation("/agents");
              }
            }}
          >
            <Users className="h-5 w-5 text-primary mr-3" />
            <span className="font-medium">Agent Portal</span>
          </Button>

          {/* Events Section */}
          <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">Events</span>
              </div>
              {eventsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 ml-4 space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleNavigation("/events")}
              >
                All Events
              </Button>
              {session && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sm"
                  onClick={() => handleNavigation("/events/create")}
                >
                  Create Event
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-4" />

          {/* Site Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Site Settings</span>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Language</span>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Telugu">Telugu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div className="flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Currency</span>
              </div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">🇦🇪 AED</SelectItem>
                  <SelectItem value="INR">🇮🇳 INR</SelectItem>
                  <SelectItem value="USD">🇺🇸 USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Area Unit */}
            <div className="flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Area Unit</span>
              </div>
              <Select value={areaUnit} onValueChange={setAreaUnit}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Square Feet">Square Feet</SelectItem>
                  <SelectItem value="Square Meters">Square Meters</SelectItem>
                  <SelectItem value="Acres">Acres</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
