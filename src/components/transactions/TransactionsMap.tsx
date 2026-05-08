import { memo, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { InsightDrawer } from "./InsightDrawer";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHR4Y3B1ZGcxMnprMmpsYjIwOG10cXh6In0.HuoJqW9PJdDjLK5O5LJRAQ";

interface Transaction {
  id: string;
  lat: number;
  lng: number;
  price: number;
  locality: string;
  date: string;
  verified: boolean;
  trustScore: number;
}

interface TransactionsMapProps {
  transactions: Transaction[];
  onTimeRangeChange?: (monthIndex: number) => void;
}

export const TransactionsMap = ({ transactions, onTimeRangeChange }: TransactionsMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(5); // Start at most recent
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTrustLayer, setShowTrustLayer] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [currentInsight, setCurrentInsight] = useState("");

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map centered on India (Hyderabad/Vijayawada region)
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [78.4867, 17.385], // Hyderabad coordinates
      zoom: 10,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    map.current.on("style.load", () => {
      // Add custom styling for neon glow effect
      if (map.current) {
        map.current.setFog({
          color: "rgb(15, 17, 21)",
          "high-color": "rgb(0, 208, 132)",
          "horizon-blend": 0.1,
        });
      }
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, []);

  // Update markers based on current month
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Filter transactions up to current month
    const filteredTransactions = transactions.filter((_, idx) => {
      const txMonth = idx % 6;
      return txMonth <= currentMonth;
    });

    // Add new markers with animation
    filteredTransactions.forEach((tx, idx) => {
      const el = document.createElement("div");
      el.className = "transaction-marker";
      el.style.cssText = `
        width: ${showTrustLayer ? 16 + (tx.trustScore / 10) : 16}px;
        height: ${showTrustLayer ? 16 + (tx.trustScore / 10) : 16}px;
        background: radial-gradient(circle, ${
          tx.verified
            ? "rgba(0, 208, 132, 0.8)"
            : "rgba(239, 68, 68, 0.8)"
        } 0%, transparent 70%);
        border: 2px solid ${tx.verified ? "#00D084" : "#ef4444"};
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 ${tx.trustScore / 2}px ${
          tx.verified ? "#00D084" : "#ef4444"
        };
        animation: pulse 2s ease-in-out infinite;
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-3 min-w-[200px]">
          <div class="font-bold text-lg mb-2">${tx.locality}</div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Price:</span>
              <span class="font-semibold">₹${(tx.price / 100000).toFixed(2)}L</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Date:</span>
              <span>${tx.date}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Trust Score:</span>
              <span class="font-semibold text-primary">${tx.trustScore}/100</span>
            </div>
            <div class="mt-2">
              ${tx.verified 
                ? '<span class="text-xs bg-primary/20 text-primary px-2 py-1 rounded">✓ Verified</span>'
                : '<span class="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">Pending</span>'
              }
            </div>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([tx.lng, tx.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);

      // Animate marker entry
      setTimeout(() => {
        el.style.animation = "markerEntry 0.5s ease-out";
      }, idx * 50);
    });

    // Update insight based on current month
    updateInsight(currentMonth, filteredTransactions);
    onTimeRangeChange?.(currentMonth);
  }, [currentMonth, showTrustLayer, transactions]);

  const updateInsight = (month: number, txs: Transaction[]) => {
    const monthName = months[month];
    const avgPrice = txs.length > 0 
      ? txs.reduce((sum, t) => sum + t.price, 0) / txs.length 
      : 0;
    const verifiedCount = txs.filter(t => t.verified).length;
    const verifiedPercent = txs.length > 0 ? (verifiedCount / txs.length * 100).toFixed(0) : 0;

    setCurrentInsight(
      `${monthName}: ${txs.length} transactions recorded. Avg price: ₹${(avgPrice / 100000).toFixed(2)}L. ${verifiedPercent}% verified properties.`
    );
  };

  // Playback control
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentMonth(prev => {
        if (prev >= 5) {
          setIsPlaying(false);
          return 5;
        }
        return prev + 1;
      });
    }, 2000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentMonth(0);
  };

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden glass-panel">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Control Panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-panel p-4 rounded-xl min-w-[500px]">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            variant="outline"
            onClick={handlePlayPause}
            className="h-10 w-10"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1">
            <Slider
              value={[currentMonth]}
              onValueChange={([value]) => {
                setCurrentMonth(value);
                setIsPlaying(false);
              }}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              {months.map((month, idx) => (
                <span key={month} className={idx === currentMonth ? "text-primary font-bold" : ""}>
                  {month}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={playbackSpeed === 0.5 ? "default" : "outline"}
              onClick={() => setPlaybackSpeed(0.5)}
              className="h-8 px-2 text-xs"
            >
              0.5x
            </Button>
            <Button
              size="sm"
              variant={playbackSpeed === 1 ? "default" : "outline"}
              onClick={() => setPlaybackSpeed(1)}
              className="h-8 px-2 text-xs"
            >
              1x
            </Button>
            <Button
              size="sm"
              variant={playbackSpeed === 2 ? "default" : "outline"}
              onClick={() => setPlaybackSpeed(2)}
              className="h-8 px-2 text-xs"
            >
              2x
            </Button>
          </div>

          <Button
            size="icon"
            variant="outline"
            onClick={handleReset}
            className="h-10 w-10"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Layer Toggles */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant={showTrustLayer ? "default" : "outline"}
            onClick={() => setShowTrustLayer(!showTrustLayer)}
            className="text-xs"
          >
            Trust Layer
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="text-xs"
          >
            AI Insights
          </Button>
        </div>
      </div>

      {/* Insight Drawer */}
      <InsightDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        insight={currentInsight}
        month={months[currentMonth]}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        @keyframes markerEntry {
          0% {
            transform: translateY(-20px) scale(0);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
