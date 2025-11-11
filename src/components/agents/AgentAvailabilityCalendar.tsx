import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";

interface AgentAvailabilityCalendarProps {
  agentName: string;
  agentId: number;
}

const AgentAvailabilityCalendar = ({ agentName, agentId }: AgentAvailabilityCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [meetingType, setMeetingType] = useState<string>("");

  // Mock available time slots - in production, fetch from availability table
  const availableSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", 
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
  ];

  const meetingTypes = [
    { value: "property_viewing", label: "Property Viewing" },
    { value: "consultation", label: "General Consultation" },
    { value: "documentation", label: "Documentation Review" },
    { value: "market_analysis", label: "Market Analysis Discussion" }
  ];

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !meetingType) {
      toast.error("Please select date, time, and meeting type");
      return;
    }

    // In production, this would save to database
    toast.success(
      `Meeting booked with ${agentName} on ${format(selectedDate, "PPP")} at ${selectedTime}`,
      {
        description: "You'll receive a confirmation email shortly"
      }
    );

    // Reset form
    setSelectedDate(undefined);
    setSelectedTime("");
    setMeetingType("");
  };

  // Disable past dates and weekends
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = date.getDay();
    return date < today || day === 0; // Disable past dates and Sundays
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
    >
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Book a Meeting
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Schedule a consultation or property viewing with {agentName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meeting Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting Purpose</label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger>
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                {meetingTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-md border"
              />
            </div>
            {selectedDate && (
              <div className="text-center">
                <Badge variant="secondary" className="text-sm">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </Badge>
              </div>
            )}
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Available Time Slots
              </label>
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedTime === slot ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(slot)}
                    className="w-full"
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Booking Summary */}
          {selectedDate && selectedTime && meetingType && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Booking Summary
              </h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Type: </span>
                  <span className="font-medium">
                    {meetingTypes.find(t => t.value === meetingType)?.label}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium">{format(selectedDate, "PPP")}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Time: </span>
                  <span className="font-medium">{selectedTime}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">With: </span>
                  <span className="font-medium">{agentName}</span>
                </p>
              </div>
            </div>
          )}

          {/* Book Button */}
          <Button 
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime || !meetingType}
            className="w-full"
            size="lg"
          >
            Confirm Booking
          </Button>

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center">
            You'll receive a confirmation email with meeting details. 
            Agent will call you 15 minutes before the scheduled time.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AgentAvailabilityCalendar;
