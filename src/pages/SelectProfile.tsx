import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Profile picker was removed. Users are routed straight to their role dashboard
 * after login; additional roles can be added/switched from the header ProfileSwitcher.
 * This page now just forwards to /dashboard which resolves the correct role route.
 */
export default function SelectProfile() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);
  return null;
}
