import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Car, Crown, Sparkles, Clock, MapPin, User, Phone, Mail, 
  Calendar as CalendarIcon, ArrowRight, ArrowLeft, CheckCircle2, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Agent {
  id: string;
  name: string | null;
  photo_url: string | null;
  trust_score: number | null;
  agency_name: string | null;
  sales_count: number | null;
  cities_served: string | null;
  languages: string | null;
  phone: string | null;
}

interface VisitSchedulingWizardProps {
  propertyId: string;
  propertyTitle: string;
  locality: string;
  city: string;
  onSuccess: (bookingId: string) => void;
}

const carPlans = [
  { id: 'self', name: 'Self Arrival', icon: MapPin, price: 'Free', features: ['Arrive on your own', 'Flexible timing', 'No waiting'] },
  { id: 'base', name: 'Base Car', icon: Car, price: '₹499', features: ['Sedan (Dzire/City)', 'AC comfort', 'Professional driver', 'Up to 4 people'] },
  { id: 'premium', name: 'Premium SUV', icon: Crown, price: '₹999', features: ['Innova/Hector', 'Premium comfort', 'Expert driver', 'Up to 7 people'] },
  { id: 'ultimate', name: 'Ultimate Luxury', icon: Sparkles, price: '₹2,499', features: ['Mercedes/BMW', 'Luxury experience', 'Chauffeur service', 'Refreshments included'] },
];

const TIME_SLOTS = [
  { id: '09-11', label: '9:00 AM - 11:00 AM', value: '09:00' },
  { id: '11-13', label: '11:00 AM - 1:00 PM', value: '11:00' },
  { id: '14-16', label: '2:00 PM - 4:00 PM', value: '14:00' },
  { id: '16-18', label: '4:00 PM - 6:00 PM', value: '16:00' },
];

const STEPS = [
  { num: 1, label: 'Date' },
  { num: 2, label: 'Time & Agent' },
  { num: 3, label: 'Travel' },
  { num: 4, label: 'Your Details' },
  { num: 5, label: 'Confirm' },
];

export const VisitSchedulingWizard = ({
  propertyId, propertyTitle, locality, city, onSuccess,
}: VisitSchedulingWizardProps) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [travelMode, setTravelMode] = useState('self');
  const [pickupLocation, setPickupLocation] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [visitType, setVisitType] = useState<'in-person' | 'virtual'>('in-person');

  // Pre-fill user details
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.name || '');
        setUserPhone(user.user_metadata?.phone || '');
      }
    };
    loadUser();
  }, []);

  // Fetch agents when entering step 2
  useEffect(() => {
    if (step === 2) fetchAvailableAgents();
  }, [step]);

  const fetchAvailableAgents = async () => {
    setAgentsLoading(true);
    try {
      let agents: Agent[] = [];
      if (city) {
        const { data } = await supabase
          .from('agents')
          .select('id, name, photo_url, trust_score, agency_name, sales_count, cities_served, languages, phone')
          .ilike('cities_served', `%${city}%`)
          .eq('verified', true)
          .order('trust_score', { ascending: false })
          .limit(10);
        if (data?.length) agents = data;
      }
      if (!agents.length) {
        const { data } = await supabase
          .from('agents')
          .select('id, name, photo_url, trust_score, agency_name, sales_count, cities_served, languages, phone')
          .eq('verified', true)
          .order('trust_score', { ascending: false })
          .limit(10);
        if (data) agents = data;
      }
      setAvailableAgents(agents);
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setAgentsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedDate;
      case 2: return !!selectedTime && (autoAssign || !!selectedAgent);
      case 3: return travelMode === 'self' || !!pickupLocation;
      case 4: return !!userName && !!userEmail && !!userPhone;
      default: return true;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      const msgs: Record<number, string> = {
        1: 'Please select a date',
        2: 'Please select a time slot',
        3: 'Please enter pickup location',
        4: 'Please fill all contact details',
      };
      toast.error(msgs[step] || 'Please complete this step');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('schedule-visit', {
        body: {
          propertyId,
          agentId: selectedAgent?.id || null,
          autoAssign,
          visitDate: selectedDate?.toISOString().split('T')[0],
          visitTime: selectedTime,
          visitType,
          travelMode,
          pickupLocation: pickupLocation ? { address: pickupLocation } : null,
          userName,
          userEmail,
          userPhone,
          specialRequests,
        },
      });
      if (error) throw error;
      toast.success('Visit request sent successfully!');
      onSuccess(data.booking.id);
    } catch (error) {
      console.error('Error scheduling visit:', error);
      toast.error('Failed to schedule visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step > s.num ? 'bg-primary text-primary-foreground' :
                step === s.num ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground'
              }`}>
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${step >= s.num ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-1 w-full mx-1 transition-all ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Booking Summary Strip */}
      {(selectedDate || selectedTime) && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            {selectedDate && <span>📅 {selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
            {selectedTime && <span>• 🕒 {TIME_SLOTS.find(s => s.value === selectedTime)?.label}</span>}
            {selectedAgent && <span>• 👤 {selectedAgent.name}</span>}
            {travelMode !== 'self' && <span>• 🚗 {carPlans.find(p => p.id === travelMode)?.name}</span>}
          </div>
        </Card>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

          {/* Step 1: Date */}
          {step === 1 && (
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-2">Select Visit Date</h3>
              <p className="text-muted-foreground mb-6">Choose your preferred date for the property visit</p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border pointer-events-auto"
              />
            </Card>
          )}

          {/* Step 2: Time & Agent */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Visit Type */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-3">Visit Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant={visitType === 'in-person' ? 'default' : 'outline'} onClick={() => setVisitType('in-person')} className="flex flex-col h-auto py-4">
                    <MapPin className="w-5 h-5 mb-1" /><span className="font-semibold text-sm">In-Person</span>
                  </Button>
                  <Button variant={visitType === 'virtual' ? 'default' : 'outline'} onClick={() => setVisitType('virtual')} className="flex flex-col h-auto py-4">
                    <Sparkles className="w-5 h-5 mb-1" /><span className="font-semibold text-sm">Virtual Tour</span>
                  </Button>
                </div>
              </Card>

              {/* Time Slots */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-3">Select Time Slot</h3>
                <div className="grid grid-cols-2 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <Button key={slot.id} variant={selectedTime === slot.value ? 'default' : 'outline'} onClick={() => setSelectedTime(slot.value)} className="flex flex-col h-auto py-3">
                      <Clock className="w-4 h-4 mb-1" /><span className="text-sm font-medium">{slot.label}</span>
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Agent Selection */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-3">Choose Your Agent</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Showing verified agents near <strong>{city}</strong>
                </p>

                <Button onClick={() => { setAutoAssign(true); setSelectedAgent(null); }}
                  variant={autoAssign ? 'default' : 'outline'}
                  className="w-full justify-start gap-2 h-auto py-3 mb-4"
                >
                  <Sparkles className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Auto-Assign Best Agent</div>
                    <div className="text-xs opacity-80">AI selects based on locality & trust score</div>
                  </div>
                </Button>

                {agentsLoading ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />))}</div>
                ) : availableAgents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No agents available in this area yet. Auto-assign will find the best match.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {availableAgents.map((agent) => (
                      <button key={agent.id} onClick={() => { setSelectedAgent(agent); setAutoAssign(false); }}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          selectedAgent?.id === agent.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={agent.photo_url || '/placeholder.svg'} alt={agent.name || 'Agent'} className="w-12 h-12 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'; }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{agent.name || 'Agent'}</div>
                            <div className="text-xs text-muted-foreground">{agent.agency_name || 'Independent'} • {agent.cities_served || city}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">⭐ {agent.trust_score || 0}/100</Badge>
                              <Badge variant="outline" className="text-xs">{agent.sales_count || 0} sales</Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Step 3: Travel */}
          {step === 3 && (
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-2">How will you travel?</h3>
              <p className="text-muted-foreground mb-6">Select your preferred transportation</p>
              <div className="grid gap-3">
                {carPlans.map((plan) => {
                  const Icon = plan.icon;
                  return (
                    <button key={plan.id} onClick={() => setTravelMode(plan.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        travelMode === plan.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{plan.name}</span>
                            <span className="text-primary font-bold text-sm">{plan.price}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {plan.features.map((f, i) => (<Badge key={i} variant="outline" className="text-xs">{f}</Badge>))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {travelMode !== 'self' && (
                <div className="mt-6">
                  <Label htmlFor="pickup">Pickup Location</Label>
                  <Input id="pickup" placeholder="Enter your pickup address" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} className="mt-2" />
                </div>
              )}
            </Card>
          )}

          {/* Step 4: Contact Details */}
          {step === 4 && (
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-2">Your Details</h3>
              <p className="text-muted-foreground mb-6">Confirm your contact information</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2"><User className="w-4 h-4" />Full Name</Label>
                  <Input id="name" placeholder="Enter your full name" value={userName} onChange={(e) => setUserName(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="w-4 h-4" />Phone</Label>
                  <Input id="phone" type="tel" placeholder="+91 9876543210" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="requests">Special Requests (Optional)</Label>
                  <Textarea id="requests" placeholder="Any special requirements?" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className="mt-2" rows={3} />
                </div>
              </div>
            </Card>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <Card className="p-6">
              <div className="text-center mb-6">
                <Send className="w-12 h-12 text-primary mx-auto mb-3" />
                <h3 className="text-2xl font-bold">Confirm & Send Request</h3>
                <p className="text-muted-foreground text-sm">Review your booking and send request to agent</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-5 space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Property:</span><p className="font-medium">{propertyTitle}</p></div>
                  <div><span className="text-muted-foreground">Location:</span><p className="font-medium">{locality}, {city}</p></div>
                  <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{selectedDate?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                  <div><span className="text-muted-foreground">Time:</span><p className="font-medium">{TIME_SLOTS.find(s => s.value === selectedTime)?.label}</p></div>
                  <div><span className="text-muted-foreground">Visit Type:</span><p className="font-medium">{visitType === 'in-person' ? 'In-Person' : 'Virtual Tour'}</p></div>
                  <div><span className="text-muted-foreground">Travel:</span><p className="font-medium">{carPlans.find(p => p.id === travelMode)?.name}</p></div>
                </div>
                <hr className="border-border" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Name:</span><p className="font-medium">{userName}</p></div>
                  <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{userPhone}</p></div>
                  <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{userEmail}</p></div>
                  {selectedAgent && <div><span className="text-muted-foreground">Agent:</span><p className="font-medium">{selectedAgent.name}</p></div>}
                  {!selectedAgent && autoAssign && <div><span className="text-muted-foreground">Agent:</span><p className="font-medium">Auto-assigned</p></div>}
                </div>
                {specialRequests && (
                  <>
                    <hr className="border-border" />
                    <div className="text-sm"><span className="text-muted-foreground">Notes:</span><p className="font-medium">{specialRequests}</p></div>
                  </>
                )}
              </div>

              <Button onClick={handleSubmit} className="w-full" size="lg" disabled={loading}>
                {loading ? 'Sending Request...' : 'Send Visit Request to Agent'}
                {!loading && <Send className="w-4 h-4 ml-2" />}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                The agent will be notified and confirm your visit shortly.
              </p>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step <= 5 && (
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          {step < 5 && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next<ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
