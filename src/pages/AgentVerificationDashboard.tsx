import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { 
  Camera, MapPin, FileCheck, Upload, CheckCircle2, 
  XCircle, Clock, Navigation as NavigationIcon, Loader2
} from "lucide-react";
import { format } from "date-fns";

interface PropertyVerification {
  id: string;
  property_id: string;
  assigned_at: string;
  status: string;
  verification_type: string;
  location_verified: boolean;
  documents_verified: boolean;
  photos_match: boolean;
  agent_notes: string | null;
  verification_photos: any;
  gps_coordinates: any;
  properties?: {
    id: string;
    title: string;
    address: string;
    locality: string | null;
    city: string | null;
    price: number;
    images: any;
  };
}

const AgentVerificationDashboard = () => {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<PropertyVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVerification, setActiveVerification] = useState<PropertyVerification | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state for active verification
  const [formState, setFormState] = useState({
    locationVerified: false,
    documentsVerified: false,
    photosMatch: false,
    agentNotes: "",
    capturedPhotos: [] as string[],
    gpsCoordinates: null as { lat: number; lng: number } | null,
  });

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get agent ID
      const { data: agentData } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!agentData) {
        toast.error("Agent profile not found");
        return;
      }

      const { data, error } = await supabase
        .from("property_verifications")
        .select(`
          *,
          properties (
            id, title, address, locality, city, price, images
          )
        `)
        .eq("agent_id", agentData.id)
        .in("status", ["assigned", "in_progress"])
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      setVerifications((data || []) as PropertyVerification[]);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      toast.error("Failed to load verifications");
    } finally {
      setLoading(false);
    }
  };

  const startVerification = (verification: PropertyVerification) => {
    setActiveVerification(verification);
    setFormState({
      locationVerified: verification.location_verified || false,
      documentsVerified: verification.documents_verified || false,
      photosMatch: verification.photos_match || false,
      agentNotes: verification.agent_notes || "",
      capturedPhotos: Array.isArray(verification.verification_photos) 
        ? verification.verification_photos 
        : [],
      gpsCoordinates: verification.gps_coordinates || null,
    });
  };

  const captureGPSLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }

    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormState(prev => ({
          ...prev,
          gpsCoordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        }));
        toast.success("GPS location captured!");
        setCapturingLocation(false);
      },
      (error) => {
        toast.error("Failed to get location: " + error.message);
        setCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !activeVerification) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      const fileName = `verifications/${activeVerification.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("property-images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormState(prev => ({
        ...prev,
        capturedPhotos: [...prev.capturedPhotos, ...uploadedUrls],
      }));
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload photos");
    }
  };

  const submitVerification = async () => {
    if (!activeVerification) return;

    if (!formState.gpsCoordinates) {
      toast.error("Please capture GPS location first");
      return;
    }

    if (formState.capturedPhotos.length === 0) {
      toast.error("Please upload at least one verification photo");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("property_verifications")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          location_verified: formState.locationVerified,
          documents_verified: formState.documentsVerified,
          photos_match: formState.photosMatch,
          agent_notes: formState.agentNotes,
          verification_photos: formState.capturedPhotos,
          gps_coordinates: formState.gpsCoordinates,
          final_status: "pending_review",
        })
        .eq("id", activeVerification.id);

      if (error) throw error;

      toast.success("Verification report submitted for admin review!");
      setActiveVerification(null);
      fetchVerifications();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit verification");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16">
        <div className="container-padding max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-gradient">Property Verifications</h1>
            <p className="text-muted-foreground">
              Complete field verification reports for assigned properties
            </p>
          </div>

          {/* Active Verification Form */}
          {activeVerification && (
            <Card className="glass-card mb-8 border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-primary" />
                      Verification In Progress
                    </CardTitle>
                    <CardDescription>
                      {activeVerification.properties?.title}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveVerification(null)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Info */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Address:</span>
                      <p className="font-medium">{activeVerification.properties?.address}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>
                      <p className="font-medium">{formatPrice(activeVerification.properties?.price || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* GPS Capture */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <NavigationIcon className="w-4 h-4" />
                    GPS Location
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Button
                      variant="outline"
                      onClick={captureGPSLocation}
                      disabled={capturingLocation}
                    >
                      {capturingLocation ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4 mr-2" />
                      )}
                      Capture Location
                    </Button>
                    {formState.gpsCoordinates && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ✓ {formState.gpsCoordinates.lat.toFixed(6)}, {formState.gpsCoordinates.lng.toFixed(6)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Photo Upload */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Verification Photos
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photos
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    <span className="text-sm text-muted-foreground">
                      {formState.capturedPhotos.length} photo(s) uploaded
                    </span>
                  </div>
                  {formState.capturedPhotos.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {formState.capturedPhotos.map((photo, idx) => (
                        <img 
                          key={idx} 
                          src={photo} 
                          alt={`Verification ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Verification Checklist */}
                <div className="space-y-4">
                  <Label>Verification Checklist</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="location"
                        checked={formState.locationVerified}
                        onCheckedChange={(checked) => 
                          setFormState(prev => ({ ...prev, locationVerified: !!checked }))
                        }
                      />
                      <Label htmlFor="location" className="font-normal">
                        Property location matches the address
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="documents"
                        checked={formState.documentsVerified}
                        onCheckedChange={(checked) => 
                          setFormState(prev => ({ ...prev, documentsVerified: !!checked }))
                        }
                      />
                      <Label htmlFor="documents" className="font-normal">
                        Builder documents are valid and verified
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="photos"
                        checked={formState.photosMatch}
                        onCheckedChange={(checked) => 
                          setFormState(prev => ({ ...prev, photosMatch: !!checked }))
                        }
                      />
                      <Label htmlFor="photos" className="font-normal">
                        Listed photos accurately represent the property
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Agent Notes */}
                <div className="space-y-3">
                  <Label htmlFor="notes">Verification Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add detailed observations, concerns, or recommendations..."
                    value={formState.agentNotes}
                    onChange={(e) => setFormState(prev => ({ ...prev, agentNotes: e.target.value }))}
                    rows={4}
                  />
                </div>

                {/* Submit */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={submitVerification}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  Submit Verification Report
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Verifications List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : verifications.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground mb-4">No pending verifications</p>
              <Button onClick={() => navigate("/dashboard/agent")}>
                Back to Dashboard
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {verifications.map((verification) => (
                <Card 
                  key={verification.id} 
                  className={`glass-card hover:shadow-lg transition-all ${
                    activeVerification?.id === verification.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {verification.properties?.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {verification.properties?.locality}, {verification.properties?.city}
                        </CardDescription>
                      </div>
                      <Badge className={
                        verification.status === "assigned" 
                          ? "bg-yellow-500" 
                          : "bg-blue-500"
                      }>
                        {verification.status === "assigned" ? (
                          <><Clock className="w-3 h-3 mr-1" />Pending</>
                        ) : (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" />In Progress</>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium capitalize">{verification.verification_type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Assigned:</span>
                        <span className="font-medium">
                          {format(new Date(verification.assigned_at), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">
                          {formatPrice(verification.properties?.price || 0)}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={() => startVerification(verification)}
                      disabled={activeVerification?.id === verification.id}
                    >
                      <FileCheck className="w-4 h-4 mr-2" />
                      {activeVerification?.id === verification.id 
                        ? "Currently Editing" 
                        : "Start Verification"
                      }
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AgentVerificationDashboard;