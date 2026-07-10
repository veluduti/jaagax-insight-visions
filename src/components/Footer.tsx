import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Shield, Linkedin, Instagram, Twitter } from "lucide-react";
import jaagaxLogo from "@/assets/jaagax-logo.png";

type FooterLink = { label: string; to: string };

const quickLinks: FooterLink[] = [
  { label: "About Us", to: "/about" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "Careers", to: "/careers" },
  { label: "Blog", to: "/blog" },
];

const businessLinks: FooterLink[] = [
  { label: "For Builders", to: "/for-builders" },
  { label: "For Agents", to: "/for-agents" },
  { label: "Advertise", to: "/advertise" },
  { label: "API Access", to: "/api-access" },
  { label: "Partner Program", to: "/partner-program" },
];

const legalLinks: FooterLink[] = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Cookie Policy", to: "/cookies" },
  { label: "Help Center", to: "/help" },
  { label: "Contact Us", to: "/contact" },
];

const LinkColumn = ({ title, links }: { title: string; links: FooterLink[] }) => (
  <div>
    <h4 className="font-bold mb-4">{title}</h4>
    <ul className="space-y-3 text-sm text-foreground/70">
      {links.map((l) => (
        <li key={l.to}>
          <Link to={l.to} className="hover:text-primary transition-colors">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  return (
    <footer className="relative py-16 bg-secondary/20 border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={jaagaxLogo}
                alt="JAAGA X"
                className="h-10 w-auto object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="text-sm text-foreground/70 mb-4">
              India's first AI-powered real estate platform. Find verified properties with complete transparency.
            </p>
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-semibold">100% Verified Listings</span>
            </div>
          </div>

          <LinkColumn title="Quick Links" links={quickLinks} />
          <LinkColumn title="For Businesses" links={businessLinks} />
          <LinkColumn title="Legal & Support" links={legalLinks} />
        </div>

        <Separator className="mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-foreground/70">© {new Date().getFullYear()} JaagaX. All rights reserved. Made with ❤️ in India.</p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <motion.a href="#" whileHover={{ scale: 1.1 }} aria-label="LinkedIn" className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
              <Linkedin className="h-5 w-5" />
            </motion.a>
            <motion.a href="#" whileHover={{ scale: 1.1 }} aria-label="Instagram" className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
              <Instagram className="h-5 w-5" />
            </motion.a>
            <motion.a href="#" whileHover={{ scale: 1.1 }} aria-label="Twitter" className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
              <Twitter className="h-5 w-5" />
            </motion.a>
          </div>
        </div>
      </div>

      {/* JaagaX Verified Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="absolute top-8 right-8 glass-panel px-4 py-2 rounded-full hidden lg:flex items-center gap-2"
      >
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">JaagaX Verified™</span>
      </motion.div>
    </footer>
  );
};
export default Footer;
