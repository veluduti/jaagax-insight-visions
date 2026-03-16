import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Info, Clock, CreditCard, Baby, Dog, Cigarette, ShieldCheck, AlertTriangle } from "lucide-react";

interface HotelPoliciesProps {
  hotel: {
    check_in_time?: string;
    check_out_time?: string;
    pet_friendly?: boolean;
    smoking_allowed?: boolean;
    accepts_cards?: boolean;
  };
}

const HotelPolicies = ({ hotel }: HotelPoliciesProps) => {
  const policies = [
    {
      title: "Check-in & Check-out",
      icon: <Clock className="h-5 w-5" />,
      items: [
        `Check-in from ${hotel.check_in_time || "14:00"}`,
        `Check-out by ${hotel.check_out_time || "12:00"}`,
        "Early check-in subject to availability",
        "Late check-out may incur additional charges",
      ],
    },
    {
      title: "Cancellation Policy",
      icon: <AlertTriangle className="h-5 w-5" />,
      items: [
        "Free cancellation up to 48 hours before check-in",
        "50% charge for cancellation within 24-48 hours",
        "Full charge for no-show or same-day cancellation",
        "Refund processed within 5-7 business days",
      ],
    },
    {
      title: "Payment",
      icon: <CreditCard className="h-5 w-5" />,
      items: [
        hotel.accepts_cards ? "All major credit/debit cards accepted" : "Cash payments preferred",
        "UPI and net banking accepted",
        "GST invoice provided",
        "Security deposit may be required at check-in",
      ],
    },
    {
      title: "House Rules",
      icon: <ShieldCheck className="h-5 w-5" />,
      items: [
        hotel.pet_friendly ? "Pets allowed (charges may apply)" : "No pets allowed",
        hotel.smoking_allowed ? "Smoking in designated areas" : "Strict no-smoking policy",
        "Valid government ID required at check-in",
        "Visitors must register at the front desk",
      ],
    },
    {
      title: "Children & Extra Beds",
      icon: <Baby className="h-5 w-5" />,
      items: [
        "Children under 5 stay free",
        "Extra bed available on request (₹1,500/night)",
        "Cribs available on request",
        "Children's menu available at restaurant",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Info className="h-5 w-5 text-primary" />
        Hotel Policies
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {policies.map((policy, i) => (
          <motion.div
            key={policy.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  {policy.icon}
                  <h4 className="font-semibold text-sm text-foreground">{policy.title}</h4>
                </div>
                <ul className="space-y-2">
                  {policy.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HotelPolicies;
