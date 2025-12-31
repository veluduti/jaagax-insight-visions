import { motion } from "framer-motion";
import { Shield, CheckCircle2, Award } from "lucide-react";

const TrustBadge = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: "var(--gradient-glow)" }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-panel p-12 rounded-3xl text-center max-w-4xl mx-auto glow-effect"
        >
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-effect"
          >
            <Shield className="h-12 w-12 text-primary-foreground" />
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-gradient">Trust Verified</span> Properties
          </h2>

          <p className="text-xl text-foreground/80 mb-12 max-w-2xl mx-auto">
            Every property on JaagaX undergoes rigorous AI-powered verification and RERA compliance checks. 
            Your trust is our foundation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: CheckCircle2, label: "RERA Verified", value: "100%" },
              { icon: Shield, label: "AI Trust Score", value: "98%" },
              { icon: Award, label: "Builder Verified", value: "250+" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center"
              >
                <stat.icon className="h-8 w-8 text-primary mb-3" />
                <div className="text-3xl font-bold text-gradient mb-2">{stat.value}</div>
                <div className="text-sm text-foreground/70">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustBadge;
