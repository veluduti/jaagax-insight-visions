import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import LocationSelector from "@/components/location/LocationSelector";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * Standalone screen for picking a location. Reachable via /select-location.
 * After selection, redirects to ?next= or /search.
 */
const SelectLocationPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/search";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pt-28 pb-16 container-padding flex items-center justify-center">
        <LocationSelector showBack onSelected={() => navigate(next, { replace: true })} />
      </main>
      <Footer />
    </div>
  );
};

export default SelectLocationPage;
