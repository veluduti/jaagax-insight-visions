import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles, TrendingUp, MapPin, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StoryItem {
  id: string;
  title: string;
  image: string;
  type: 'hot_deal' | 'new_launch' | 'price_drop' | 'trending';
  label: string;
}

interface StoryPreviewProps {
  onStoryClick: (index: number) => void;
}

const StoryPreview = ({ onStoryClick }: StoryPreviewProps) => {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [viewedStories, setViewedStories] = useState<string[]>([]);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data } = await supabase
      .from('advertisements')
      .select('id, title, images, featured, offer_text')
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .limit(8);

    if (data) {
      const storyItems: StoryItem[] = data.map((ad, i) => ({
        id: ad.id,
        title: ad.title.split(' ').slice(0, 3).join(' '),
        image: ad.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
        type: ad.featured ? 'hot_deal' : ad.offer_text ? 'price_drop' : i % 2 === 0 ? 'new_launch' : 'trending',
        label: ad.featured ? '🔥 Hot' : ad.offer_text ? '💰 Deal' : i % 2 === 0 ? '✨ New' : '📈 Trending'
      }));
      setStories(storyItems);
    }
  };

  const handleStoryClick = (id: string, index: number) => {
    if (!viewedStories.includes(id)) {
      setViewedStories([...viewedStories, id]);
    }
    onStoryClick(index);
  };

  const getGradient = (type: string) => {
    switch (type) {
      case 'hot_deal': return 'from-orange-500 via-red-500 to-pink-500';
      case 'new_launch': return 'from-blue-500 via-purple-500 to-pink-500';
      case 'price_drop': return 'from-green-500 via-emerald-500 to-teal-500';
      case 'trending': return 'from-amber-500 via-orange-500 to-red-500';
      default: return 'from-primary via-primary to-primary';
    }
  };

  if (stories.length === 0) return null;

  return (
    <div className="absolute top-16 left-0 right-0 z-20 px-4 py-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {stories.map((story, index) => (
          <motion.button
            key={story.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleStoryClick(story.id, index)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
          >
            <div className={cn(
              "p-0.5 rounded-full bg-gradient-to-br",
              viewedStories.includes(story.id) ? "from-muted to-muted" : getGradient(story.type)
            )}>
              <div className="p-0.5 bg-black rounded-full">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <span className="text-white text-[10px] font-medium max-w-16 truncate">
              {story.label}
            </span>
          </motion.button>
        ))}
        
        {/* View All Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: stories.length * 0.05 }}
          className="flex-shrink-0 flex flex-col items-center gap-1.5"
        >
          <div className="w-[68px] h-[68px] rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <ChevronRight className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium">View All</span>
        </motion.button>
      </div>
    </div>
  );
};

export default StoryPreview;
