import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { VisitSchedulingWizard } from "@/components/visit/VisitSchedulingWizard";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const VisitSchedule = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) return;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', parseInt(propertyId))
        .single();

      if (error) {
        console.error('Error fetching property:', error);
      } else {
        setProperty(data);
      }
      setLoading(false);
    };

    fetchProperty();
  }, [propertyId]);

  const handleSuccess = (bookingId: string) => {
    navigate(`/visit/confirm/${bookingId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Property not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Property
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Schedule Your Visit</h1>
            <p className="text-xl text-muted-foreground">{property.title}</p>
            <p className="text-sm text-muted-foreground">
              {property.locality}, {property.city}
            </p>
          </div>

          <VisitSchedulingWizard
            propertyId={parseInt(propertyId!)}
            propertyTitle={property.title}
            locality={property.locality}
            city={property.city}
            onSuccess={handleSuccess}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VisitSchedule;