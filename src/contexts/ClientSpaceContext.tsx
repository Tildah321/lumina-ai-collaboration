import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface Task {
  Id: string;
  id: string;
  titre: string;
  statut: 'à faire' | 'en cours' | 'en attente' | 'fait';
  priorité: 'faible' | 'moyenne' | 'haute';
  deadline: string;
  time_spent: number | string;
  projet_id: string;
  assigné_a: 'client' | 'moi';
}

interface Milestone {
  Id: string;
  id: string;
  titre: string;
  terminé: boolean | string;
  deadline: string;
  description: string;
  projet_id: string;
}

interface Invoice {
  Id: string;
  id: string;
  montant: number;
  payée: boolean | string;
  date_emission: string;
  date_paiement: string;
  projet_id: string;
  lien_facture: string;
}

interface ClientSpaceData {
  tasks: Task[];
  milestones: Milestone[];
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: number;
}

interface ClientSpaceContextType extends ClientSpaceData {
  refetch: () => Promise<void>;
  updateTaskInCache: (taskId: string, updates: Partial<Task>) => void;
}

const ClientSpaceContext = createContext<ClientSpaceContextType | undefined>(undefined);

// Cache simple avec timestamp
const cache = new Map<string, { data: ClientSpaceData; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const activeLoaders = new Map<string, Promise<ClientSpaceData>>();

export const ClientSpaceProvider: React.FC<{
  children: React.ReactNode;
  spaceId: string;
  isClient?: boolean;
}> = ({ children, spaceId, isClient = false }) => {
  const { toast } = useToast();
  const cacheKey = `${spaceId}-${isClient ? 'client' : 'admin'}`;

  const [data, setData] = useState<ClientSpaceData>({
    tasks: [],
    milestones: [],
    invoices: [],
    isLoading: true,
    error: null,
    lastRefresh: 0
  });

  const loadData = async (): Promise<ClientSpaceData> => {
    console.log('🚀 [ClientSpace] Chargement unique pour:', spaceId);
    
    // Éviter les requêtes multiples
    if (activeLoaders.has(cacheKey)) {
      console.log('⏳ [ClientSpace] Chargement déjà en cours, attente...');
      return await activeLoaders.get(cacheKey)!;
    }

    const loader = async (): Promise<ClientSpaceData> => {
      const loadingData: ClientSpaceData = {
        tasks: [],
        milestones: [],
        invoices: [],
        isLoading: true,
        error: null,
        lastRefresh: Date.now()
      };

      try {
        console.log('📊 [ClientSpace] Chargement des données du space...');
        const {
          tasks: tasksResponse,
          milestones: milestonesResponse,
          invoices: invoicesResponse,
        } = await nocodbService.getSpaceData(spaceId, isClient, {
          // Inclure toutes les tâches du projet, sans filtrer par utilisateur
          onlyCurrentUser: false,
        });

        // Normaliser les données - inclure TOUTES les tâches (admin et client)
        const tasks = (tasksResponse?.list || []).map((task: any) => {
          const assigneA = task.assigne_a || task.assigné_a || 'moi';
          return {
            ...task,
            id: task.Id || task.id,
            assigne_a: assigneA,
            assigné_a: assigneA,
            priorité: task.priorite || task.priorité,
            time_spent: task.time_spent || 0
          };
        });

        const milestones = (milestonesResponse?.list || []).map((milestone: any) => ({
          ...milestone,
          id: milestone.Id || milestone.id
        }));

        const invoices = (invoicesResponse?.list || []).map((invoice: any) => ({
          ...invoice,
          id: invoice.Id || invoice.id
        }));

        const finalData: ClientSpaceData = {
          tasks,
          milestones,
          invoices,
          isLoading: false,
          error: null,
          lastRefresh: Date.now()
        };

        console.log('✅ [ClientSpace] Données chargées:', {
          tasks: tasks.length,
          milestones: milestones.length,
          invoices: invoices.length
        });

        // Mettre en cache
        cache.set(cacheKey, {
          data: finalData,
          timestamp: Date.now()
        });

        return finalData;

      } catch (error) {
        console.error('❌ [ClientSpace] Erreur:', error);
        
        const errorData: ClientSpaceData = {
          tasks: [],
          milestones: [],
          invoices: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          lastRefresh: Date.now()
        };

        if (error instanceof Error && error.message.includes('Too many requests')) {
          toast({
            title: "Limite de requêtes atteinte",
            description: "Rechargement automatique dans 10 secondes",
            variant: "default"
          });
          
          // Réessayer après 10 secondes
          setTimeout(() => {
            refetch();
          }, 10000);
        } else {
          toast({
            title: "Erreur de chargement",
            description: "Impossible de charger les données de l'espace",
            variant: "destructive"
          });
        }

        return errorData;
      } finally {
        activeLoaders.delete(cacheKey);
      }
    };

    const promise = loader();
    activeLoaders.set(cacheKey, promise);
    return promise;
  };

  const refetch = async () => {
    console.log('🔄 [ClientSpace] Rechargement forcé pour:', spaceId);
    cache.delete(cacheKey);
    activeLoaders.delete(cacheKey);
    
    setData(prev => ({ ...prev, isLoading: true, error: null }));
    const newData = await loadData();
    setData(newData);
  };

  const updateTaskInCache = (taskId: string, updates: Partial<Task>) => {
    setData(prev => {
      const updatedTasks = prev.tasks.map(task =>
        task.Id === taskId || task.id === taskId ? { ...task, ...updates } : task
      );
      
      const updatedData = { ...prev, tasks: updatedTasks };
      
      // Mettre à jour le cache aussi
      cache.set(cacheKey, {
        data: updatedData,
        timestamp: Date.now()
      });
      
      return updatedData;
    });
  };

  // Effet de chargement initial
  useEffect(() => {
    if (!spaceId) return;

    // Vérifier le cache d'abord
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 [ClientSpace] Données trouvées dans le cache');
      setData(cached.data);
      return;
    }

    // Chargement des données
    const load = async () => {
      const newData = await loadData();
      setData(newData);
    };

    load();
  }, [spaceId, cacheKey]);

  const contextValue: ClientSpaceContextType = {
    ...data,
    refetch,
    updateTaskInCache
  };

  return (
    <ClientSpaceContext.Provider value={contextValue}>
      {children}
    </ClientSpaceContext.Provider>
  );
};

export const useClientSpace = (): ClientSpaceContextType => {
  const context = useContext(ClientSpaceContext);
  if (!context) {
    throw new Error('useClientSpace must be used within a ClientSpaceProvider');
  }
  return context;
};