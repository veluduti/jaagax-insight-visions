import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSavedLocation } from '@/hooks/useSavedLocation';
import type { SavedLocation } from '@/lib/savedLocation';

interface LegacyDetectedLocation {
  city: string;
  state: string;
  country: string;
}

interface LocationContextType {
  // ==== New saved-location API (location-flow v2) ====
  savedLocation: SavedLocation | null;
  isResolvingGps: boolean;
  hasLocation: boolean;
  selectLocation: ReturnType<typeof useSavedLocation>['selectLocation'];
  requestGpsLocation: ReturnType<typeof useSavedLocation>['requestGpsLocation'];
  clearLocation: ReturnType<typeof useSavedLocation>['clearLocation'];

  // ==== Legacy shim — kept so older pages (Hotels, Index, Projects, ...) keep working ====
  /** Mirrors savedLocation as { city, state, country } for backwards compatibility. */
  detectedLocation: LegacyDetectedLocation | null;
  /** Always false — we no longer auto-detect on load. */
  isDetecting: boolean;
  /** True iff a saved location exists. */
  hasDetected: boolean;
  /** Legacy alias for requestGpsLocation. Prefer requestGpsLocation in new code. */
  detectUserLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const saved = useSavedLocation();

  const value = useMemo<LocationContextType>(() => {
    const detectedLocation: LegacyDetectedLocation | null = saved.savedLocation
      ? { city: saved.savedLocation.city, state: '', country: 'India' }
      : null;

    return {
      ...saved,
      detectedLocation,
      isDetecting: saved.isResolvingGps,
      hasDetected: saved.hasLocation,
      detectUserLocation: () => {
        void saved.requestGpsLocation();
      },
    };
  }, [saved]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
