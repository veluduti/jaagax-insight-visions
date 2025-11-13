import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Shield, Linkedin, Instagram, Twitter } from "lucide-react";
import logo from "@/assets/logo.png";
const Footer = () => {
  return <footer className="relative py-16 bg-secondary/20 border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              
              <div>
                <h3 className="text-xl font-bold text-gradient">JaagaX</h3>
                <p className="text-xs text-muted-foreground">Intelligent Realty</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              India's first AI-powered real estate platform. Find verified properties 
              with complete transparency.
            </p>
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-semibold">10,000+ Verified Properties</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* For Businesses */}
          <div>
            <h4 className="font-bold mb-4">For Businesses</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">For Builders</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">For Agents</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Advertise</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Access</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Partner Program</a></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="font-bold mb-4">Legal & Support</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 JaagaX. All rights reserved. Made with ❤️ in India.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <motion.a href="#" whileHover={{
            scale: 1.1
          }} className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
              <Linkedin className="h-5 w-5" />
            </motion.a>
            <motion.a href="#" whileHover={{
            scale: 1.1
          }} className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
              <Instagram className="h-5 w-5" />
            </motion.a>
            <motion.a href="#" whileHover={{
            scale: 1.1
          }} className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
              <Twitter className="h-5 w-5" />
            </motion.a>
          </div>
        </div>
      </div>

      {/* JaagaX Verified Badge */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} className="absolute top-8 right-8 glass-panel px-4 py-2 rounded-full hidden lg:flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">JaagaX Verified™</span>
      </motion.div>
    </footer>;
};
export default Footer;