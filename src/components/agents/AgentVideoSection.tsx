import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Play, TrendingUp, Home } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AgentVideoSectionProps {
  agentName: string;
}

const AgentVideoSection = ({ agentName }: AgentVideoSectionProps) => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Mock video data - in production, these would come from database
  const videos = [
    {
      id: "1",
      title: "Agent Introduction",
      thumbnail: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
      duration: "2:30",
      type: "introduction",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: "2",
      title: "Luxury Villa Tour - Gachibowli",
      thumbnail: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400",
      duration: "5:45",
      type: "property_tour",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: "3",
      title: "Market Update - Q4 2024",
      thumbnail: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=400",
      duration: "3:15",
      type: "market_update",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: "4",
      title: "Penthouse Showcase - Jubilee Hills",
      thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400",
      duration: "4:20",
      type: "property_tour",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "introduction":
        return <Video className="h-4 w-4" />;
      case "property_tour":
        return <Home className="h-4 w-4" />;
      case "market_update":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "introduction":
        return <Badge variant="secondary">Introduction</Badge>;
      case "property_tour":
        return <Badge className="bg-blue-600">Property Tour</Badge>;
      case "market_update":
        return <Badge className="bg-purple-600">Market Update</Badge>;
      default:
        return <Badge variant="outline">Video</Badge>;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Video Gallery
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Watch {agentName}'s property tours and market insights
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedVideo(video.embedUrl)}
                >
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-primary ml-1" fill="currentColor" />
                      </div>
                    </div>
                    {/* Duration Badge */}
                    <Badge className="absolute bottom-3 right-3 bg-black/80 text-white">
                      {video.duration}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(video.type)}
                    </div>
                    <h4 className="font-semibold line-clamp-2">{video.title}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Video Player</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="aspect-video w-full">
              <iframe
                src={selectedVideo}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgentVideoSection;
