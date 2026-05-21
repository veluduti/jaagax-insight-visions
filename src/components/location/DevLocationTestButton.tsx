import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { Bug } from "lucide-react";

/**
 * DEV-ONLY floating button that wipes the saved location, clears the prompted
 * flag, logs the current browser permission state, and re-opens the in-app
 * permission dialog. The actual native popup will fire when the user clicks
 * "Allow" inside that dialog (a real user gesture).
 *
 * Only rendered when import.meta.env.DEV is true, so it never ships to prod.
 */
const DevLocationTestButton = () => {
  if (!import.meta.env.DEV) return null;

  const { resetLocationForTesting } = useLocationContext();

  return (
    <button
      type="button"
      onClick={() => resetLocationForTesting()}
      title="DEV: reset saved location and re-prompt"
      className="fixed bottom-4 left-4 z-[100] inline-flex items-center gap-1.5 rounded-full border border-yellow-500/60 bg-yellow-400/90 px-3 py-1.5 text-xs font-medium text-yellow-950 shadow-lg hover:bg-yellow-300"
    >
      <Bug className="h-3.5 w-3.5" />
      Test location flow
    </button>
  );
};

export default DevLocationTestButton;
