import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function ReferralLink({ userId }: { userId: string }) {
  const link = `${window.location.origin}/?ref=${userId}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
          <Share2 className="h-4 w-4 text-emerald-400" /> Refer & earn
        </div>
        <p className="text-xs text-muted-foreground mb-3">Share your link — earn wallet credits when a friend joins and posts.</p>
        <div className="flex gap-2">
          <Input value={link} readOnly className="text-xs" />
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
