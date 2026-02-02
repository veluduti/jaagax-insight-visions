import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type BudgetComfort = 'strict' | 'flexible' | 'premium';
export type DecisionMode = 'buy_now' | 'wait' | 'rent_then_buy';

export interface BuyerContext {
  id: string;
  user_id: string;
  life_stage: string | null;
  budget_comfort: BudgetComfort | null;
  primary_fear: string[] | null;
  decision_mode: DecisionMode | null;
  confidence_score: number;
  last_ai_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuyerContextInput {
  life_stage?: string | null;
  budget_comfort?: BudgetComfort | null;
  primary_fear?: string[] | null;
  decision_mode?: DecisionMode | null;
  confidence_score?: number;
  last_ai_update?: string | null;
}

interface UseBuyerContextReturn {
  buyerContext: BuyerContext | null;
  loading: boolean;
  error: Error | null;
  hasBuyerContext: boolean;
  fetchBuyerContext: () => Promise<void>;
  updateBuyerContext: (data: BuyerContextInput) => Promise<BuyerContext | null>;
  createBuyerContext: (data: BuyerContextInput) => Promise<BuyerContext | null>;
  upsertBuyerContext: (data: BuyerContextInput) => Promise<BuyerContext | null>;
}

// Stubbed version - buyer_context table doesn't exist yet
export const useBuyerContext = (): UseBuyerContextReturn => {
  const { user } = useAuth();
  const [buyerContext, setBuyerContext] = useState<BuyerContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBuyerContext = useCallback(async () => {
    if (!user?.id) {
      setBuyerContext(null);
      return;
    }
    // Stub: buyer_context table doesn't exist yet
    setLoading(false);
  }, [user?.id]);

  const createBuyerContext = useCallback(async (data: BuyerContextInput): Promise<BuyerContext | null> => {
    if (!user?.id) {
      setError(new Error('User not authenticated'));
      return null;
    }
    // Stub: Return mock context
    const mockContext: BuyerContext = {
      id: crypto.randomUUID(),
      user_id: user.id,
      life_stage: data.life_stage || null,
      budget_comfort: data.budget_comfort || null,
      primary_fear: data.primary_fear || null,
      decision_mode: data.decision_mode || null,
      confidence_score: data.confidence_score || 50,
      last_ai_update: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setBuyerContext(mockContext);
    return mockContext;
  }, [user?.id]);

  const updateBuyerContext = useCallback(async (data: BuyerContextInput): Promise<BuyerContext | null> => {
    if (!user?.id || !buyerContext) {
      setError(new Error('User not authenticated or no context'));
      return null;
    }
    const updatedContext: BuyerContext = {
      ...buyerContext,
      ...data,
      updated_at: new Date().toISOString(),
    };
    setBuyerContext(updatedContext);
    return updatedContext;
  }, [user?.id, buyerContext]);

  const upsertBuyerContext = useCallback(async (data: BuyerContextInput): Promise<BuyerContext | null> => {
    if (!user?.id) {
      setError(new Error('User not authenticated'));
      return null;
    }
    if (buyerContext) {
      return updateBuyerContext(data);
    }
    return createBuyerContext(data);
  }, [user?.id, buyerContext, updateBuyerContext, createBuyerContext]);

  useEffect(() => {
    fetchBuyerContext();
  }, [fetchBuyerContext]);

  return {
    buyerContext,
    loading,
    error,
    hasBuyerContext: buyerContext !== null,
    fetchBuyerContext,
    updateBuyerContext,
    createBuyerContext,
    upsertBuyerContext,
  };
};