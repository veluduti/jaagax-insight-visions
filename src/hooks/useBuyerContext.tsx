import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

export const useBuyerContext = (): UseBuyerContextReturn => {
  const { user } = useAuth();
  const [buyerContext, setBuyerContext] = useState<BuyerContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBuyerContext = useCallback(async () => {
    if (!user?.id) {
      setBuyerContext(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('buyer_context')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setBuyerContext(data as BuyerContext | null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch buyer context'));
      setBuyerContext(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createBuyerContext = useCallback(async (data: BuyerContextInput): Promise<BuyerContext | null> => {
    if (!user?.id) {
      setError(new Error('User not authenticated'));
      return null;
    }

    try {
      setError(null);

      const { data: newContext, error: insertError } = await supabase
        .from('buyer_context')
        .insert({
          user_id: user.id,
          ...data,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setBuyerContext(newContext as BuyerContext);
      return newContext as BuyerContext;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create buyer context'));
      return null;
    }
  }, [user?.id]);

  const updateBuyerContext = useCallback(async (data: BuyerContextInput): Promise<BuyerContext | null> => {
    if (!user?.id) {
      setError(new Error('User not authenticated'));
      return null;
    }

    try {
      setError(null);

      const { data: updatedContext, error: updateError } = await supabase
        .from('buyer_context')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setBuyerContext(updatedContext as BuyerContext);
      return updatedContext as BuyerContext;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update buyer context'));
      return null;
    }
  }, [user?.id]);

  const upsertBuyerContext = useCallback(async (data: BuyerContextInput): Promise<BuyerContext | null> => {
    if (!user?.id) {
      setError(new Error('User not authenticated'));
      return null;
    }

    try {
      setError(null);

      const { data: upsertedContext, error: upsertError } = await supabase
        .from('buyer_context')
        .upsert({
          user_id: user.id,
          ...data,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setBuyerContext(upsertedContext as BuyerContext);
      return upsertedContext as BuyerContext;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to upsert buyer context'));
      return null;
    }
  }, [user?.id]);

  // Auto-fetch on login
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
