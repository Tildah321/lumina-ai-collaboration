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

// Cache global optimisé avec TTL plus long pour éviter trop de requêtes
const spaceDataCache = new Map<string, { data: SpaceData; timestamp: number }>();
const loadingPromises = new Map<string, Promise<void>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes pour éviter le rate limiting
const requestQueue = new Map<string, number>(); // Queue pour éviter les requêtes parallèles

export const useSpaceData = (spaceId: string) => {
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

    // Vérifier le cache avec TTL
    const cached = spaceDataCache.get(spaceId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && !cached.data.isLoading) {
      console.log('📦 Données trouvées dans le cache');
      setData(cached.data);
      return;
    }

    // Vérifier si le chargement est déjà en cours
    const existingPromise = loadingPromises.get(spaceId);
    if (existingPromise) {
      existingPromise.then(() => {
        const updated = spaceDataCache.get(spaceId);
        if (updated) setData(updated.data);
      });
      return;
    }

    // Fonction de chargement optimisée (extraite pour être réutilisée)
    const loadSpaceData = async () => {
      console.log('🚀 Chargement rapide des données pour l\'espace:', spaceId);
      
      const newData: SpaceData = {
        tasks: [],
        milestones: [],
        invoices: [],
        isLoading: true,
        error: null
      };
      
      spaceDataCache.set(spaceId, { data: newData, timestamp: Date.now() });
      setData(newData);

    try {
      // Éviter les requêtes parallèles multiples
      const now = Date.now();
      const lastRequest = requestQueue.get(spaceId) || 0;
      if (now - lastRequest < 1000) {
        console.log('⏳ Requête trop récente, attente...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      requestQueue.set(spaceId, now);

      // Chargement séquentiel pour éviter le rate limiting
      console.log('📊 Chargement séquentiel des tâches...');
      const tasksResult = await nocodbService.getTasks(spaceId, { onlyCurrentUser: true });
      await new Promise(resolve => setTimeout(resolve, 500)); // Délai entre requêtes
      
      console.log('📊 Chargement séquentiel des jalons...');
      const milestonesResult = await nocodbService.getMilestones(spaceId);
      await new Promise(resolve => setTimeout(resolve, 500)); // Délai entre requêtes
      
      console.log('📊 Chargement séquentiel des factures...');
      const invoicesResult = await nocodbService.getInvoices(spaceId);

      let tasks: any[] = [];
      let milestones: any[] = [];
      let invoices: any[] = [];

      // Traiter les résultats
      if (tasksResult?.list) {
        const rawTasks = tasksResult.list || [];
        tasks = rawTasks.map((task: any) => ({
          ...task,
          id: task.Id || task.id,
          assigné_a: task.assigne_a || task.assigné_a,
          priorité: task.priorite || task.priorité,
          time_spent: task.time_spent || 0
        }));
      }

      if (milestonesResult?.list) {
        const rawMilestones = milestonesResult.list || [];
        milestones = rawMilestones.map((milestone: any) => ({
          ...milestone,
          id: milestone.Id || milestone.id
        }));
      }

      if (invoicesResult?.list) {
        const rawInvoices = invoicesResult.list || [];
        invoices = rawInvoices.map((invoice: any) => ({
          ...invoice,
          id: invoice.Id || invoice.id
        }));
      }

        const finalData: SpaceData = {
          tasks,
          milestones,
          invoices,
          isLoading: false,
          error: null
        };
        
      console.log('⚡ Chargement séquentiel terminé:', {
        tasks: tasks.length,
        milestones: milestones.length,
        invoices: invoices.length,
        duration: 'Séquentiel optimisé'
      });
        
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

    // Stocker la promesse pour éviter les doublons
    const promise = loadSpaceData();
    loadingPromises.set(spaceId, promise);
    
    return () => {
      // Cleanup si le composant se démonte
      loadingPromises.delete(spaceId);
    };
  }, [spaceId, toast]);

  // Fonction de chargement extraite pour réutilisation  
  const loadSpaceData = async () => {
    console.log('🚀 Chargement rapide des données pour l\'espace:', spaceId);
    
    const newData: SpaceData = {
      tasks: [],
      milestones: [],
      invoices: [],
      isLoading: true,
      error: null
    };
    
    spaceDataCache.set(spaceId, { data: newData, timestamp: Date.now() });
    setData(newData);

    try {
      // Chargement en parallèle avec fallback intelligent
      const [tasksResult, milestonesResult, invoicesResult] = await Promise.allSettled([
        nocodbService.getTasks(spaceId, { onlyCurrentUser: true }),
        nocodbService.getMilestones(spaceId),
        nocodbService.getInvoices(spaceId)
      ]);

      let tasks: any[] = [];
      let milestones: any[] = [];
      let invoices: any[] = [];

      // Traiter les résultats même si certains échouent
      if (tasksResult.status === 'fulfilled') {
        const rawTasks = tasksResult.value.list || [];
        tasks = rawTasks.map((task: any) => ({
          ...task,
          id: task.Id || task.id,
          assigné_a: task.assigne_a || task.assigné_a,
          priorité: task.priorite || task.priorité,
          time_spent: task.time_spent || 0
        }));
      }

      if (milestonesResult.status === 'fulfilled') {
        const rawMilestones = milestonesResult.value.list || [];
        milestones = rawMilestones.map((milestone: any) => ({
          ...milestone,
          id: milestone.Id || milestone.id
        }));
      }

      if (invoicesResult.status === 'fulfilled') {
        const rawInvoices = invoicesResult.value.list || [];
        invoices = rawInvoices.map((invoice: any) => ({
          ...invoice,
          id: invoice.Id || invoice.id
        }));
      }

      const finalData: SpaceData = {
        tasks,
        milestones,
        invoices,
        isLoading: false,
        error: null
      };
      
      console.log('⚡ Chargement rapide terminé:', {
        tasks: tasks.length,
        milestones: milestones.length,
        invoices: invoices.length,
        duration: 'Parallèle'
      });
      
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

  // Fonction pour forcer le rechargement immédiat
  const refetch = () => {
    console.log('🔄 Rechargement forcé des données pour l\'espace:', spaceId);
    spaceDataCache.delete(spaceId);
    loadingPromises.delete(spaceId);
    setData(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Déclencher immédiatement le rechargement
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