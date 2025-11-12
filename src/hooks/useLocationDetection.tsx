import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface LocationData {
  city: string;
  state: string;
  country: string;
}

export const useLocationDetection = () => {
  const [detectedLocation, setDetectedLocation] = useState<LocationData | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasDetected, setHasDetected] = useState(false);

  useEffect(() => {
    // Check if we've already detected location in this session
    const storedLocation = sessionStorage.getItem('detectedLocation');
    const hasDetectedBefore = sessionStorage.getItem('hasDetectedLocation');

    if (hasDetectedBefore && storedLocation) {
      setDetectedLocation(JSON.parse(storedLocation));
      setHasDetected(true);
      return;
    }

    // Only detect on first visit
    if (!hasDetectedBefore) {
      detectUserLocation();
    }
  }, []);

  const detectUserLocation = async () => {
    setIsDetecting(true);

    // Try geolocation API first
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Use reverse geocoding to get city name
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            
            const location: LocationData = {
              city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
              state: data.address?.state || '',
              country: data.address?.country || 'India'
            };

            setDetectedLocation(location);
            sessionStorage.setItem('detectedLocation', JSON.stringify(location));
            sessionStorage.setItem('hasDetectedLocation', 'true');
            setHasDetected(true);
            
            toast.success(
              `📍 Showing properties near ${location.city}`,
              {
                description: 'You can search manually for other locations',
                duration: 5000,
              }
            );
          } catch (error) {
            console.error('Error reverse geocoding:', error);
            fallbackToIPLocation();
          } finally {
            setIsDetecting(false);
          }
        },
        () => {
          // User denied location permission
          fallbackToIPLocation();
        }
      );
    } else {
      fallbackToIPLocation();
    }
  };

  const fallbackToIPLocation = async () => {
    try {
      // Fallback to IP-based location
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      const location: LocationData = {
        city: data.city || 'Bangalore',
        state: data.region || '',
        country: data.country_name || 'India'
      };

      setDetectedLocation(location);
      sessionStorage.setItem('detectedLocation', JSON.stringify(location));
      sessionStorage.setItem('hasDetectedLocation', 'true');
      setHasDetected(true);
      
      toast.info(
        `📍 Showing properties near ${location.city}`,
        {
          description: 'You can search manually for other locations',
          duration: 5000,
        }
      );
    } catch (error) {
      console.error('Error detecting location:', error);
      // Default to Bangalore if all fails
      const defaultLocation: LocationData = {
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India'
      };
      setDetectedLocation(defaultLocation);
      sessionStorage.setItem('detectedLocation', JSON.stringify(defaultLocation));
      sessionStorage.setItem('hasDetectedLocation', 'true');
      setHasDetected(true);
    } finally {
      setIsDetecting(false);
    }
  };

  const clearLocation = () => {
    setDetectedLocation(null);
    sessionStorage.removeItem('detectedLocation');
  };

  return {
    detectedLocation,
    isDetecting,
    hasDetected,
    clearLocation,
    detectUserLocation
  };
};
