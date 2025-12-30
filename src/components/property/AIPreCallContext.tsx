import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerContext } from "@/hooks/useBuyerContext";
import { toast } from "sonner";
import { 
  Brain, 
  DollarSign, 
  Scale, 
  Calendar, 
  Shield,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2
} from "lucide-react";

interface AIPreCallContextProps {
  open: boolean;
  onClose: () => void;
  propertyId: number;
  propertyTitle: string;
  onContextSaved: (contextId: string) => void;
}

const INTENT_OPTIONS = [
  { id: 'price_negotiation', label: 'Price Negotiation', icon: DollarSign, description: 'Get help negotiating the best price' },
  { id: 'legal_clarity', label: 'Legal Clarity', icon: Scale, description: 'Understand documentation and legal aspects' },
  { id: 'visit_planning', label: 'Visit Planning', icon: Calendar, description: 'Schedule and plan property visits' },
  { id: 'builder_trust', label: 'Builder Trust', icon: Shield, description: 'Verify builder credentials and track record' },
];

const AIPreCallContext = ({ open, onClose, propertyId, propertyTitle, onContextSaved }: AIPreCallContextProps) => {
  const { user } = useAuth();
  const { buyerContext } = useBuyerContext();
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'intent' | 'processing' | 'complete'>('intent');

  const toggleIntent = (intentId: string) => {
    setSelectedIntents(prev => 
      prev.includes(intentId) 
        ? prev.filter(i => i !== intentId)
        : [...prev, intentId]
    );
  };

  const handleSubmit = async () => {
    if (selectedIntents.length === 0) {
      toast.error('Please select at least one intent');
      return;
    }

    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Check for existing context
      const { data: existing } = await supabase
        .from('agent_call_context')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('property_id', propertyId)
        .maybeSingle();

      let contextId: string;

      if (existing) {
        // Update existing context
        const { error } = await supabase
          .from('agent_call_context')
          .update({
            intent: selectedIntents,
            buyer_fear: buyerContext?.primary_fear || [],
            buyer_context: buyerContext ? {
              life_stage: buyerContext.life_stage,
              budget_comfort: buyerContext.budget_comfort,
              decision_mode: buyerContext.decision_mode,
              confidence_score: buyerContext.confidence_score
            } : null,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
        contextId = existing.id;
      } else {
        // Insert new context
        const { data, error } = await supabase
          .from('agent_call_context')
          .insert({
            buyer_id: user.id,
            property_id: propertyId,
            intent: selectedIntents,
            buyer_fear: buyerContext?.primary_fear || [],
            buyer_context: buyerContext ? {
              life_stage: buyerContext.life_stage,
              budget_comfort: buyerContext.budget_comfort,
              decision_mode: buyerContext.decision_mode,
              confidence_score: buyerContext.confidence_score
            } : null,
            status: 'pending'
          })
          .select('id')
          .single();

        if (error) throw error;
        contextId = data.id;
      }

      // Auto-assign agent using edge function
      const { data: assignData, error: assignError } = await supabase.functions.invoke('ai-assign-agent', {
        body: {
          propertyId,
          buyerContext: {
            intent: selectedIntents,
            fears: buyerContext?.primary_fear || [],
            life_stage: buyerContext?.life_stage,
            budget_comfort: buyerContext?.budget_comfort
          }
        }
      });

      if (assignError) {
        console.error('Agent assignment error:', assignError);
      } else if (assignData?.agentId) {
        // Update context with assigned agent
        await supabase
          .from('agent_call_context')
          .update({ agent_id: assignData.agentId })
          .eq('id', contextId);
      }

      setStep('complete');
      
      setTimeout(() => {
        onContextSaved(contextId);
        onClose();
        setStep('intent');
        setSelectedIntents([]);
      }, 1500);

    } catch (error: any) {
      console.error('Error saving context:', error);
      toast.error('Failed to save context. Please try again.');
      setStep('intent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { if (!loading) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Talk to AI Expert
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'intent' && (
            <motion.div
              key="intent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                For: <span className="font-medium text-foreground">{propertyTitle}</span>
              </p>

              <div className="space-y-2">
                <Label className="text-base font-medium">What help do you need?</Label>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
              </div>

              <div className="space-y-3">
                {INTENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedIntents.includes(option.id);
                  
                  return (
                    <motion.div
                      key={option.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => toggleIntent(option.id)}
                      className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={option.id}
                        checked={isSelected}
                        onCheckedChange={() => toggleIntent(option.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <Label htmlFor={option.id} className="font-medium cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full gap-2"
                disabled={selectedIntents.length === 0}
              >
                Continue to Slot Selection
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative p-4 rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Matching you with the best expert...</p>
                <p className="text-sm text-muted-foreground">Analyzing your needs and preferences</p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="p-4 rounded-full bg-green-500/10"
              >
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </motion.div>
              <div className="text-center space-y-2">
                <p className="font-medium text-green-600">Expert Matched!</p>
                <p className="text-sm text-muted-foreground">Redirecting to slot selection...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default AIPreCallContext;
