import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Runs `action` if signed in; otherwise warns and sends the user to the sign-in page. */
export async function requireSignIn(navigate: NavigateFunction, action: () => void, message = "Please sign in to book a visit") {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) { action(); return; }
  toast.warning(message);
  const from = window.location.pathname + window.location.search;
  navigate(`/auth?redirect=${encodeURIComponent(from)}`, { state: { from } });
}
