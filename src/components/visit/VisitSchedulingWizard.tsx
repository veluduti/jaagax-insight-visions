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
  Car, 
  Crown, 
  Sparkles, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon,
  ArrowRight,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Agent {
  id: number;
  name: string;
  photo_url: string;
  trust_score: number;
  agency_name: string;
  sales_count: number;
  cities_served: string;
}

interface VisitSchedulingWizardProps {
  propertyId: number;
  propertyTitle: string;
  locality: string;
  city: string;
  onSuccess: (bookingId: string) => void;
}

const carPlans = [
  {
    id: 'self',
    name: 'Self Arrival',
    icon: MapPin,
    price: 'Free',
    features: ['Arrive on your own', 'Flexible timing', 'No waiting'],
  },
  {
    id: 'base',
    name: 'Base Car',
    icon: Car,
    price: '₹499',
    features: ['Sedan (Dzire/City)', 'AC comfort', 'Professional driver', 'Up to 4 people'],
  },
  {
    id: 'premium',
    name: 'Premium SUV',
    icon: Crown,
    price: '₹999',
    features: ['Innova/Hector', 'Premium comfort', 'Expert driver', 'Up to 7 people'],
  },
  {
    id: 'ultimate',
    name: 'Ultimate Luxury',
    icon: Sparkles,
    price: '₹2,499',
    features: ['Mercedes/BMW', 'Luxury experience', 'Chauffeur service', 'Refreshments included'],
  },
];

const TIME_SLOTS = [
  { id: '09-11', label: '9:00 AM - 11:00 AM', value: '09:00' },
  { id: '12-14', label: '12:00 PM - 2:00 PM', value: '12:00' },
  { id: '15-17', label: '3:00 PM - 5:00 PM', value: '15:00' },
  { id: '17-19', label: '5:00 PM - 7:00 PM', value: '17:00' },
];

export const VisitSchedulingWizard = ({
  propertyId,
  propertyTitle,
  locality,
  city,
  onSuccess,
}: VisitSchedulingWizardProps) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [travelMode, setTravelMode] = useState('self');
  const [pickupLocation, setPickupLocation] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [visitType, setVisitType] = useState<'in-person' | 'virtual'>('in-person');

  // Fetch agents when entering step 2
  useEffect(() => {
    if (step === 2) {
      fetchAvailableAgents();
    }
  }, [step]);

  const fetchAvailableAgents = async () => {
    setLoading(true);
    try {
      // First try to find agents by city (more common match)
      let query = supabase
        .from('agents')
        .select('*')
        .eq('verified', true)
        .order('trust_score', { ascending: false });

      // Filter by city for better matching
      if (city) {
        query = query.ilike('cities_served', `%${city}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) {
        console.error('Error fetching agents:', error);
        toast.error('Failed to load agents');
      } else {
        // If no agents found with city filter, try without filter
        if (data && data.length === 0 && city) {
          const { data: allAgents } = await supabase
            .from('agents')
            .select('*')
            .eq('verified', true)
            .order('trust_score', { ascending: false })
            .limit(10);
          
          setAvailableAgents(allAgents || []);
        } else {
          setAvailableAgents(data || []);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAgentAndSlots = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      if (autoAssign) {
        // Get AI-assigned agent
        const { data: agentData } = await supabase.functions.invoke('ai-assign-agent', {
          body: {
            propertyId,
            locality,
            city,
            date: selectedDate.toISOString().split('T')[0],
          },
        });

        if (agentData?.agent) {
          setSelectedAgent(agentData.agent);
        }
      }

      // Get optimized time slots for selected or auto-assigned agent
      const agentId = selectedAgent?.id;
      if (agentId) {
        const { data: slotsData } = await supabase.functions.invoke('ai-optimize-slot', {
          body: {
            agentId,
            date: selectedDate.toISOString().split('T')[0],
            pickupLocation: { address: pickupLocation },
            propertyLocation: { locality, city },
          },
        });

        if (slotsData?.slots) {
          setTimeSlots(slotsData.slots);
          setAiInsight(slotsData.aiInsight || '');
          if (slotsData.recommended) {
            setSelectedTime(slotsData.recommended.time);
          }
        }
      }
    } catch (error) {
      console.error('Error loading agent and slots:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 1 && !selectedDate) {
      toast.error('Please select a date');
      return;
    }
    if (step === 2 && !selectedTime) {
      toast.error('Please select a time slot');
      return;
    }
    if (step === 2 && !autoAssign && !selectedAgent) {
      toast.error('Please select an agent or choose auto-assign');
      return;
    }
    if (step === 3 && travelMode !== 'self' && !pickupLocation) {
      toast.error('Please enter pickup location');
      return;
    }
    if (step === 4) {
      if (!userName || !userEmail || !userPhone) {
        toast.error('Please fill all contact details');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('schedule-visit', {
        body: {
          userId: user?.id,
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

      toast.success('Visit scheduled successfully!');
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
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, label: 'Date' },
          { num: 2, label: 'Time & Agent' },
          { num: 3, label: 'Travel' },
          { num: 4, label: 'Details' }
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step > s.num
                    ? 'bg-primary text-primary-foreground'
                    : step === s.num
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className={`text-xs mt-1 ${step >= s.num ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {idx < 3 && (
              <div
                className={`h-1 w-full mx-2 transition-all ${
                  step > s.num ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Live Booking Summary */}
      {(selectedDate || selectedTime || travelMode !== 'self') && (
        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">Your Booking Summary</p>
              <div className="text-xs space-y-0.5 text-muted-foreground">
                {selectedDate && <p>📅 {selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>}
                {selectedTime && <p>🕒 {TIME_SLOTS.find(s => s.value === selectedTime)?.label}</p>}
                {visitType && <p>👁️ {visitType === 'in-person' ? 'In-Person Visit' : 'Virtual Tour'}</p>}
                {travelMode !== 'self' && <p>🚗 {carPlans.find(p => p.id === travelMode)?.name}</p>}
                {selectedAgent && <p>👤 Agent: {selectedAgent.name}</p>}
              </div>
            </div>
          </div>
        </Card>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Date Selection */}
          {step === 1 && (
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Select Visit Date</h3>
              <p className="text-muted-foreground mb-6">
                Choose your preferred date for the property visit
              </p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </Card>
          )}

          {/* Step 2: Time & Agent Selection */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Visit Type Selection */}
              <Card className="p-6">
                <h3 className="text-2xl font-bold mb-4">Visit Type</h3>
                <p className="text-muted-foreground mb-4">
                  Choose how you'd like to view the property
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={visitType === 'in-person' ? 'default' : 'outline'}
                    onClick={() => setVisitType('in-person')}
                    className="flex flex-col h-auto py-6"
                  >
                    <MapPin className="w-6 h-6 mb-2" />
                    <span className="font-semibold">In-Person Visit</span>
                    <span className="text-xs opacity-80 mt-1">See the property yourself</span>
                  </Button>
                  <Button
                    variant={visitType === 'virtual' ? 'default' : 'outline'}
                    onClick={() => setVisitType('virtual')}
                    className="flex flex-col h-auto py-6"
                  >
                    <Sparkles className="w-6 h-6 mb-2" />
                    <span className="font-semibold">Virtual Tour</span>
                    <span className="text-xs opacity-80 mt-1">View via video call</span>
                  </Button>
                </div>
              </Card>

              {/* Time Slot Selection */}
              <Card className="p-6">
                <h3 className="text-2xl font-bold mb-4">Select Time Slot</h3>
                <p className="text-muted-foreground mb-4">
                  Choose your preferred time for the visit
                </p>
                
                {aiInsight && (
                  <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-primary font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Recommendation
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{aiInsight}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedTime === slot.value ? 'default' : 'outline'}
                      onClick={() => setSelectedTime(slot.value)}
                      className="flex flex-col h-auto py-4"
                    >
                      <Clock className="w-5 h-5 mb-2" />
                      <span className="font-semibold">{slot.label}</span>
                    </Button>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-2xl font-bold mb-4">Meet Your Agent</h3>
                
                <div className="mb-4">
                  <Button
                    onClick={() => setAutoAssign(!autoAssign)}
                    variant={autoAssign ? 'default' : 'outline'}
                    className="w-full justify-start gap-2 h-auto py-4"
                  >
                    <Sparkles className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Auto-Assign Best Agent</div>
                      <div className="text-xs opacity-80">AI selects based on locality & trust score</div>
                    </div>
                  </Button>
                </div>

                {!autoAssign && (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">Or choose your preferred agent:</p>
                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                        ))}
                      </div>
                    ) : availableAgents.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No agents available for this location
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {availableAgents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              setSelectedAgent(agent);
                              setAutoAssign(false);
                            }}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                              selectedAgent?.id === agent.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <img
                                src={agent.photo_url}
                                alt={agent.name}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <div className="font-semibold">{agent.name}</div>
                                <div className="text-sm text-muted-foreground">{agent.agency_name}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    Trust: {agent.trust_score}/100
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {agent.sales_count} sales
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          )}

          {/* Step 3: Travel Mode Selection */}
          {step === 3 && (
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Choose Travel Mode</h3>
              <p className="text-muted-foreground mb-6">
                How would you like to reach the property?
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {carPlans.map((plan) => {
                  const Icon = plan.icon;
                  const estimatedTime = plan.id === 'self' ? 'Flexible' : plan.id === 'base' ? '45 mins' : plan.id === 'premium' ? '40 mins' : '35 mins';
                  return (
                    <Card
                      key={plan.id}
                      className={`p-4 cursor-pointer transition-all ${
                        travelMode === plan.id
                          ? 'border-primary ring-2 ring-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setTravelMode(plan.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold">{plan.name}</h4>
                            {travelMode === plan.id && (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <p className="text-xl font-bold text-primary mt-1">{plan.price}</p>
                          {plan.id !== 'self' && (
                            <p className="text-xs text-muted-foreground mt-1">⏱️ Est. arrival: {estimatedTime}</p>
                          )}
                          <ul className="mt-2 space-y-1">
                            {plan.features.map((feature) => (
                              <li key={feature} className="text-sm text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {travelMode !== 'self' && (
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Location *</Label>
                  <Input
                    id="pickup"
                    placeholder="Enter your pickup address"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                  />
                </div>
              )}
            </Card>
          )}

          {/* Step 4: Contact Details */}
          {step === 4 && (
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Your Contact Details</h3>
              <p className="text-muted-foreground mb-6">
                We'll send you confirmation and visit details
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requests">Special Requests (Optional)</Label>
                  <Textarea
                    id="requests"
                    placeholder="Any specific requirements or questions..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <Button
          className="ml-auto"
          onClick={step === 4 ? handleSubmit : handleNext}
          disabled={loading}
          size="lg"
        >
          {loading ? 'Processing...' : step === 4 ? 'Confirm Booking' : 'Continue'}
          {step < 4 && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
};