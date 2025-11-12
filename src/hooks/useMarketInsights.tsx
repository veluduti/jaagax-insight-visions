import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MarketInsight {
  id: string;
  city: string;
  locality: string | null;
  insight_type: string;
  data: any;
  ai_analysis: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

interface UseMarketInsightsOptions {
  city: string;
  locality?: string;
  autoRefresh?: boolean;
  forceRefresh?: boolean;
}

export const useMarketInsights = ({
  city,
  locality,
  autoRefresh = true,
  forceRefresh = false
}: UseMarketInsightsOptions) => {
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchInsights = async (force = false) => {
    try {
      setLoading(true);

      // First, try to get cached insights
      let query = supabase
        .from('market_insights')
        .select('*')
        .eq('city', city);

      if (locality) {
        query = query.eq('locality', locality);
      } else {
        query = query.is('locality', null);
      }

      const { data: cached, error: cacheError } = await query;

      // Check if cache is still valid
      const now = new Date();
      const validCache = cached?.filter(insight => 
        new Date(insight.expires_at) > now
      );

      if (validCache && validCache.length > 0 && !force && !forceRefresh) {
        setInsights(validCache);
        setLastUpdated(new Date(validCache[0].updated_at));
        setLoading(false);
        return validCache;
      }

      // Cache expired or force refresh, generate new insights
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke(
        'refresh-market-insights',
        {
          body: { 
            city, 
            locality: locality || null,
            forceRefresh: force || forceRefresh 
          }
        }
      );

      if (refreshError) throw refreshError;

      if (refreshData?.insights) {
        setInsights(refreshData.insights);
        setLastUpdated(new Date());
        
        if (!refreshData.cached) {
          toast({
            title: "Market insights updated",
            description: "Fresh market data and AI analysis generated",
          });
        }
        
        setLoading(false);
        return refreshData.insights;
      }

      throw new Error('No insights returned');

    } catch (error) {
      console.error('Error fetching market insights:', error);
      toast({
        title: "Error loading insights",
        description: "Failed to fetch market data. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return null;
    }
  };

  const refreshInsights = () => {
    return fetchInsights(true);
  };

  const getInsightByType = (type: string) => {
    return insights.find(insight => insight.insight_type === type);
  };

  const getMarketSummary = () => {
    return getInsightByType('market_summary');
  };

  const getPriceTrend = () => {
    return getInsightByType('price_trend');
  };

  const getInvestmentScore = () => {
    return getInsightByType('investment_score');
  };

  useEffect(() => {
    if (city) {
      fetchInsights();
    }

    // Auto-refresh every 24 hours if enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchInsights(true);
      }, 24 * 60 * 60 * 1000); // 24 hours

      return () => clearInterval(interval);
    }
  }, [city, locality, autoRefresh]);

  return {
    insights,
    loading,
    lastUpdated,
    refreshInsights,
    getInsightByType,
    getMarketSummary,
    getPriceTrend,
    getInvestmentScore,
  };
};