import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Send, ArrowLeft, Loader2 } from "lucide-react";

const AgentStoryUpload = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get agent ID
      const { data: agentData } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!agentData) {
        toast.error("Agent profile not found");
        navigate("/dashboard/agent");
        return;
      }

      setAgentId(agentData.id);

      // Fetch booking
      const { data: bookingData, error } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city)
        `)
        .eq("id", bookingId)
        .eq("agent_id", agentData.id)
        .single();

      if (error) throw error;
      setBooking(bookingData);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to load visit details");
      navigate("/dashboard/agent");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${bookingId}/${Date.now()}.${fileExt}`;
    const filePath = `visit-stories/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('verification-docs')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('verification-docs')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (type: 'photo' | 'text') => {
    if (!agentId || !bookingId) return;

    if (type === 'photo' && !selectedFile) {
      toast.error("Please select an image");
      return;
    }

    if (type === 'text' && !content.trim()) {
      toast.error("Please enter some text");
      return;
    }

    setUploading(true);

    try {
      let imageUrl = null;
      
      if (type === 'photo' && selectedFile) {
        imageUrl = await uploadToStorage(selectedFile);
      }

      const { error } = await supabase
        .from("visit_story_updates")
        .insert({
          booking_id: bookingId,
          agent_id: agentId,
          update_type: type,
          content: content.trim() || null,
          image_url: imageUrl,
        });

      if (error) throw error;

      toast.success("Update shared successfully!");
      
      // Reset form
      setContent("");
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to share update");
    } finally {
      setUploading(false);
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow py-8">
        <div className="container-padding max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/agent/visits")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Visits
          </Button>

          {/* Visit Info */}
          <Card className="glass-card p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Share Visit Update</h1>
                <p className="text-muted-foreground">
                  {booking.properties?.title}
                </p>
              </div>
              <Badge 
                className={
                  booking.status === 'in_progress' 
                    ? 'bg-blue-500' 
                    : 'bg-primary'
                }
              >
                {booking.status.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
          </Card>

          {/* Upload Photo */}
          <Card className="glass-card p-6 mb-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Share Photo
            </h2>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {preview ? (
              <div className="mb-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-64 object-cover rounded-lg"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-2 w-full"
                >
                  Remove Photo
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-dashed"
              >
                <ImageIcon className="w-8 h-8 mb-2" />
                <span>Choose Photo</span>
              </Button>
            )}

            <Textarea
              placeholder="Add a caption (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mb-4"
              rows={3}
            />

            <Button
              onClick={() => handleSubmit('photo')}
              disabled={!selectedFile || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Share Photo
                </>
              )}
            </Button>
          </Card>

          {/* Text Update */}
          <Card className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Share Text Update</h2>
            
            <Textarea
              placeholder="Share an update about the visit..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mb-4"
              rows={4}
            />

            <Button
              onClick={() => handleSubmit('text')}
              disabled={!content.trim() || uploading}
              variant="outline"
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Share Update
                </>
              )}
            </Button>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Updates are visible to the buyer and builder in real-time
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AgentStoryUpload;
