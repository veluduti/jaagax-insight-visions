import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import LiveHyperGuestHotels from "@/components/hotels/LiveHyperGuestHotels";

export default function HyperGuestHotels() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation hotelDiscovery />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 lg:px-8">
        <Button asChild variant="ghost" className="mb-5"><Link to="/hotels"><ArrowLeft className="mr-2 h-4 w-4" />All hotels</Link></Button>
        <LiveHyperGuestHotels />
      </main>
      <Footer />
    </div>
  );
}
