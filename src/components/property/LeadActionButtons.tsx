import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function LeadActionButtons({
  propertyId,
  ownerPhone,
  className,
}: {
  propertyId: string;
  ownerPhone?: string | null;
  className?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const log = async (source: "call" | "whatsapp" | "inquiry") => {
    setBusy(source);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.functions.invoke("create-property-lead", {
        body: {
          property_id: propertyId,
          source,
          lead_name: user?.user_metadata?.full_name ?? null,
          lead_email: user?.email ?? null,
          lead_phone: user?.user_metadata?.phone ?? null,
        },
      });
      if (error) throw error;
      toast({ title: `${source === "inquiry" ? "Enquiry" : source.toUpperCase()} sent` });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const onCall = async () => {
    await log("call");
    if (ownerPhone) window.location.href = `tel:${ownerPhone}`;
  };
  const onWhatsApp = async () => {
    await log("whatsapp");
    if (ownerPhone) window.open(`https://wa.me/${ownerPhone.replace(/\D/g, "")}`, "_blank");
  };
  const onInquiry = () => log("inquiry");

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Button size="sm" variant="outline" disabled={busy === "call"} onClick={onCall}><Phone className="w-4 h-4 mr-1" />Call</Button>
      <Button size="sm" variant="outline" disabled={busy === "whatsapp"} onClick={onWhatsApp}><MessageCircle className="w-4 h-4 mr-1" />WhatsApp</Button>
      <Button size="sm" disabled={busy === "inquiry"} onClick={onInquiry}><Mail className="w-4 h-4 mr-1" />Enquire</Button>
    </div>
  );
}
