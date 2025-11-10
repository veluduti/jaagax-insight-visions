import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { 
  MapPin, Home, TrendingUp, Shield, ArrowLeft, 
  Bed, Bath, Maximize, Star, Eye, MessageSquare 
} from "lucide-react";

const MAPBOX_TOKEN = "pk.eyJ1IjoicHJhdGhha2hhbGVyIiwiYSI6ImNtNXFxa3Z4MDA1ejIya29ndmhweDM2cjgifQ.Luc21TaC0cIBSfGWglZANg";

export default function AIAdvisorResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { properties = [], filters = {} } = location.state || {};
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!properties || properties.length === 0) {
      navigate('/ai-advisor');
      return;
    }

    initializeMap();

    return () => {
      markers.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [properties]);

  const initializeMap = () => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Calculate map center from properties with valid coordinates
    const validProperties = properties.filter((p: any) => p.lat && p.lng);
    
    const center: [number, number] = validProperties.length > 0
      ? [
          validProperties.reduce((sum: number, p: any) => sum + p.lng, 0) / validProperties.length,
          validProperties.reduce((sum: number, p: any) => sum + p.lat, 0) / validProperties.length,
        ]
      : [78.4867, 17.3850]; // Default to Hyderabad

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers for properties with coordinates
    validProperties.forEach((property: any) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = 'url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)';
      el.style.backgroundSize = 'cover';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([property.lng, property.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-semibold">${property.title}</h3>
                <p class="text-sm">${formatPrice(property.price)}</p>
                <p class="text-xs text-muted-foreground">${property.locality}</p>
              </div>
            `)
        )
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedProperty(property);
      });

      markers.current.push(marker);
    });
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/ai-advisor')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to AI Advisor
          </Button>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold">AI Search Results</h1>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {properties.length} Properties Found
            </Badge>
          </div>

          {/* Active Filters */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (!value) return null;
              return (
                <Badge key={key} variant="outline">
                  {key}: {typeof value === 'number' && key.includes('price') 
                    ? formatPrice(value as number)
                    : String(value)}
                </Badge>
              );
            })}
          </div>
        </motion.div>

        {/* Map and Results Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:sticky lg:top-20 h-[600px]"
          >
            <Card className="h-full overflow-hidden">
              <div ref={mapContainer} className="w-full h-full" />
            </Card>
          </motion.div>

          {/* Property List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 max-h-[600px] overflow-y-auto"
          >
            {properties.map((property: any, index: number) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`glass-panel cursor-pointer hover:shadow-xl transition-all ${
                    selectedProperty?.id === property.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedProperty(property);
                    if (property.lat && property.lng) {
                      map.current?.flyTo({
                        center: [property.lng, property.lat],
                        zoom: 14,
                      });
                    }
                  }}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="relative w-full md:w-1/3 h-48">
                      <img
                        src={property.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"}
                        alt={property.title}
                        className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                      />
                      {property.verified && (
                        <Badge className="absolute top-2 right-2 bg-green-600">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <CardContent className="flex-1 p-4">
                      <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.locality}, {property.city}
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="font-bold text-primary text-lg">
                            {formatPrice(property.price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Trust Score</p>
                          <p className="font-bold flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            {property.trust_score || 'N/A'}/100
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          {property.bhk} BHK
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {property.baths} Bath
                        </span>
                        <span className="flex items-center gap-1">
                          <Maximize className="h-4 w-4" />
                          {property.area} sq.ft
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/property/${property.id}`);
                          }}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ai-advisor/${property.id}`);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          AI Insights
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}