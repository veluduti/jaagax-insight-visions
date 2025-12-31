import { motion } from "framer-motion";
import { ShieldCheck, Percent, MapPin, Clock } from "lucide-react";

const HotelTrustBanner = () => {
  const trustPoints = [
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: "Verified Partners",
      description: "All hotels are vetted and verified for quality"
    },
    {
      icon: <Percent className="h-6 w-6" />,
      title: "Exclusive Discounts",
      description: "Up to 25% off with JaagaX partnership rates"
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "Location Matched",
      description: "Hotels near your shortlisted properties"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Flexible Booking",
      description: "Easy cancellation and modification policies"
    }
  ];

  return (
    <section className="py-8 border-y border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {trustPoints.map((point, index) => (
          <motion.div
            key={point.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center text-center space-y-2"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {point.icon}
            </div>
            <h3 className="font-semibold text-sm">{point.title}</h3>
            <p className="text-xs text-muted-foreground">{point.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default HotelTrustBanner;
