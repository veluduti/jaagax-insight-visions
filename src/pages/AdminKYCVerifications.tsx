import Navigation from "@/components/Navigation";
import KYCReviewQueue from "@/components/admin/KYCReviewQueue";

export default function AdminKYCVerifications() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5">
      <Navigation />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">KYC Verifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve seller identity submissions.</p>
        </div>
        <KYCReviewQueue />
      </div>
    </div>
  );
}
