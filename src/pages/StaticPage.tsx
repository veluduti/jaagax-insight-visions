import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useEffect } from "react";

interface Section {
  heading: string;
  body: string | string[];
}

interface StaticPageProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  sections: Section[];
}

const StaticPage = ({ title, subtitle, icon: Icon, sections }: StaticPageProps) => {
  useEffect(() => {
    document.title = `${title} | JAAGA X`;
  }, [title]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
          <div className="container mx-auto px-6 py-16 md:py-24 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl"
            >
              {Icon && (
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
                  <Icon className="h-6 w-6" />
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">{title}</h1>
              {subtitle && <p className="text-lg text-foreground/70">{subtitle}</p>}
            </motion.div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 md:py-16">
          <div className="max-w-3xl mx-auto space-y-10">
            {sections.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel p-6 md:p-8 rounded-2xl"
              >
                <h2 className="text-xl md:text-2xl font-bold mb-3">{s.heading}</h2>
                {Array.isArray(s.body) ? (
                  <ul className="space-y-2 text-foreground/80">
                    {s.body.map((line, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{s.body}</p>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default StaticPage;
