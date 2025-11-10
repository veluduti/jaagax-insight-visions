import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ExternalLink, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const documentCategories = [
  {
    title: "Property Submission Guidelines",
    description: "Learn how to submit properties for verification",
    docs: [
      { name: "Quick Start Guide", status: "available", link: "#" },
      { name: "Photo Requirements", status: "available", link: "#" },
      { name: "Pricing Guidelines", status: "available", link: "#" },
    ]
  },
  {
    title: "RERA Compliance",
    description: "Understanding RERA requirements and verification",
    docs: [
      { name: "RERA Registration Process", status: "available", link: "#" },
      { name: "Document Checklist", status: "available", link: "#" },
      { name: "Compliance FAQs", status: "available", link: "#" },
    ]
  },
  {
    title: "Dashboard Features",
    description: "Make the most of your builder dashboard",
    docs: [
      { name: "Performance Analytics", status: "available", link: "#" },
      { name: "AI Forecasting Tools", status: "available", link: "#" },
      { name: "Lead Management", status: "available", link: "#" },
    ]
  },
  {
    title: "Best Practices",
    description: "Tips to maximize visibility and sales",
    docs: [
      { name: "Writing Effective Descriptions", status: "available", link: "#" },
      { name: "SEO Optimization", status: "available", link: "#" },
      { name: "Responding to Leads", status: "available", link: "#" },
    ]
  }
];

export default function DocumentationModal({ open, onOpenChange }: DocumentationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documentation & Resources
          </DialogTitle>
          <DialogDescription>
            Comprehensive guides and resources for builders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {documentCategories.map((category, idx) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1">{category.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                
                <div className="space-y-2">
                  {category.docs.map((doc, docIdx) => (
                    <div 
                      key={docIdx}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{doc.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-primary/10 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Need help?</strong> Contact our support team at{" "}
            <a href="mailto:builder-support@jaagax.com" className="text-primary hover:underline">
              builder-support@jaagax.com
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
