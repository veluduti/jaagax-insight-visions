import Navigation from "@/components/Navigation";
import PriceDropQueue from "@/components/admin/PriceDropQueue";

export default function AdminPriceDrops() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5">
      <Navigation />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Price Drop Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review seller price-reduction requests. Approval activates the "Price Reduced" ribbon on the listing.
          </p>
        </div>
        <PriceDropQueue />
      </div>
    </div>
  );
}
