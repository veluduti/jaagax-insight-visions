import { Button } from "@/components/ui/button";
import { 
  Share2, 
  Download, 
  Printer, 
  Flag,
  ExternalLink 
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ReportListingDialog from "./ReportListingDialog";

interface PropertyActionsProps {
  propertyId: string;
  propertyTitle: string;
  propertyType: "property" | "project";
}

const PropertyActions = ({ propertyId, propertyTitle, propertyType }: PropertyActionsProps) => {
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: propertyTitle,
          text: `Check out this ${propertyType} on JaagaX`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success("Opening print dialog...");
  };

  const handleDownloadBrochure = async () => {
    toast.info("Brochure download will be available soon");
    // In production, this would trigger a PDF download
    // const { data } = await supabase.storage
    //   .from('brochures')
    //   .download(`${propertyType}_${propertyId}.pdf`);
  };

  const handleReport = () => {
    toast.info("Thank you! Our team will review this property.");
    // In production, this would open a report form
  };

  const handleViewOnMap = () => {
    const url = `/map?${propertyType}=${propertyId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleShare} variant="outline" size="sm" className="gap-2">
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      <Button onClick={handleDownloadBrochure} variant="outline" size="sm" className="gap-2">
        <Download className="h-4 w-4" />
        Brochure
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            More Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Property
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewOnMap}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Map
          </DropdownMenuItem>
          {propertyType === "property" && (
            <ReportListingDialog
              propertyId={propertyId}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive cursor-pointer">
                  <Flag className="h-4 w-4 mr-2" />
                  Report Listing
                </DropdownMenuItem>
              }
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default PropertyActions;
