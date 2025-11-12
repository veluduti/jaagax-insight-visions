import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Building2, FileText, Users } from "lucide-react";

const tabs = [
  { id: "properties", label: "Properties", icon: Home, path: "/" },
  { id: "projects", label: "New Projects", icon: Building2, path: "/projects" },
  { id: "transactions", label: "Transactions", icon: FileText, path: "/transactions" },
  { id: "agents", label: "Agents", icon: Users, path: "/agents" },
];

const NavigationTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (path: string) => {
    if (path.startsWith("#")) {
      // Scroll to section if on homepage
      if (location.pathname === "/") {
        const element = document.querySelector(path);
        element?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate(`/${path}`);
      }
    } else {
      navigate(path);
    }
  };

  const isActiveTab = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <section className="sticky top-16 z-40 glass-panel border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center md:justify-start gap-2 overflow-x-auto scrollbar-hide py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isActiveTab(tab.path);
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
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
