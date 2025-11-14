import { useState } from "react";
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

  const loadAgentAndSlots = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
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

        // Get optimized time slots
        const { data: slotsData } = await supabase.functions.invoke('ai-optimize-slot', {
          body: {
            agentId: agentData.agent.id,
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
    if (step === 2 && !autoAssign && !selectedAgent) {
      toast.error('Please select an agent or choose auto-assign');
      return;
    }
    if (step === 3 && !selectedTime) {
      toast.error('Please select a time slot');
      return;
    }
    if (step === 4 && travelMode !== 'self' && !pickupLocation) {
      toast.error('Please enter pickup location');
      return;
    }
    if (step === 5) {
      if (!userName || !userEmail) {
        toast.error('Please fill required fields');
        return;
      }
      await handleSubmit();
      return;
    }

    if (step === 1) {
      await fetchAvailableAgents();
    }
    
    if (step === 2 && autoAssign) {
      await loadAgentAndSlots();
    }
    
    if (step === 2 && !autoAssign && selectedAgent) {
      await loadAgentAndSlots();
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
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`h-1 w-12 mx-2 ${
                  step > s ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

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
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Select Time & Meet Your Agent</h3>
              
              {selectedAgent && (
                <div className="mb-6 p-4 bg-muted rounded-lg flex items-center gap-4">
                  <img
                    src={selectedAgent.photo_url}
                    alt={selectedAgent.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold">{selectedAgent.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedAgent.agency_name}</p>
                    <Badge variant="secondary" className="mt-1">
                      Trust Score: {selectedAgent.trust_score}
                    </Badge>
                  </div>
                </div>
              )}

              {aiInsight && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">{aiInsight}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? 'default' : 'outline'}
                    onClick={() => setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className="flex flex-col h-auto py-3"
                  >
                    <Clock className="w-4 h-4 mb-1" />
                    <span className="font-semibold">{slot.time}</span>
                    {slot.label && (
                      <span className="text-xs opacity-70">{slot.label}</span>
                    )}
                  </Button>
                ))}
              </div>
            </Card>
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
                  return (
                    <Card
                      key={plan.id}
                      className={`p-4 cursor-pointer transition-all ${
                        travelMode === plan.id
                          ? 'border-primary ring-2 ring-primary'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setTravelMode(plan.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{plan.name}</h4>
                          <p className="text-xl font-bold text-primary mt-1">{plan.price}</p>
                          <ul className="mt-2 space-y-1">
                            {plan.features.map((feature) => (
                              <li key={feature} className="text-sm text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
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
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? 'Processing...' : step === 4 ? 'Confirm Booking' : 'Next'}
          {step < 4 && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
};