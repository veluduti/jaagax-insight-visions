import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string; // e.g. "logos", "hero", "brochures"
  accept?: string; // e.g. "image/*" or "application/pdf"
  placeholder?: string;
  preview?: "image" | "file";
}

/**
 * Single-file uploader: click to pick from device → uploads to
 * `property-images` bucket → stores public URL in `value`.
 * Also supports manual URL paste for backwards compatibility.
 */
const FileUploadField = ({
  label,
  value,
  onChange,
  folder,
  accept = "image/*",
  placeholder = "https://… or click upload",
  preview = "image",
}: FileUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userPart = user?.id || "public";
      const ext = file.name.split(".").pop() || "bin";
      const path = `builder-profiles/${userPart}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("property-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
      onChange(pub.publicUrl);
      toast({ title: "Uploaded", description: file.name });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handlePick}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {value && preview === "image" && (
        <div className="relative inline-block mt-2 group">
          <img
            src={value}
            alt={label}
            className="w-24 h-24 object-cover rounded-lg border border-border"
            onError={(e) => (e.currentTarget.style.display = "none")} loading="lazy" decoding="async" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {value && preview === "file" && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <a href={value} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[260px]">
            {value.split("/").pop()}
          </a>
          <button type="button" onClick={() => onChange("")} className="text-destructive hover:underline">
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploadField;
