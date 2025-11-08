import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Brain, TrendingUp, FileCheck, Mic } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Property Advisor",
    description: "Get personalized property recommendations based on your preferences and budget",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: TrendingUp,
    title: "Market Intelligence",
    description: "Predict price appreciation, rental yields, and demand trends with AI analytics",
    color: "from-blue-500 to-purple-500",
  },
  {
    icon: FileCheck,
    title: "Document Verification",
    description: "AI-powered RERA and legal document analysis for complete transparency",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Mic,
    title: "Voice Search",
    description: "Simply speak your requirements and let AI find your perfect match",
    color: "from-pink-500 to-cyan-500",
  },
];

const AIFeatures = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powered by <span className="text-gradient">AI Intelligence</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Experience the next generation of real estate with cutting-edge AI technology
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-panel border-border/50 p-6 h-full hover:border-primary/50 transition-all duration-300 group cursor-pointer">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 glow-effect group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIFeatures;
