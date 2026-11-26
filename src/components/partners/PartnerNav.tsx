import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X, LayoutDashboard, LogOut, Home, ArrowLeft } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { PartnerWorkspaceContext } from "@/contexts/PartnerWorkspaceContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "@/pages/partners/partner-register.css";


const nav = [
  { label: "For Property Owners", href: "/partners#owners" },
  { label: "Partner with Jaaga", href: "/partners/partner-with-jaaga" },
  { label: "Solutions", href: "/partners#benefits" },
  { label: "Pricing", href: "/partners#pricing" },
  { label: "Resources", href: "/partners#faq" },
];

export default function PartnerNav() {
  const workspace = useContext(PartnerWorkspaceContext);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPartner, setIsPartner] = useState(false);
  const loc = useLocation();
  const nav_ = useNavigate();
  const onLanding = loc.pathname === "/partners" || loc.pathname === "/partners/partner-with-jaaga";

  const loadPartnerStatus = async (uid: string | null) => {
    if (!uid) { setIsPartner(false); return; }
    const { data } = await (supabase as any)
      .from("hotel_partner_applications")
      .select("status")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setIsPartner(data?.status === "approved");
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      loadPartnerStatus(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      loadPartnerStatus(uid);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    nav_("/partners", { replace: true });
  };

  // Approved hotel partner: full partner controls
  const partnerActions = (
    <>
      <Link to="/partners/dashboard">
        <Button variant="ghost" size="sm">
          <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
        </Button>
      </Link>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        <LogOut className="mr-1.5 h-4 w-4" /> Sign out
      </Button>
    </>
  );

  // Signed-in customer who is not yet a verified partner
  const customerActions = (
    <>
      <Link to="/dashboard/customer">
        <Button variant="ghost" size="sm">
          <Home className="mr-1.5 h-4 w-4" /> My dashboard
        </Button>
      </Link>
      <Link to="/partners/register">
        <Button size="sm" className="js-btn border-0">
          List your hotel
        </Button>
      </Link>
    </>
  );

  const guestActions = (
    <>
      <Link to="/partners/login">
        <Button variant="ghost" size="sm">Log in</Button>
      </Link>
      <Link to="/partners/register">
        <Button size="sm" className="js-btn border-0">
          List your hotel
        </Button>
      </Link>
    </>
  );

  // Public partner marketing/onboarding pages where a customer may land
  const publicPartnerPaths = ["/partners", "/partners/partner-with-jaaga", "/partners/login", "/partners/register", "/partners/welcome", "/partners/verify-otp", "/partners/forgot-password"];
  const inPartnerWorkspace = loc.pathname.startsWith("/partners") && !publicPartnerPaths.includes(loc.pathname);

  const showPartnerActions = !!userId && (isPartner || inPartnerWorkspace);
  const desktopActions = userId ? (showPartnerActions ? partnerActions : customerActions) : guestActions;


  if (workspace) return null;
  return (
    <header className="js-nav sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4 max-[399px]:px-2">
        <div className="flex min-w-0 items-center gap-1">
        {!onLanding && <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 shrink-0" aria-label="Go back" onClick={() => window.history.length > 1 ? nav_(-1) : nav_("/partners")}><ArrowLeft className="h-5 w-5" /></Button>}
        <Link to="/partners" className="flex min-w-0 items-center gap-2 font-bold tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(268,84%,52%)] to-[hsl(252,85%,48%)] shadow-lg shadow-purple-500/30">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg truncate">
            JAAGA X <span className="text-[hsl(268,84%,52%)]">Partners</span>
          </span>
        </Link>
        </div>

        {onLanding && (
          <nav className="hidden items-center gap-7 md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className={cn("js-navlink text-sm transition", loc.pathname === n.href && "font-bold text-[hsl(268,84%,52%)] underline underline-offset-8")}>
                {n.label}
              </a>
            ))}
          </nav>
        )}

        <div className="hidden items-center gap-2 md:flex">
          {desktopActions}
        </div>


        <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 shrink-0" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className={cn("js-nav border-t backdrop-blur-xl md:hidden")}>
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4">
            {onLanding && nav.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="js-navlink text-sm">
                {n.label}
              </a>
            ))}
            {showPartnerActions ? (
              <>
                <Link to="/partners/dashboard" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">
                    <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                <Button
                  className="w-full js-btn border-0"
                  onClick={() => { setOpen(false); handleSignOut(); }}
                >
                  <LogOut className="mr-1.5 h-4 w-4" /> Sign out
                </Button>
              </>
            ) : userId ? (
              <>
                <Link to="/dashboard/customer" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">
                    <Home className="mr-1.5 h-4 w-4" /> My dashboard
                  </Button>
                </Link>
                <Link to="/partners/register" onClick={() => setOpen(false)}>
                  <Button className="w-full js-btn border-0">List your hotel</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/partners/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">Log in</Button>
                </Link>
                <Link to="/partners/register" onClick={() => setOpen(false)}>
                  <Button className="w-full js-btn border-0">List your hotel</Button>
                </Link>
              </>
            )}

          </div>
        </div>
      )}
    </header>
  );
}
