import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MultiFileUploadFieldProps {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  accept?: string;
  placeholder?: string;
}

/**
 * Multi-file uploader for galleries (project images, gallery,
 * clubhouse, etc). Lets the user EITHER pick multiple files from
 * device OR paste a URL. Uploaded files go to `property-images`.
 */
const MultiFileUploadField = ({
  label,
  values,
  onChange,
  folder,
  accept = "image/*",
  placeholder = "Paste image URL and press Enter",
}: MultiFileUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const { toast } = useToast();

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setUrlInput("");
  };

  const removeAt = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userPart = user?.id || "public";
      const uploaded: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `builder-profiles/${userPart}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("property-images")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
          toast({ title: "Upload failed", description: file.name, variant: "destructive" });
          continue;
        }
        const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      if (uploaded.length) {
        onChange([...values, ...uploaded]);
        toast({ title: "Uploaded", description: `${uploaded.length} file(s) added` });
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
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
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addUrl}>
          Add
        </Button>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map((url, i) => (
            <div key={`${url}-${i}`} className="relative group">
              <img
                src={url}
                alt=""
                className="w-20 h-20 object-cover rounded-lg border border-border"
                onError={(e) = loading="lazy" decoding="async" /> (e.currentTarget.style.display = "none")}
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiFileUploadField;
