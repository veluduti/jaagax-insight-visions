/**
 * Route Aliases
 * -------------
 * Forward-facing URLs that map to existing implementations without
 * duplicating pages. `/agriculture/*` -> `/natural-living/*` etc.
 */
import { Navigate, Route, useLocation } from "react-router-dom";

function ForwardTo({ prefix }: { prefix: string }) {
  const loc = useLocation();
  const rest = loc.pathname.replace(/^\/agriculture/, "") || "/";
  return <Navigate to={`${prefix}${rest}${loc.search}`} replace />;
}

/** Mount inside <Routes>: `{RouteAliases()}` */
export function RouteAliases() {
  return (
    <>
      <Route path="/agriculture" element={<ForwardTo prefix="/natural-living" />} />
      <Route path="/agriculture/*" element={<ForwardTo prefix="/natural-living" />} />
    </>
  );
}
