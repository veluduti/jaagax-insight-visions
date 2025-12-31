import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface DoubleTapLikeProps {
  show: boolean;
}

const DoubleTapLike = ({ show }: DoubleTapLikeProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
        >
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.2, 1] }}
            transition={{ duration: 0.4 }}
          >
            <Heart 
              className="h-32 w-32 text-red-500 fill-red-500 drop-shadow-2xl" 
              style={{ 
                filter: "drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))" 
              }}
            />
          </motion.div>
          
          {/* Particle effects */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{ 
                scale: [0, 1, 0],
                x: Math.cos((i * 30 * Math.PI) / 180) * 100,
                y: Math.sin((i * 30 * Math.PI) / 180) * 100,
                opacity: [1, 1, 0]
              }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="absolute"
            >
              <Heart className="h-4 w-4 text-red-400 fill-red-400" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DoubleTapLike;
