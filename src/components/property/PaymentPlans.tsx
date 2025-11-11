import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, TrendingUp, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface PaymentPlansProps {
  propertyPrice: number;
  status: string;
}

const PaymentPlans = ({ propertyPrice, status }: PaymentPlansProps) => {
  const isUnderConstruction = status.toLowerCase().includes("construction");

  const constructionPlan = [
    { stage: "Booking Amount", percentage: 10, description: "At the time of booking" },
    { stage: "On Commencement", percentage: 10, description: "Foundation work starts" },
    { stage: "Plinth Level", percentage: 15, description: "Ground floor completion" },
    { stage: "1st Floor Slab", percentage: 15, description: "First floor structure" },
    { stage: "3rd Floor Slab", percentage: 15, description: "Third floor structure" },
    { stage: "Roof Slab", percentage: 15, description: "Top floor completion" },
    { stage: "On Completion", percentage: 10, description: "Final finishing work" },
    { stage: "On Registration", percentage: 10, description: "Property registration" },
  ];

  const readyPlan = [
    { stage: "Token Amount", percentage: 5, description: "Reserve the property" },
    { stage: "Down Payment", percentage: 15, description: "Within 30 days of booking" },
    { stage: "Home Loan Approval", percentage: 80, description: "Bank loan disbursement" },
  ];

  const plan = isUnderConstruction ? constructionPlan : readyPlan;

  const calculateAmount = (percentage: number) => {
    const amount = (propertyPrice * percentage) / 100;
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(amount / 100000).toFixed(2)} L`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Plans
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {isUnderConstruction 
              ? "Construction-linked payment plan with flexible installments"
              : "Simple payment structure for ready-to-move-in property"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors border border-border/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{item.stage}</span>
                  <Badge variant="secondary" className="text-xs">
                    {item.percentage}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <div className="text-right ml-4">
                <p className="font-bold text-primary">{calculateAmount(item.percentage)}</p>
              </div>
            </div>
          ))}

          <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Flexible Payment Options</h4>
                <p className="text-sm text-muted-foreground">
                  • Bank loans available with leading banks at competitive rates
                  <br />
                  • Easy EMI options starting from 6.5% p.a.
                  <br />
                  • Get pre-approved loan in 48 hours
                  <br />
                  • Special discounts on bulk bookings
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-accent/30 border border-border/50">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Important Note</h4>
                <p className="text-sm text-muted-foreground">
                  Payment plans are subject to change. GST and registration charges are additional.
                  Please verify with our sales team for the latest payment schedule.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PaymentPlans;
