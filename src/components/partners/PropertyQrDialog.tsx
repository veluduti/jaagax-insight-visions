import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { propertyQrUrl } from "@/lib/propertyQr";

export default function PropertyQrDialog({ open, onOpenChange, name, reference }: { open: boolean; onOpenChange: (o: boolean) => void; name: string; reference: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const url = propertyQrUrl(reference);
  const download = () => {
    const canvas = ref.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${reference}-qr.png`;
    a.click();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Property QR code</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3 text-center">
          <div ref={ref} className="rounded-lg border bg-background p-3"><QRCodeCanvas value={url} size={220} level="M" includeMargin /></div>
          <strong>{name}</strong>
          <span className="text-sm text-primary">{reference}</span>
          <span className="text-xs text-muted-foreground break-all">{url}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={download}><Download className="h-4 w-4 mr-1" />Download</Button>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }}><Copy className="h-4 w-4 mr-1" />Copy link</Button>
          </div>
          <p className="text-xs text-muted-foreground">Scanning opens this property’s details page once it is live.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
