import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


const nav = [
  { label: "Why Partner", href: "#why" },
  { label: "Benefits", href: "#benefits" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact Sales", href: "#contact" },
];

export default function PartnerNav() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPartner, setIsPartner] = useState(false);
  const loc = useLocation();
  const nav_ = useNavigate();
  const onLanding = loc.pathname === "/partners";

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
        <Button size="sm" className="bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600">
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
        <Button size="sm" className="bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600">
          List your hotel
        </Button>
      </Link>
    </>
  );

  const desktopActions = userId ? (isPartner ? partnerActions : customerActions) : guestActions;


  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/partners" className="flex items-center gap-2 font-bold tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg">
            JAAGA X <span className="text-emerald-400">Partners</span>
          </span>
        </Link>

        {onLanding && (
          <nav className="hidden items-center gap-7 md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-sm text-muted-foreground transition hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
        )}

        <div className="hidden items-center gap-2 md:flex">
          {desktopActions}
        </div>


        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className={cn("border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden")}>
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4">
            {onLanding && nav.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
                {n.label}
              </a>
            ))}
            {userId ? (
              <>
                <Link to="/partners/dashboard" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">
                    <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                <Button
                  className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                  onClick={() => { setOpen(false); handleSignOut(); }}
                >
                  <LogOut className="mr-1.5 h-4 w-4" /> Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/partners/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">Log in</Button>
                </Link>
                <Link to="/partners/register" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-emerald-500 text-white hover:bg-emerald-600">List your hotel</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
