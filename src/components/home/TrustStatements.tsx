import { motion } from "framer-motion";
import { Heart, Clock, Users } from "lucide-react";

const statements = [
  {
    icon: Heart,
    text: "We don't push properties.",
  },
  {
    icon: Clock,
    text: "We sometimes suggest waiting.",
  },
  {
    icon: Users,
    text: "Your decision > commission.",
  },
];

const TrustStatements = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="py-8 border-t border-border/30 bg-secondary/20"
    >
      <div className="container mx-auto container-padding">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 md:gap-12">
          {statements.map((statement, index) => {
            const Icon = statement.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Icon className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-medium">{statement.text}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default TrustStatements;
