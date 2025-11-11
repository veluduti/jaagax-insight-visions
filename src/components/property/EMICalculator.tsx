import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator } from "lucide-react";
import { motion } from "framer-motion";

interface EMICalculatorProps {
  propertyPrice: number;
}

const EMICalculator = ({ propertyPrice }: EMICalculatorProps) => {
  const [loanAmount, setLoanAmount] = useState(propertyPrice * 0.8); // 80% of property price
  const [interestRate, setInterestRate] = useState(8.5); // 8.5% default
  const [tenure, setTenure] = useState(20); // 20 years default

  const calculateEMI = () => {
    const principal = loanAmount;
    const monthlyRate = interestRate / 12 / 100;
    const months = tenure * 12;
    
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    
    const totalAmount = emi * months;
    const totalInterest = totalAmount - principal;
    
    return {
      emi: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      totalInterest: Math.round(totalInterest),
      principal: Math.round(principal)
    };
  };

  const { emi, totalAmount, totalInterest, principal } = calculateEMI();

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            EMI Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loan Amount */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Loan Amount</Label>
              <span className="text-sm font-semibold">{formatINR(loanAmount)}</span>
            </div>
            <Slider
              value={[loanAmount]}
              onValueChange={(value) => setLoanAmount(value[0])}
              min={propertyPrice * 0.1}
              max={propertyPrice * 0.9}
              step={100000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatINR(propertyPrice * 0.1)}</span>
              <span>{formatINR(propertyPrice * 0.9)}</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Interest Rate (p.a.)</Label>
              <span className="text-sm font-semibold">{interestRate.toFixed(1)}%</span>
            </div>
            <Slider
              value={[interestRate]}
              onValueChange={(value) => setInterestRate(value[0])}
              min={6}
              max={15}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>6%</span>
              <span>15%</span>
            </div>
          </div>

          {/* Tenure */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Loan Tenure</Label>
              <span className="text-sm font-semibold">{tenure} years</span>
            </div>
            <Slider
              value={[tenure]}
              onValueChange={(value) => setTenure(value[0])}
              min={5}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 years</span>
              <span>30 years</span>
            </div>
          </div>

          {/* Results */}
          <div className="pt-4 border-t space-y-3">
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Monthly EMI</p>
              <p className="text-3xl font-bold text-primary">{formatINR(emi)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-xs text-muted-foreground mb-1">Principal</p>
                <p className="font-semibold">{formatINR(principal)}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-xs text-muted-foreground mb-1">Total Interest</p>
                <p className="font-semibold">{formatINR(totalInterest)}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-accent/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Total Amount Payable</p>
              <p className="text-xl font-bold">{formatINR(totalAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EMICalculator;
