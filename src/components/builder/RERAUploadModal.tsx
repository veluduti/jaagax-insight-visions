import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2 } from "lucide-react";

interface RERAUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export default function RERAUploadModal({ open, onOpenChange, projects, onSuccess }: RERAUploadModalProps) {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [reraNumber, setReraNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Validate file type
      if (!selectedFile.type.includes('pdf') && !selectedFile.type.includes('image')) {
        toast.error("Please upload a PDF or image file");
        return;
      }
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!selectedProject || !reraNumber) {
      toast.error("Please fill all required fields");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Update project with RERA information
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          rera_id: reraNumber,
        })
        .eq('id', selectedProject);

      if (updateError) throw updateError;

      toast.success("RERA information updated successfully!");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedProject("");
      setReraNumber("");
      setFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to update RERA information");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload RERA Document
          </DialogTitle>
          <DialogDescription>
            Upload your RERA registration document for project verification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project">Select Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rera">RERA Registration Number</Label>
            <Input
              id="rera"
              placeholder="P12345678901234"
              value={reraNumber}
              onChange={(e) => setReraNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Upload Document (PDF or Image) - Optional</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && (
                <FileText className="h-5 w-5 text-green-600" />
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Update RERA Info
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
