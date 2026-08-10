import Navigation from "@/components/Navigation";
import PricingSettingsPanel from "@/components/admin/PricingSettingsPanel";

export default function AdminPricingSettings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PricingSettingsPanel />
      </div>
    </div>
  );
}
