import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
  name?: string;
};

/**
 * Agents do not upload personal photos. They upload the official
 * JAAGAX-provided profile template (downloaded from JAAGAX) as their
 * profile picture.
 */
export default function AgentTemplateUpload({ value, onChange, disabled, name }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Please sign in first");
      const safe = file.name.replace(/[^\w.-]/g, "_");
      const path = `${uid}/jaagax-template-${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      onChange(data?.signedUrl || path);
      toast.success("JAAGAX template uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={value || undefined} />
          <AvatarFallback>{(name || "A").charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload JAAGAX Template
          </Button>
          <p className="text-[11px] text-muted-foreground max-w-[260px]">
            Download the official profile template from JAAGAX and upload it here. Personal photos are not allowed.
          </p>
        </div>
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}
