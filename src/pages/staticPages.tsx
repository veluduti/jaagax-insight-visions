import StaticPage from "./StaticPage";
import { Info, Compass, Tag, Briefcase, Rss, Building2, Users, Megaphone, Code2, Handshake, Shield, FileText, Cookie, HelpCircle, Mail } from "lucide-react";

export const AboutUs = () => (
  <StaticPage
    title="About JAAGA X"
    subtitle="India's first AI-powered real estate platform, built on transparency and verified truth."
    icon={Info}
    sections={[
      { heading: "Our Mission", body: "We make Indian real estate radically transparent. Every listing on JAAGA X is verified on the ground by trained agents so buyers, tenants and investors decide with facts — not marketing." },
      { heading: "What We Do", body: ["100% physically verified property listings", "AI-powered price, ROI and trust insights", "Direct owner and builder connections with zero brokerage inflation", "End-to-end visit, booking and post-visit support"] },
      { heading: "Why It Matters", body: "Indian real estate has been opaque for decades. JAAGA X pairs on-ground verification with AI so every square foot you see is real, priced fairly and matched to your goals." },
    ]}
  />
);

export const HowItWorks = () => (
  <StaticPage
    title="How JAAGA X Works"
    subtitle="From search to keys — a simple, verified journey."
    icon={Compass}
    sections={[
      { heading: "1. Search Verified Listings", body: "Browse properties, projects, transactions and agents. Every LIVE listing has been physically inspected." },
      { heading: "2. Get AI Insights", body: "Our AI advisor shows fair price, ROI potential, comparable transactions and a trust score for every property." },
      { heading: "3. Schedule a Visit", body: "Book a visit with a verified agent. Track them live, get a QR/OTP confirmation, and receive an AI visit summary." },
      { heading: "4. Close With Confidence", body: "Compare, negotiate and transact backed by JAAGA X's verification protocol and financial partners." },
    ]}
  />
);

export const Pricing = () => (
  <StaticPage
    title="Pricing"
    subtitle="Simple, transparent pricing for buyers, agents and builders."
    icon={Tag}
    sections={[
      { heading: "For Buyers & Tenants", body: "Free forever. Search, shortlist, schedule visits and use the AI advisor with no charges." },
      { heading: "For Agents", body: "Free onboarding. Pay only per verified assignment and closure. Detailed rate cards are shared during agent registration." },
      { heading: "For Builders", body: "Custom project microsites, promotions and lead delivery plans. Contact our sales team for a plan tailored to your inventory size." },
    ]}
  />
);

export const Careers = () => (
  <StaticPage
    title="Careers at JAAGA X"
    subtitle="Help us rebuild trust in Indian real estate."
    icon={Briefcase}
    sections={[
      { heading: "Why Join Us", body: "We are a small, product-obsessed team combining AI, on-ground verification and design to reshape a trillion-dollar industry." },
      { heading: "Open Roles", body: "We are actively hiring across engineering, product, verification operations and city partnerships. Roles are posted here as they open." },
      { heading: "Apply", body: "Send your resume and a short note to careers@jaagax.com and we'll get back within 7 working days." },
    ]}
  />
);

export const Blog = () => (
  <StaticPage
    title="Blog"
    subtitle="Market insights, buyer guides and product updates."
    icon={Rss}
    sections={[
      { heading: "Coming Soon", body: "Our editorial team is preparing city market reports, buyer playbooks and AI-driven trend analysis. Subscribe below to be notified when the first stories go live." },
    ]}
  />
);

export const ForBuilders = () => (
  <StaticPage
    title="For Builders"
    subtitle="Showcase inventory, capture verified leads and grow direct sales."
    icon={Building2}
    sections={[
      { heading: "Branded Microsites", body: "Get a dedicated builder microsite with luxury, standard or budget themes tuned to your positioning." },
      { heading: "Verified Leads", body: "Every enquiry is authenticated and enriched with buyer context before it reaches your sales team." },
      { heading: "Promotions & Analytics", body: "Run promotions across the JAAGA X network and measure impressions, clicks and site visits from a single dashboard." },
    ]}
  />
);

export const ForAgents = () => (
  <StaticPage
    title="For Agents"
    subtitle="Grow your business with verified assignments and transparent earnings."
    icon={Users}
    sections={[
      { heading: "Verified Assignments", body: "Receive property assignments matched by proximity, workload and trust score — no cold leads." },
      { heading: "XP & Leaderboard", body: "Earn XP for every verification, visit and closure. Climb the JAAGA X agent leaderboard for higher priority." },
      { heading: "Transparent Payouts", body: "Track every earning, effort unit and payout in the agent dashboard." },
    ]}
  />
);

export const Advertise = () => (
  <StaticPage
    title="Advertise on JAAGA X"
    subtitle="Reach high-intent property buyers across India."
    icon={Megaphone}
    sections={[
      { heading: "Ad Formats", body: ["Featured property placements", "Vertical reels in the Discover feed", "Sponsored microsites and locality takeovers"] },
      { heading: "Get Started", body: "Write to ads@jaagax.com with your goal, budget range and target cities. Our team will share a proposal within 3 working days." },
    ]}
  />
);

export const ApiAccess = () => (
  <StaticPage
    title="API Access"
    subtitle="Programmatic access to verified listings, transactions and AI insights."
    icon={Code2}
    sections={[
      { heading: "Who It's For", body: "Portals, PropTech partners, banks and enterprise buyers who want structured, verified real estate data." },
      { heading: "Request Access", body: "API access is currently invite-only. Email api@jaagax.com describing your use case, expected volume and integration timeline." },
    ]}
  />
);

export const PartnerProgram = () => (
  <StaticPage
    title="Partner Program"
    subtitle="Grow with JAAGA X — hotels, financial institutions and channel partners."
    icon={Handshake}
    sections={[
      { heading: "Hotel Partners", body: "Bundle stays with property visits and unlock recurring bookings from our buyer network. Visit /partners to onboard." },
      { heading: "Financial Partners", body: "Home loans, LAP and construction finance providers can list products and receive pre-qualified leads." },
      { heading: "Channel Partners", body: "Real estate consultants and community managers can join our channel program for shared revenue on closed deals." },
    ]}
  />
);

export const PrivacyPolicy = () => (
  <StaticPage
    title="Privacy Policy"
    subtitle="How JAAGA X collects, uses and protects your information."
    icon={Shield}
    sections={[
      { heading: "Information We Collect", body: "Account details you provide (name, phone, email), property preferences, saved locations, and usage analytics needed to operate the platform." },
      { heading: "How We Use It", body: "To match you with verified properties and agents, deliver AI recommendations, coordinate visits, and improve our services." },
      { heading: "Sharing", body: "We share limited information with verified agents and builders only when you initiate an enquiry or visit. We never sell personal data." },
      { heading: "Your Rights", body: "You can request a copy or deletion of your data at any time by writing to privacy@jaagax.com." },
      { heading: "Contact", body: "For any privacy question, reach us at privacy@jaagax.com." },
    ]}
  />
);

export const TermsOfService = () => (
  <StaticPage
    title="Terms of Service"
    subtitle="The rules that govern your use of JAAGA X."
    icon={FileText}
    sections={[
      { heading: "Acceptance", body: "By using JAAGA X you agree to these terms. If you do not agree, please do not use the platform." },
      { heading: "User Accounts", body: "You are responsible for maintaining the confidentiality of your account and for all activities under it." },
      { heading: "Listings", body: "Property information is verified to the best of our ability but final due diligence remains the responsibility of the buyer or tenant." },
      { heading: "Limitation of Liability", body: "JAAGA X is not liable for indirect or consequential losses arising from third-party listings, agents or transactions." },
      { heading: "Changes", body: "We may update these terms; continued use of the platform constitutes acceptance of the updated terms." },
    ]}
  />
);

export const CookiePolicy = () => (
  <StaticPage
    title="Cookie Policy"
    subtitle="How we use cookies and similar technologies."
    icon={Cookie}
    sections={[
      { heading: "What Are Cookies", body: "Small files stored on your device that help us remember your preferences and improve your experience." },
      { heading: "How We Use Them", body: ["Keep you signed in", "Remember your saved location and filters", "Measure usage to improve the product"] },
      { heading: "Managing Cookies", body: "You can control or delete cookies through your browser settings. Disabling essential cookies may break parts of the platform." },
    ]}
  />
);

export const HelpCenter = () => (
  <StaticPage
    title="Help Center"
    subtitle="Answers to the most common questions."
    icon={HelpCircle}
    sections={[
      { heading: "Getting Started", body: "Create an account, complete the buyer onboarding, and set your saved location to unlock personalised recommendations." },
      { heading: "Scheduling a Visit", body: "Open any verified property and click Schedule Visit. You'll receive an OTP and QR code once the agent confirms." },
      { heading: "Verification", body: "Every LIVE listing has been physically inspected by a JAAGA X agent with GPS and photo evidence." },
      { heading: "Still stuck?", body: "Write to support@jaagax.com — we typically reply within one working day." },
    ]}
  />
);

export const ContactUs = () => (
  <StaticPage
    title="Contact Us"
    subtitle="We'd love to hear from you."
    icon={Mail}
    sections={[
      { heading: "General & Support", body: "support@jaagax.com" },
      { heading: "Sales & Partnerships", body: "sales@jaagax.com" },
      { heading: "Press", body: "press@jaagax.com" },
      { heading: "Careers", body: "careers@jaagax.com" },
    ]}
  />
);
