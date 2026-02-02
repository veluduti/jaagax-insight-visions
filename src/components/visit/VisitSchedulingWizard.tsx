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
  id: string;
  name: string | null;
  photo_url: string | null;
  trust_score: number | null;
  agency_name: string | null;
  sales_count: number | null;
  cities_served: string[] | null;
  languages: string[] | null;
}

interface VisitSchedulingWizardProps {
  propertyId: string;
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
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [visitType, setVisitType] = useState<'in-person' | 'virtual'>('in-person');

  useEffect(() => {
    if (step === 2) {
      fetchAvailableAgents();
    }
  }, [step]);

  const fetchAvailableAgents = async () => {
    setLoading(true);
    try {
      let agents: Agent[] = [];

      if (city) {
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, photo_url, trust_score, agency_name, sales_count, cities_served, languages')
          .contains('cities_served', [city])
          .order('trust_score', { ascending: false })
          .limit(10);

        if (!error && data && data.length > 0) {
          agents = data;
        }
      }

      if (agents.length === 0) {
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, photo_url, trust_score, agency_name, sales_count, cities_served, languages')
          .order('trust_score', { ascending: false })
          .limit(10);

        if (!error && data) {
          agents = data;
        }
      }

      setAvailableAgents(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
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

                <p className="text-sm text-muted-foreground mb-4">
                  {autoAssign ? 'Preview available agents:' : 'Or choose your preferred agent:'}
                </p>
                
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
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
                            src={agent.photo_url || '/placeholder.svg'}
                            alt={agent.name || 'Agent'}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="font-semibold">{agent.name || 'Agent'}</div>
                            <div className="text-sm text-muted-foreground">{agent.agency_name || 'Independent'}</div>
                            <div className="flex items-center flex-wrap gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                Trust: {agent.trust_score || 0}/100
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {agent.sales_count || 0} sales
                              </Badge>
                              {agent.languages && agent.languages.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {agent.languages.join(', ')}
                                </Badge>
                              )}
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

          {/* Step 3: Travel Selection */}
          {step === 3 && (
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">How will you travel?</h3>
              <p className="text-muted-foreground mb-6">
                Select your preferred mode of transportation
              </p>

              <div className="grid gap-4">
                {carPlans.map((plan) => {
                  const Icon = plan.icon;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setTravelMode(plan.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        travelMode === plan.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{plan.name}</span>
                            <span className="text-primary font-bold">{plan.price}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {plan.features.map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
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
                  <Input
                    id="pickup"
                    placeholder="Enter your pickup address"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}
            </Card>
          )}

          {/* Step 4: Contact Details */}
          {step === 4 && (
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Contact Details</h3>
              <p className="text-muted-foreground mb-6">
                Enter your details to confirm the booking
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="requests">Special Requests (Optional)</Label>
                  <Textarea
                    id="requests"
                    placeholder="Any special requirements or questions?"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <Card className="p-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Confirm Your Booking</h3>
              <p className="text-muted-foreground mb-6">
                Review your details and confirm the visit
              </p>

              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 mb-6">
                <p><strong>Property:</strong> {propertyTitle}</p>
                <p><strong>Location:</strong> {locality}, {city}</p>
                <p><strong>Date:</strong> {selectedDate?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p><strong>Time:</strong> {TIME_SLOTS.find(s => s.value === selectedTime)?.label}</p>
                <p><strong>Visit Type:</strong> {visitType === 'in-person' ? 'In-Person' : 'Virtual Tour'}</p>
                <p><strong>Travel:</strong> {carPlans.find(p => p.id === travelMode)?.name}</p>
                {selectedAgent && <p><strong>Agent:</strong> {selectedAgent.name}</p>}
                <p><strong>Name:</strong> {userName}</p>
                <p><strong>Email:</strong> {userEmail}</p>
                <p><strong>Phone:</strong> {userPhone}</p>
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Booking'}
              </Button>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {step < 5 && (
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};