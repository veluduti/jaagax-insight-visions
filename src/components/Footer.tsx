import { Link } from "react-router-dom";
import jaagaxLogo from "@/assets/jaagax-logo.png";

const footerGroups = [
  {
    title: "Explore",
    links: [
      { label: "Properties", to: "/search" },
      { label: "Jaaga Stays", to: "/hotels" },
      { label: "Smart Stays", to: "/smart-stays" },
      { label: "Find My Agent", to: "/agents" },
    ],
  },
  {
    title: "JAAGA X",
    links: [
      { label: "About Us", to: "/about" },
      { label: "How It Works", to: "/how-it-works" },
      { label: "For Builders", to: "/for-builders" },
      { label: "For Agents", to: "/for-agents" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Contact Us", to: "/contact" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-secondary/20 text-foreground">
      <div className="container mx-auto px-6 py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link
              to="/"
              aria-label="JAAGA X home"
              className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img src={jaagaxLogo} alt="JAAGA X" className="h-auto w-48 max-w-full" />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">Choose Your Place</p>
          </div>
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={`${group.title} footer links`}>
              <h2 className="mb-3 text-sm font-semibold">{group.title}</h2>
              <ul className="space-y-1">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="inline-flex min-h-10 items-center rounded-sm text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          {/*<p>© {new Date().getFullYear()} JAAGA X. All rights reserved. Made with ❤️ in India.</p>*/}
          <Link
            to="/cookies"
            className="inline-flex min-h-10 items-center rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
