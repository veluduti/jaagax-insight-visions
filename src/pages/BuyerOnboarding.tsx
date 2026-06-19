import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BuyerOnboarding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard/buyer", { replace: true });
  }, [navigate]);

  return null;
};

export default BuyerOnboarding;

  { id: "price_fall", label: "Price fall", icon: "📉" },
  { id: "builder_delay", label: "Builder delay", icon: "🏗️" },
  { id: "emi_pressure", label: "EMI pressure", icon: "💸" },
  { id: "job_stability", label: "Job stability", icon: "💼" },
  { id: "legal_trust", label: "Legal / trust", icon: "⚖️" },
];

const LIFE_STAGES = [
  { id: "single", label: "Single", icon: "👤" },
  { id: "newly_married", label: "Newly Married", icon: "💑" },
  { id: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { id: "retired", label: "Retired", icon: "🏖️" },
  { id: "investor", label: "Investor", icon: "📊" },
];

const BUDGET_LABELS: { value: number; label: BudgetComfort }[] = [
  { value: 0, label: "strict" },
  { value: 50, label: "flexible" },
  { value: 100, label: "premium" },
];

const BuyerOnboarding = () => {
  const navigate = useNavigate();
  const { upsertBuyerContext } = useBuyerContext();
  
  const [step, setStep] = useState(1);
  const [selectedFears, setSelectedFears] = useState<string[]>([]);
  const [selectedLifeStage, setSelectedLifeStage] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleFear = (fearId: string) => {
    setSelectedFears((prev) =>
      prev.includes(fearId)
        ? prev.filter((f) => f !== fearId)
        : [...prev, fearId]
    );
  };

  const getBudgetComfort = (): BudgetComfort => {
    if (budgetValue <= 33) return "strict";
    if (budgetValue <= 66) return "flexible";
    return "premium";
  };

  const canProceed = () => {
    if (step === 1) return selectedFears.length > 0;
    if (step === 2) return selectedLifeStage !== null;
    return true;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Call AI edge function to get decision_mode and confidence_score
      const { data: aiResult, error: aiError } = await supabase.functions.invoke(
        "ai-buyer-context",
        {
          body: {
            fears: selectedFears,
            life_stage: selectedLifeStage,
            budget_comfort: getBudgetComfort(),
          },
        }
      );

      if (aiError) {
        console.error("AI analysis error:", aiError);
        // Fallback if AI fails
        await saveBuyerContext("buy_now", 50);
      } else {
        await saveBuyerContext(
          aiResult.decision_mode as DecisionMode,
          aiResult.confidence_score as number
        );
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const saveBuyerContext = async (
    decisionMode: DecisionMode,
    confidenceScore: number
  ) => {
    const result = await upsertBuyerContext({
      primary_fear: selectedFears,
      life_stage: selectedLifeStage,
      budget_comfort: getBudgetComfort(),
      decision_mode: decisionMode,
      confidence_score: confidenceScore,
      last_ai_update: new Date().toISOString(),
    });

    if (result) {
      toast.success("Profile created!");
      
      // Redirect based on decision_mode
      if (decisionMode === "buy_now") {
        navigate("/search");
      } else {
        navigate("/dashboard/buyer");
      }
    } else {
      toast.error("Failed to save profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-8 justify-center">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Fears */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-center">
                What worries you most about buying a home?
              </h2>
              <p className="text-muted-foreground text-center text-sm">
                Select all that apply
              </p>

              <div className="space-y-3">
                {FEARS.map((fear) => (
                  <button
                    key={fear.id}
                    onClick={() => toggleFear(fear.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 text-left ${
                      selectedFears.includes(fear.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-2xl">{fear.icon}</span>
                    <span className="font-medium">{fear.label}</span>
                    {selectedFears.includes(fear.id) && (
                      <Check className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Life Stage */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-center">
                What's your life stage?
              </h2>

              <div className="space-y-3">
                {LIFE_STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => setSelectedLifeStage(stage.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 text-left ${
                      selectedLifeStage === stage.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-2xl">{stage.icon}</span>
                    <span className="font-medium">{stage.label}</span>
                    {selectedLifeStage === stage.id && (
                      <Check className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Budget Comfort */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <h2 className="text-2xl font-bold text-center">
                How flexible is your budget?
              </h2>

              <div className="px-4 space-y-8">
                <Slider
                  value={[budgetValue]}
                  onValueChange={(val) => setBudgetValue(val[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />

                <div className="flex justify-between text-sm">
                  <span
                    className={`font-medium ${
                      budgetValue <= 33 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Strict
                  </span>
                  <span
                    className={`font-medium ${
                      budgetValue > 33 && budgetValue <= 66
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    Flexible
                  </span>
                  <span
                    className={`font-medium ${
                      budgetValue > 66 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Premium
                  </span>
                </div>

                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Your budget is</p>
                  <p className="text-xl font-bold text-primary capitalize">
                    {getBudgetComfort()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : step === 3 ? (
              "Complete"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BuyerOnboarding;
