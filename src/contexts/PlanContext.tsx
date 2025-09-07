import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlanLimits {
  maxActiveSpaces: number;
  maxItemsPerSpace: number;
  maxAITokensPerDay: number;
  hasAdvancedDashboard: boolean;
  hasAIAssistants: boolean;
  hasMultiClientManagement: boolean;
  hasActionHistory: boolean;
  supportResponseTime: string;
}

export interface UserPlan {
  id: string;
  user_id: string;
  plan_type: 'free' | 'pro';
  active_spaces_count: number;
  ai_tokens_used_today: number;
  ai_tokens_reset_date: string;
  created_at: string;
  updated_at: string;
}

interface PlanContextType {
  userPlan: UserPlan | null;
  planLimits: PlanLimits;
  loading: boolean;
  canCreateSpace: boolean;
  canAddItem: (currentItemCount: number) => boolean;
  canUseAIToken: boolean;
  hasFeatureAccess: (feature: keyof PlanLimits) => boolean;
  useAIToken: () => Promise<boolean>;
  refreshPlan: () => Promise<void>;
  updateActiveSpacesCount: () => Promise<void>;
  upgradeRequired: () => void;
}

const PLAN_LIMITS: Record<'free' | 'pro', PlanLimits> = {
  free: {
    maxActiveSpaces: 1,
    maxItemsPerSpace: 20,
    maxAITokensPerDay: 10,
    hasAdvancedDashboard: false,
    hasAIAssistants: false,
    hasMultiClientManagement: false,
    hasActionHistory: false,
    supportResponseTime: "48h"
  },
  pro: {
    maxActiveSpaces: 15,
    maxItemsPerSpace: 150,
    maxAITokensPerDay: 50,
    hasAdvancedDashboard: true,
    hasAIAssistants: true,
    hasMultiClientManagement: true,
    hasActionHistory: true,
    supportResponseTime: "24h"
  }
};

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (context === undefined) {
    // Si pas de contexte, retourner des valeurs par défaut pendant l'initialisation
    return {
      userPlan: null,
      planLimits: PLAN_LIMITS.free,
      loading: true,
      canCreateSpace: false,
      canAddItem: () => false,
      canUseAIToken: false,
      hasFeatureAccess: () => false,
      useAIToken: async () => false,
      refreshPlan: async () => {},
      updateActiveSpacesCount: async () => {},
      upgradeRequired: () => {}
    };
  }
  return context;
};

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const planLimits = userPlan ? PLAN_LIMITS[userPlan.plan_type] : PLAN_LIMITS.free;

  const fetchUserPlan = async () => {
    if (!user) {
      setUserPlan(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching user plan:', error);
        return;
      }

      if (!data) {
        // Create default free plan
        const { data: newPlan, error: insertError } = await supabase
          .from('user_plans')
          .insert({
            user_id: user.id,
            plan_type: 'free'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user plan:', insertError);
          return;
        }

        setUserPlan(newPlan as UserPlan);
      } else {
        setUserPlan(data as UserPlan);
      }
    } catch (error) {
      console.error('Error in fetchUserPlan:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshPlan = async () => {
    await fetchUserPlan();
  };

  const updateActiveSpacesCount = async () => {
    if (!user) return;
    
    try {
      // Importer le service NocoDB dynamiquement pour éviter les problèmes de dépendances circulaires
      const { default: nocodbService } = await import('@/services/nocodbService');
      
      // Compter les espaces du user actuel
      const spacesResponse = await nocodbService.getClients();
      const count = spacesResponse?.list?.length || 0;
      
      // Mettre à jour dans Supabase
      const { error } = await supabase
        .from('user_plans')
        .update({ active_spaces_count: count })
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating active spaces count:', error);
      } else {
        await fetchUserPlan(); // Refresh les données
      }
    } catch (error) {
      console.error('Error updating active spaces count:', error);
    }
  };

  const canCreateSpace = userPlan ? userPlan.active_spaces_count < planLimits.maxActiveSpaces : false;

  const canAddItem = (currentItemCount: number) => {
    return currentItemCount < planLimits.maxItemsPerSpace;
  };

  const canUseAIToken = userPlan ? userPlan.ai_tokens_used_today < planLimits.maxAITokensPerDay : false;

  const hasFeatureAccess = (feature: keyof PlanLimits) => {
    return planLimits[feature] as boolean;
  };

  const useAIToken = async (): Promise<boolean> => {
    if (!userPlan || !canUseAIToken) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_plans')
        .update({
          ai_tokens_used_today: userPlan.ai_tokens_used_today + 1
        })
        .eq('user_id', userPlan.user_id);

      if (error) {
        console.error('Error updating AI token usage:', error);
        return false;
      }

      setUserPlan(prev => prev ? {
        ...prev,
        ai_tokens_used_today: prev.ai_tokens_used_today + 1
      } : null);

      return true;
    } catch (error) {
      console.error('Error in useAIToken:', error);
      return false;
    }
  };

  const upgradeRequired = () => {
    toast({
      title: "Mise à niveau requise",
      description: "Cette fonctionnalité nécessite un plan Pro. Mettez à niveau pour débloquer toutes les fonctionnalités.",
      variant: "destructive"
    });
  };

  useEffect(() => {
    fetchUserPlan();
  }, [user]);

  const value = {
    userPlan,
    planLimits,
    loading,
    canCreateSpace,
    canAddItem,
    canUseAIToken,
    hasFeatureAccess,
    useAIToken,
    refreshPlan,
    updateActiveSpacesCount,
    upgradeRequired
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};