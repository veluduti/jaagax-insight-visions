import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Clock, Car, User, Phone, MapPin, CheckCircle, XCircle, Star, MessageSquare, Image } from "lucide-react";

interface VisitBooking {
  id: string;
  visit_date: string;
  visit_time: string;
  travel_mode: string;
  status: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  pickup_location: any;
  special_requests: string | null;
  properties: {
    title: string;
    locality: string;
    city: string;
  } | null;
  agents: {
    name: string;
  } | null;
}

interface CompletedVisit extends VisitBooking {
  completed_at: string;
  visit_feedback: {
    id: string;
    rating: number;
    agent_rating: number;
    property_rating: number;
    service_rating: number;
    feedback: string;
    photo_urls: string[];
  }[] | null;
}

const BuilderVisitsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [completedVisits, setCompletedVisits] = useState<CompletedVisit[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingVisits();
    } else {
      fetchCompletedVisits();
    }
  }, [activeTab, user]);

  const fetchPendingVisits = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: builderProperties } = await supabase
        .from("properties")
        .select("id")
        .eq("submitted_by", user.id);

      const propertyIds = builderProperties?.map(p => p.id) || [];

      if (propertyIds.length === 0) {
        setVisits([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city),
          agents (name)
        `)
        .in("property_id", propertyIds)
        .eq("status", "pending_approval")
        .order("visit_date", { ascending: true });

      if (error) throw error;
      setVisits(data || []);
    } catch (error: any) {
      console.error("Error fetching visits:", error);
      toast.error("Failed to load pending visits");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedVisits = async () => {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: builderProperties } = await supabase
        .from("properties")
        .select("id")
        .eq("submitted_by", user.id);

      const propertyIds = builderProperties?.map(p => p.id) || [];

      if (propertyIds.length === 0) {
        setCompletedVisits([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city),
          agents (name),
          visit_feedback (
            id,
            rating,
            agent_rating,
            property_rating,
            service_rating,
            feedback,
            photo_urls
          )
        `)
        .in("property_id", propertyIds)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error) throw error;
      setCompletedVisits(data || []);
    } catch (error: any) {
      console.error("Error fetching completed visits:", error);
      toast.error("Failed to load completed visits");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("approve-visit", {
        body: {
          bookingId,
          approved: true,
          notes
        }
      });

      if (error) throw error;

      toast.success("Visit approved successfully! WhatsApp notification sent to buyer.");
      setNotes("");
      setSelectedVisit(null);
      fetchPendingVisits();
    } catch (error: any) {
      console.error("Error approving visit:", error);
      toast.error(error.message || "Failed to approve visit");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("approve-visit", {
        body: {
          bookingId,
          approved: false,
          rejectionReason
        }
      });

      if (error) throw error;

      toast.success("Visit request declined. Buyer has been notified.");
      setRejectionReason("");
      setSelectedVisit(null);
      fetchPendingVisits();
    } catch (error: any) {
      console.error("Error rejecting visit:", error);
      toast.error(error.message || "Failed to decline visit");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Visit Approvals</h1>
          <p className="text-muted-foreground">Review and approve property visit requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "pending" ? "default" : "outline"}
            onClick={() => setActiveTab("pending")}
          >
            Pending Approvals ({visits.length})
          </Button>
          <Button
            variant={activeTab === "completed" ? "default" : "outline"}
            onClick={() => setActiveTab("completed")}
          >
            Completed Visits ({completedVisits.length})
          </Button>
        </div>

        {/* Pending Tab */}
        {activeTab === "pending" && (
          <>
            {visits.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending visit requests</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {visits.map((visit) => (
                  <Card key={visit.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          {visit.properties?.title || "Property"}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {visit.properties?.locality}, {visit.properties?.city}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        Pending Approval
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm">{formatDate(visit.visit_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm">{visit.visit_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-sm">{visit.user_name}</span>
                      </div>
                      {visit.user_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary" />
                          <span className="text-sm">{visit.user_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-primary" />
                        <span className="text-sm capitalize">{visit.travel_mode || "Self"}</span>
                      </div>
                      {visit.agents && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-sm">Agent: {visit.agents.name}</span>
                        </div>
                      )}
                    </div>

                    {visit.special_requests && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Special Requests:</p>
                        <p className="text-sm text-muted-foreground">{visit.special_requests}</p>
                      </div>
                    )}

                    {selectedVisit === visit.id ? (
                      <div className="space-y-4 mt-4 pt-4 border-t">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Approval Notes (Optional)</label>
                          <Textarea
                            placeholder="Add any notes or instructions for the visitor..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(visit.id)}
                            disabled={processing}
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {processing ? "Processing..." : "Confirm Approval"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedVisit(null);
                              setNotes("");
                              setRejectionReason("");
                            }}
                            disabled={processing}
                          >
                            Cancel
                          </Button>
                        </div>

                        <div className="pt-4 border-t">
                          <label className="text-sm font-medium mb-2 block">Or Decline Request</label>
                          <Textarea
                            placeholder="Reason for declining (required)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mb-2"
                          />
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(visit.id)}
                            disabled={processing || !rejectionReason.trim()}
                            className="w-full"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline Visit
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          onClick={() => setSelectedVisit(visit.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedVisit(visit.id)}
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Completed Tab */}
        {activeTab === "completed" && (
          <>
            {completedVisits.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No completed visits yet</h3>
                <p className="text-muted-foreground">Completed visits with feedback will appear here</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {completedVisits.map((visit) => {
                  const feedback = visit.visit_feedback?.[0];
                  return (
                    <Card key={visit.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">
                            {visit.properties?.title || "Property"}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {visit.properties?.locality}, {visit.properties?.city}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-sm">{formatDate(visit.visit_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-sm">{visit.user_name}</span>
                        </div>
                        {visit.agents && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-sm">Agent: {visit.agents.name}</span>
                          </div>
                        )}
                      </div>

                      {feedback ? (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Buyer Feedback
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">Overall Rating</p>
                              <div className="flex items-center gap-1">
                                {renderStars(feedback.rating)}
                                <span className="ml-2 font-semibold">{feedback.rating}/5</span>
                              </div>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">Property Rating</p>
                              <div className="flex items-center gap-1">
                                {renderStars(feedback.property_rating)}
                                <span className="ml-2 font-semibold">{feedback.property_rating}/5</span>
                              </div>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">Agent Rating</p>
                              <div className="flex items-center gap-1">
                                {renderStars(feedback.agent_rating)}
                                <span className="ml-2 font-semibold">{feedback.agent_rating}/5</span>
                              </div>
                            </div>
                          </div>

                          {feedback.feedback && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">Comments</p>
                              <p className="text-sm">{feedback.feedback}</p>
                            </div>
                          )}

                          {feedback.photo_urls && feedback.photo_urls.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                <Image className="w-4 h-4" />
                                Photos ({feedback.photo_urls.length})
                              </p>
                              <div className="flex gap-2 overflow-x-auto">
                                {feedback.photo_urls.map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt={`Visit photo ${idx + 1}`}
                                    className="w-24 h-24 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground italic">
                            No feedback submitted yet
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BuilderVisitsDashboard;