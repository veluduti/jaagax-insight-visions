import { createContext, useContext, ReactNode } from 'react';
import { useLocationDetection } from '@/hooks/useLocationDetection';

interface LocationContextType {
  detectedLocation: { city: string; state: string; country: string } | null;
  isDetecting: boolean;
  hasDetected: boolean;
  clearLocation: () => void;
  detectUserLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const locationData = useLocationDetection();

  return (
    <LocationContext.Provider value={locationData}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
