import { Sparkles, Construction } from "lucide-react";

// Stub component - advertisements and saved_advertisements tables not yet created
const ReelsFeed = () => {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="text-center p-8">
        <Construction className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Promotions Coming Soon</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          The TikTok-style promotions feed is being set up. 
          Check back soon to discover amazing property deals!
        </p>
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Featuring AI-matched recommendations</span>
        </div>
      </div>
    </div>
  );
};

export default ReelsFeed;
