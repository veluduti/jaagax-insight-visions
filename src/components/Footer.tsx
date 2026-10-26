import { Link } from "react-router-dom";
import { Instagram, Linkedin, Youtube, Twitter, Heart } from "lucide-react";
import jaagaxLogo from "@/assets/jaagax-logo.png";

const footerGroups = [
  {
    title: "Products",
    links: [
      { label: "Jaaga Stays", to: "/hotels" },
      { label: "Smart Stays", to: "/smart-stays" },
      { label: "Buy, Rent & Invest", to: "/search" },
      { label: "New Projects", to: "/projects" },
      { label: "Experiences", to: "/communities" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", to: "/about" },
      { label: "How It Works", to: "/how-it-works" },
      { label: "For Builders", to: "/for-builders" },
      { label: "For Agents", to: "/for-agents" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Cookie Policy", to: "/cookies" },
    ],
  },
];

const socials = [
  { icon: Instagram, label: "Instagram", href: "https://instagram.com" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com" },
  { icon: Youtube, label: "YouTube", href: "https://youtube.com" },
  { icon: Twitter, label: "X (Twitter)", href: "https://x.com" },
];

const Footer = () => {
  return (
    <footer className="bg-[hsl(160,45%,10%)] text-white">
      <div className="container mx-auto container-padding py-12 sm:py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link to="/" aria-label="JAAGA X home" className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <img src={jaagaxLogo} alt="JAAGA X" className="h-auto w-44 max-w-full brightness-0 invert" />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-white/70 leading-relaxed">
              India's first AI-powered platform for properties, stays, investments and travel.
            </p>
            <div className="mt-5 flex gap-3">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/50 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={`${group.title} footer links`}>
              <h2 className="mb-3 text-sm font-bold text-white">{group.title}</h2>
              <ul className="space-y-1">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="inline-flex min-h-9 items-center rounded-sm text-sm text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center text-xs text-white/50 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Jaaga. All rights reserved.</p>
          <p className="inline-flex items-center gap-1">
            Made with <Heart className="h-3 w-3 fill-red-400 text-red-400" /> for a better tomorrow.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
