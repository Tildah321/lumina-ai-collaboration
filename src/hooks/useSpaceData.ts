import { useState, useEffect } from 'react';
import nocodbService from '@/services/nocodbService';
import { useToast } from '@/hooks/use-toast';

interface Task {
  Id: string;
  id: string;
  titre: string;
  statut: 'à faire' | 'en cours' | 'en attente' | 'fait';
  priorite: string;
  priorité: 'faible' | 'moyenne' | 'haute';
  deadline: string;
  time_spent: number | string;
  projet_id: string;
  assigne_a: string;
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

interface SpaceData {
  tasks: Task[];
  milestones: Milestone[];
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
}

// Cache très agressif pour NocoDB gratuit
const spaceDataCache = new Map<string, { data: SpaceData; timestamp: number }>();
const loadingPromises = new Map<string, Promise<void>>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes - maximum pour éviter les appels

export const useSpaceData = (spaceId: string, isPublic = false) => {
  const { toast } = useToast();
  const [data, setData] = useState<SpaceData>({
    tasks: [],
    milestones: [],
    invoices: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!spaceId) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const cached = spaceDataCache.get(spaceId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && !cached.data.isLoading) {
      console.log('📦 Données trouvées dans le cache');
      setData(cached.data);
      return;
    }

    const existingPromise = loadingPromises.get(spaceId);
    if (existingPromise) {
      existingPromise.then(() => {
        const updated = spaceDataCache.get(spaceId);
        if (updated) setData(updated.data);
      });
      return;
    }

    const promise = loadSpaceData();
    loadingPromises.set(spaceId, promise);

    return () => {
      loadingPromises.delete(spaceId);
    };
  }, [spaceId, isPublic, toast]);

  const loadSpaceData = async () => {
    const newData: SpaceData = {
      tasks: [],
      milestones: [],
      invoices: [],
      isLoading: true,
      error: null
    };
    
    setData(newData);

    try {
      const { tasks: tasksResult, milestones: milestonesResult, invoices: invoicesResult } =
        await nocodbService.getSpaceData(spaceId, isPublic, { onlyCurrentUser: !isPublic });

      const tasks = (tasksResult.list || []).map((task: any) => ({
        ...task,
        id: task.Id || task.id,
        assigné_a: task.assigne_a || task.assigné_a,
        priorité: task.priorite || task.priorité,
        time_spent: task.time_spent || 0
      }));

      const milestones = (milestonesResult.list || []).map((milestone: any) => ({
        ...milestone,
        id: milestone.Id || milestone.id
      }));

      const invoices = (invoicesResult.list || []).map((invoice: any) => ({
        ...invoice,
        id: invoice.Id || invoice.id
      }));

      const finalData: SpaceData = {
        tasks,
        milestones,
        invoices,
        isLoading: false,
        error: null
      };
      
      // Logging minimal pour réduire le bruit
      
      spaceDataCache.set(spaceId, { data: finalData, timestamp: Date.now() });
      setData(finalData);
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      const errorData: SpaceData = {
        tasks: [],
        milestones: [],
        invoices: [],
        isLoading: false,
        error: errorMessage
      };
      
      if (errorMessage.includes('Too many requests')) {
        toast({
          title: "Limite de requêtes",
          description: "Rechargement automatique dans 5 secondes",
          variant: "default"
        });
        
        // Réessayer après 5 secondes seulement
        setTimeout(() => {
          spaceDataCache.delete(spaceId);
          loadingPromises.delete(spaceId);
          loadSpaceData();
        }, 5000);
      } else {
        toast({
          title: "Erreur de chargement",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      spaceDataCache.set(spaceId, { data: errorData, timestamp: Date.now() });
      setData(errorData);
    } finally {
        loadingPromises.delete(spaceId);
      }
    };

  const refetch = () => {
    console.log('🔄 Rechargement forcé des données pour l\'espace:', spaceId);
    spaceDataCache.delete(spaceId);
    loadingPromises.delete(spaceId);
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    const loadPromise = loadSpaceData();
    loadingPromises.set(spaceId, loadPromise);
  };

  // Fonction pour mettre à jour une tâche dans le cache
  const updateTaskInCache = (taskId: string, updates: Partial<Task>) => {
    const cached = spaceDataCache.get(spaceId);
    if (cached) {
      const updatedTasks = cached.data.tasks.map(task => {
        const idMatch = (task.Id || task.id) === taskId;
        return idMatch ? { ...task, ...updates } : task;
      });
      const updatedData = { ...cached.data, tasks: updatedTasks };
      spaceDataCache.set(spaceId, { data: updatedData, timestamp: Date.now() });
      setData(updatedData);
    }
  };

  // Ajouter une tâche au cache (sans refetch)
  const addTaskToCache = (task: Task) => {
    const cached = spaceDataCache.get(spaceId);
    if (cached) {
      const updatedTasks = [...cached.data.tasks, task];
      const updatedData = { ...cached.data, tasks: updatedTasks };
      spaceDataCache.set(spaceId, { data: updatedData, timestamp: Date.now() });
      setData(updatedData);
    } else {
      const newData: SpaceData = { tasks: [task], milestones: [], invoices: [], isLoading: false, error: null };
      spaceDataCache.set(spaceId, { data: newData, timestamp: Date.now() });
      setData(newData);
    }
  };

  // Supprimer une tâche du cache (sans refetch)
  const removeTaskFromCache = (taskId: string) => {
    const cached = spaceDataCache.get(spaceId);
    if (cached) {
      const updatedTasks = cached.data.tasks.filter(task => (task.Id || task.id) !== taskId);
      const updatedData = { ...cached.data, tasks: updatedTasks };
      spaceDataCache.set(spaceId, { data: updatedData, timestamp: Date.now() });
      setData(updatedData);
    }
  };

  return {
    ...data,
    refetch,
    updateTaskInCache,
    addTaskToCache,
    removeTaskFromCache
  };
};