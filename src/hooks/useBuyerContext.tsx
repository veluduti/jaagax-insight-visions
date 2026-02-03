import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
      const { data, error: fetchError } = await supabase
        .from('buyer_context')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setBuyerContext(data as BuyerContext);
      } else {
        setBuyerContext(null);
      }
    } catch (err) {
      console.error('Error fetching buyer context:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch buyer context'));
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
      const { data: newContext, error: insertError } = await supabase
        .from('buyer_context')
        .insert({
          user_id: user.id,
          life_stage: data.life_stage,
          budget_comfort: data.budget_comfort,
          primary_fear: data.primary_fear,
          decision_mode: data.decision_mode,
          confidence_score: data.confidence_score ?? 50,
          last_ai_update: data.last_ai_update,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setBuyerContext(newContext as BuyerContext);
      return newContext as BuyerContext;
    } catch (err) {
      console.error('Error creating buyer context:', err);
      setError(err instanceof Error ? err : new Error('Failed to create buyer context'));
      return null;
    }
  }, [user?.id]);

  const updateBuyerContext = useCallback(async (data: BuyerContextInput): Promise<BuyerContext | null> => {
    if (!user?.id || !buyerContext) {
      setError(new Error('User not authenticated or no context exists'));
      return null;
    }

    try {
      const { data: updatedContext, error: updateError } = await supabase
        .from('buyer_context')
        .update({
          life_stage: data.life_stage ?? buyerContext.life_stage,
          budget_comfort: data.budget_comfort ?? buyerContext.budget_comfort,
          primary_fear: data.primary_fear ?? buyerContext.primary_fear,
          decision_mode: data.decision_mode ?? buyerContext.decision_mode,
          confidence_score: data.confidence_score ?? buyerContext.confidence_score,
          last_ai_update: data.last_ai_update ?? buyerContext.last_ai_update,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setBuyerContext(updatedContext as BuyerContext);
      return updatedContext as BuyerContext;
    } catch (err) {
      console.error('Error updating buyer context:', err);
      setError(err instanceof Error ? err : new Error('Failed to update buyer context'));
      return null;
    }
  }, [user?.id, buyerContext]);

  const upsertBuyerContext = useCallback(async (data: BuyerContextInput): Promise<BuyerContext | null> => {
    if (!user?.id) {
      setError(new Error('User not authenticated'));
      return null;
    }

    try {
      const { data: upsertedContext, error: upsertError } = await supabase
        .from('buyer_context')
        .upsert({
          user_id: user.id,
          life_stage: data.life_stage,
          budget_comfort: data.budget_comfort,
          primary_fear: data.primary_fear,
          decision_mode: data.decision_mode,
          confidence_score: data.confidence_score ?? 50,
          last_ai_update: data.last_ai_update,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      setBuyerContext(upsertedContext as BuyerContext);
      return upsertedContext as BuyerContext;
    } catch (err) {
      console.error('Error upserting buyer context:', err);
      setError(err instanceof Error ? err : new Error('Failed to save buyer context'));
      return null;
    }
  }, [user?.id]);

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
