import { useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { usePartialProperties } from "@/hooks/queries/useProperties";
import { PropertyGridCard, SectionHeader } from "@/components/shared";
import type { PropertyRow } from "@/services/types";

const openProperty = (p: PropertyRow) => {
  window.open(`/property/${p.slug || p.id}`, "_blank", "noopener,noreferrer");
};

interface PartialPropertiesProps {
  detectedCity?: string;
}

const PartialProperties = ({ detectedCity }: PartialPropertiesProps) => {
  const navigate = useNavigate();
  const { data: properties = [], isLoading } = usePartialProperties(detectedCity);
  const handleOpen = useCallback((p: PropertyRow) => openProperty(p), []);

  if (isLoading || properties.length === 0) return null;

  return (
    <section className="section-spacing relative" id="partial-properties">
      <div className="container mx-auto container-padding">
        <SectionHeader
          eyebrow={
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground/70 mb-3">
              <Info className="h-3 w-3" /> Partial listings — details still coming in
            </div>
          }
          title="Partial"
          highlight="Properties"
          trailing={
            detectedCity ? (
              <span className="text-foreground/60 text-xl md:text-2xl"> in {detectedCity}</span>
            ) : null
          }
          description="Newly listed by agents and builders. Some details may be missing."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md lg:gap-lg">
          {properties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <PropertyGridCard
                property={property}
                showFavorite={false}
                badge={{ label: "Partial info", tone: "muted" }}
                ctaLabel="View Available Details"
                onOpen={handleOpen}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-xl"
        >
          <Button
            size="lg"
            variant="outline"
            className="border-primary/40 hover:bg-primary/10 hover:border-primary transition-all"
            onClick={() => navigate("/search?tab=properties&tier=partial")}
          >
            Explore All Listings
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default PartialProperties;
