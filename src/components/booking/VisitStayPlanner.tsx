import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Hotel, Calendar as CalendarIcon, MapPin, Star, 
  Plane, Utensils, Car, Sparkles, CheckCircle2,
  Clock, Users, Loader2, Building2, ArrowRight, Tag
} from "lucide-react";
import { useBuyerContext } from "@/hooks/useBuyerContext";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

interface PartnerHotel {
  id: string;
  name: string;
  city: string;
  locality: string;
  address: string;
  star_rating: number;
  price_per_night: number;
  discount_percentage: number;
  amenities: string[];
  images: string[];
}

interface VisitPackage {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  includes_airport_pickup: boolean;
  includes_meals: boolean;
  includes_local_transport: boolean;
  base_discount_percentage: number;
}

interface VisitStayPlannerProps {
  open: boolean;
  onClose: () => void;
  propertyId: number;
  propertyTitle: string;
  propertyCity: string;
  propertyLocality: string;
  mode?: 'visit_stay' | 'hotel_only';
}

export const VisitStayPlanner = ({ 
  open, 
  onClose, 
  propertyId, 
  propertyTitle, 
  propertyCity,
  propertyLocality,
  mode = 'visit_stay' 
}: VisitStayPlannerProps) => {
  const { user } = useAuth();
  const { buyerContext } = useBuyerContext();
  
  const [step, setStep] = useState(1);
  const [hotels, setHotels] = useState<PartnerHotel[]>([]);
  const [packages, setPackages] = useState<VisitPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedHotel, setSelectedHotel] = useState<PartnerHotel | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<VisitPackage | null>(null);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [visitDate, setVisitDate] = useState<Date | undefined>();
  const [visitTime, setVisitTime] = useState<string>("");
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  
  const [aiSuggestion, setAiSuggestion] = useState<{show: boolean; reason: string}>({ show: false, reason: "" });

  const availableTimes = [
    "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"
  ];

  useEffect(() => {
    if (open) {
      fetchHotelsAndPackages();
      checkAISuggestion();
    }
  }, [open, propertyCity]);

  const checkAISuggestion = () => {
    if (buyerContext?.primary_fear) {
      const fears = buyerContext.primary_fear;
      if (fears.includes('distance') || fears.includes('confidence') || fears.includes('travel')) {
        setAiSuggestion({
          show: true,
          reason: fears.includes('distance') 
            ? "Since you're traveling from far, a stay package gives you time to explore the area thoroughly."
            : "Taking time to stay nearby helps build confidence in your property decision."
        });
      }
    }
  };

  const fetchHotelsAndPackages = async () => {
    try {
      setLoading(true);
      
      const [hotelsRes, packagesRes] = await Promise.all([
        supabase
          .from('partner_hotels')
          .select('*')
          .eq('city', propertyCity)
          .eq('is_active', true)
          .order('star_rating', { ascending: false }),
        supabase
          .from('visit_packages')
          .select('*')
          .eq('is_active', true)
          .order('duration_days', { ascending: true })
      ]);

      if (hotelsRes.data) setHotels(hotelsRes.data as PartnerHotel[]);
      if (packagesRes.data) setPackages(packagesRes.data as VisitPackage[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load hotels and packages');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedHotel || !selectedPackage || !checkInDate) return { hotel: 0, discount: 0, final: 0 };
    
    const nights = selectedPackage.duration_days;
    const hotelTotal = selectedHotel.price_per_night * nights * rooms;
    const totalDiscount = selectedHotel.discount_percentage + selectedPackage.base_discount_percentage;
    const discountAmount = (hotelTotal * totalDiscount) / 100;
    const finalPrice = hotelTotal - discountAmount;
    
    return {
      hotel: hotelTotal,
      discount: discountAmount,
      final: finalPrice,
      nights,
      discountPercentage: totalDiscount
    };
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please login to book');
      return;
    }

    if (!selectedHotel || !selectedPackage || !checkInDate || !visitDate || !visitTime) {
      toast.error('Please complete all required selections');
      return;
    }

    try {
      setSubmitting(true);
      
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + selectedPackage.duration_days);
      
      const pricing = calculateTotalPrice();

      const { error } = await supabase
        .from('visit_stay_bookings')
        .insert({
          user_id: user.id,
          property_id: propertyId,
          hotel_id: selectedHotel.id,
          package_id: selectedPackage.id,
          booking_type: mode,
          check_in_date: checkInDate.toISOString().split('T')[0],
          check_out_date: checkOutDate.toISOString().split('T')[0],
          number_of_guests: guests,
          number_of_rooms: rooms,
          visit_date: visitDate.toISOString().split('T')[0],
          visit_time: visitTime,
          total_hotel_price: pricing.hotel,
          total_package_price: pricing.final,
          discount_applied: pricing.discount,
          final_price: pricing.final,
          special_requests: specialRequests || null,
          status: 'pending',
          ai_suggested: aiSuggestion.show,
          suggestion_reason: aiSuggestion.reason || null
        });

      if (error) throw error;

      toast.success('Visit + Stay booked successfully!');
      onClose();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to complete booking');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} 
      />
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            {mode === 'visit_stay' ? 'Plan Your Visit + Stay' : 'Book Partner Hotel'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'visit_stay' 
              ? `Visiting ${propertyTitle}? Book a nearby stay with exclusive discounts.`
              : `Find comfortable accommodation near ${propertyLocality}`}
          </DialogDescription>
        </DialogHeader>

        {/* AI Suggestion Banner */}
        <AnimatePresence>
          {aiSuggestion.show && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">AI Recommendation</p>
                  <p className="text-sm text-muted-foreground">{aiSuggestion.reason}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s}
                  className={`flex items-center gap-2 ${s <= step ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s < step ? 'bg-primary text-primary-foreground' : 
                    s === step ? 'bg-primary/20 border-2 border-primary' : 
                    'bg-muted'
                  }`}>
                    {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Select Package */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="font-semibold">Choose Your Package</h3>
                <div className="grid gap-4">
                  {packages.map((pkg) => (
                    <Card 
                      key={pkg.id}
                      className={`cursor-pointer transition-all ${
                        selectedPackage?.id === pkg.id 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPackage(pkg)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{pkg.name}</CardTitle>
                          <Badge variant="secondary" className="gap-1">
                            <Tag className="h-3 w-3" />
                            {pkg.base_discount_percentage}% OFF
                          </Badge>
                        </div>
                        <CardDescription>{pkg.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {pkg.duration_days} {pkg.duration_days === 1 ? 'Night' : 'Nights'}
                          </Badge>
                          {pkg.includes_airport_pickup && (
                            <Badge variant="outline" className="gap-1">
                              <Plane className="h-3 w-3" />
                              Airport Pickup
                            </Badge>
                          )}
                          {pkg.includes_meals && (
                            <Badge variant="outline" className="gap-1">
                              <Utensils className="h-3 w-3" />
                              Meals Included
                            </Badge>
                          )}
                          {pkg.includes_local_transport && (
                            <Badge variant="outline" className="gap-1">
                              <Car className="h-3 w-3" />
                              Local Transport
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => setStep(2)} 
                    disabled={!selectedPackage}
                    className="gap-2"
                  >
                    Select Hotel <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Hotel */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="font-semibold">Choose Nearby Hotel</h3>
                {hotels.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No partner hotels available in {propertyCity} yet.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {hotels.map((hotel) => (
                      <Card 
                        key={hotel.id}
                        className={`cursor-pointer transition-all ${
                          selectedHotel?.id === hotel.id 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedHotel(hotel)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {hotel.images?.[0] && (
                              <img 
                                src={hotel.images[0]} 
                                alt={hotel.name}
                                className="w-24 h-24 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">{hotel.name}</h4>
                                  <div className="flex items-center gap-1 mt-1">
                                    {renderStars(hotel.star_rating)}
                                  </div>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {hotel.locality}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">
                                    ₹{hotel.price_per_night.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">per night</div>
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    {hotel.discount_percentage}% OFF
                                  </Badge>
                                </div>
                              </div>
                              {hotel.amenities && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {amenity}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button 
                    onClick={() => setStep(3)} 
                    disabled={!selectedHotel}
                    className="gap-2"
                  >
                    Schedule Visit <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Schedule & Confirm */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Date Selection */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Check-in Date
                    </h3>
                    <Calendar
                      mode="single"
                      selected={checkInDate}
                      onSelect={(date) => {
                        setCheckInDate(date);
                        // Auto-set visit date to check-in day
                        if (date && !visitDate) {
                          setVisitDate(date);
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                    />
                  </div>

                  {/* Visit Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Visit Details</h3>
                    
                    <div>
                      <Label>Property Visit Date</Label>
                      <Input 
                        type="date" 
                        value={visitDate?.toISOString().split('T')[0] || ''}
                        onChange={(e) => setVisitDate(new Date(e.target.value))}
                        min={checkInDate?.toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <Label>Visit Time</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {availableTimes.map((time) => (
                          <Button
                            key={time}
                            type="button"
                            size="sm"
                            variant={visitTime === time ? "default" : "outline"}
                            onClick={() => setVisitTime(time)}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Guests</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          max="10"
                          value={guests}
                          onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Rooms</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          max="5"
                          value={rooms}
                          onChange={(e) => setRooms(parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Special Requests (Optional)</Label>
                      <Textarea 
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="Any special requirements..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Price Summary */}
                {selectedHotel && selectedPackage && checkInDate && (
                  <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Booking Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>{selectedHotel.name} × {calculateTotalPrice().nights} nights × {rooms} room(s)</span>
                        <span>₹{calculateTotalPrice().hotel.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Bundle Discount ({calculateTotalPrice().discountPercentage}%)</span>
                        <span>-₹{calculateTotalPrice().discount.toLocaleString()}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>₹{calculateTotalPrice().final.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        * Payment to be collected at hotel. This is a reservation confirmation.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!checkInDate || !visitDate || !visitTime || submitting}
                    className="gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
