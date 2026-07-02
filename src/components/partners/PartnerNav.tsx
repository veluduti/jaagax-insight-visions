import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Why Partner", href: "#why" },
  { label: "Benefits", href: "#benefits" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact Sales", href: "#contact" },
];

export default function PartnerNav() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const onLanding = loc.pathname === "/partners";

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
          <Link to="/partners/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/partners/register">
            <Button size="sm" className="bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600">
              List your hotel
            </Button>
          </Link>
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
            <Link to="/partners/login" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">Log in</Button>
            </Link>
            <Link to="/partners/register" onClick={() => setOpen(false)}>
              <Button className="w-full bg-emerald-500 text-white hover:bg-emerald-600">List your hotel</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
