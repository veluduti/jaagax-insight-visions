import { memo, type ReactNode } from "react";
import { motion } from "framer-motion";

interface SectionHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  highlight?: ReactNode;
  trailing?: ReactNode;
  description?: ReactNode;
}

/**
 * Shared section header used across home + listing pages so every
 * top-of-section block has identical typography and animation.
 */
function SectionHeaderImpl({ eyebrow, title, highlight, trailing, description }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-center mb-xl"
    >
      {eyebrow}
      <h2 className="text-3xl md:text-4xl font-bold mb-md">
        {title}
        {highlight && <span className="text-gradient"> {highlight}</span>}
        {trailing}
      </h2>
      {description && (
        <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto">{description}</p>
      )}
    </motion.div>
  );
}

export const SectionHeader = memo(SectionHeaderImpl);
