import { Navigate, useLocation } from "react-router-dom";

/** Legacy onboarding now uses the real integration workspace instead of simulated connection tests. */
export default function PartnerPmsSetup() {
  const location = useLocation();
  return <Navigate to={`/partners/integrations${location.search}${location.search ? "&" : "?"}onboarding=1`} replace />;
}
