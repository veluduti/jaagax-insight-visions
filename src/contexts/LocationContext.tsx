import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSavedLocation } from '@/hooks/useSavedLocation';
import type { SavedLocation, LocationMode } from '@/lib/savedLocation';

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
  locationMode: LocationMode | null;
  pendingGpsPrompt: boolean;
  dismissGpsPrompt: ReturnType<typeof useSavedLocation>['dismissGpsPrompt'];
  selectLocation: ReturnType<typeof useSavedLocation>['selectLocation'];
  requestGpsLocation: ReturnType<typeof useSavedLocation>['requestGpsLocation'];
  clearLocation: ReturnType<typeof useSavedLocation>['clearLocation'];
  disableLocation: ReturnType<typeof useSavedLocation>['disableLocation'];
  resetLocationForTesting: ReturnType<typeof useSavedLocation>['resetLocationForTesting'];

  // ==== Legacy shim ====
  detectedLocation: LegacyDetectedLocation | null;
  isDetecting: boolean;
  hasDetected: boolean;
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
    // Defensive fallback: return inert defaults instead of throwing so a stray
    // consumer (e.g. during HMR or rendered outside the provider) never blanks the app.
    if (typeof console !== 'undefined') {
      console.warn('useLocation called outside LocationProvider — returning inert defaults.');
    }
    const noop = async () => {};
    return {
      savedLocation: null,
      isResolvingGps: false,
      hasLocation: false,
      locationMode: null,
      selectLocation: noop as any,
      requestGpsLocation: noop as any,
      clearLocation: noop as any,
      disableLocation: noop as any,
      detectedLocation: null,
      isDetecting: false,
      hasDetected: false,
      detectUserLocation: () => {},
    };
  }
  return context;
};
