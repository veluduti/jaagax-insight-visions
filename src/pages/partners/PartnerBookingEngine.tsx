import { useState } from "react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function PartnerBookingEngine() {
  const { loading, hotelId, hotelName } = usePartnerHotel();
  const [copied, setCopied] = useState("");

  if (loading || !hotelId) return <div className="p-8"><Loader2 className="animate-spin h-4 w-4" /></div>;

  const origin = window.location.origin;
  const bookingUrl = `${origin}/book/${hotelId}`;
  const widgetSnippet = `<script async src="${origin}/widget.js" data-jaagax-hotel="${hotelId}"></script>\n<div data-jaagax-book></div>`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key); toast.success("Copied");
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Direct Booking Engine</h1>
          <p className="text-sm text-muted-foreground">Zero-commission bookings via your own booking page or website widget.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Your booking page</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Share this link on social media, WhatsApp, and Google Business Profile.</p>
            <div className="flex gap-2">
              <Input readOnly value={bookingUrl} />
              <Button variant="outline" onClick={() => copy(bookingUrl, "url")}><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" asChild><a href={bookingUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Embed on your website</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Paste this snippet in your site — it opens the booking flow in a modal.</p>
            <pre className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs overflow-x-auto">{widgetSnippet}</pre>
            <Button variant="outline" onClick={() => copy(widgetSnippet, "snip")}><Copy className="h-4 w-4 mr-2" /> Copy snippet</Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">Bookings from your direct channel are commission-free and appear in Reservations with source = <span className="font-mono">direct</span>.</p>
      </div>
    </div>
  );
}
