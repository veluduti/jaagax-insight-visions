import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, CheckCircle } from "lucide-react";

const VisitVerify = () => {
  const navigate = useNavigate();
  const [bookingId, setBookingId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingId.trim() || !otpCode.trim()) {
      toast.error("Please enter both Booking ID and OTP");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-visit", {
        body: { bookingId, otpCode }
      });

      if (error) throw error;

      if (data.success) {
        setVerified(true);
        toast.success("Visit verified successfully! Visit started.");
        setTimeout(() => {
          navigate(`/visit/live/${bookingId}`);
        }, 2000);
      } else {
        toast.error(data.error || "Invalid OTP or Booking ID");
      }
    } catch (error: any) {
      console.error("Error verifying visit:", error);
      toast.error(error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                {verified ? (
                  <CheckCircle className="w-8 h-8 text-primary" />
                ) : (
                  <Shield className="w-8 h-8 text-primary" />
                )}
              </div>
              <h1 className="text-2xl font-bold mb-2">
                {verified ? "Visit Verified!" : "Verify Visit"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {verified 
                  ? "Visit has been started successfully"
                  : "Enter the booking details to start the visit"
                }
              </p>
            </div>

            {!verified && (
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label htmlFor="bookingId" className="block text-sm font-medium mb-2">
                    Booking ID
                  </label>
                  <Input
                    id="bookingId"
                    type="text"
                    placeholder="Enter booking ID"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="otpCode" className="block text-sm font-medium mb-2">
                    OTP Code
                  </label>
                  <Input
                    id="otpCode"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify & Start Visit"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  The visitor should show you their QR code or OTP at the gate
                </p>
              </form>
            )}

            {verified && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Redirecting to live tracking...
                </p>
                <Button onClick={() => navigate(`/visit/live/${bookingId}`)}>
                  View Live Tracking
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VisitVerify;
