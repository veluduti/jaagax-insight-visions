import { motion } from "framer-motion";
import { useState } from "react";
import { Home, Building2, FileText, Shield, Users } from "lucide-react";

const tabs = [
  { id: "properties", label: "Properties", icon: Home },
  { id: "projects", label: "New Projects", icon: Building2 },
  { id: "transactions", label: "Transactions", icon: FileText },
  { id: "trustscore", label: "TrustScore™", icon: Shield },
  { id: "agents", label: "Agents", icon: Users },
];

const NavigationTabs = () => {
  const [activeTab, setActiveTab] = useState("properties");

  return (
    <section className="sticky top-16 z-40 glass-panel border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center md:justify-start gap-2 overflow-x-auto scrollbar-hide py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default NavigationTabs;
