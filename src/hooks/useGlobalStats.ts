import { useState, useEffect } from 'react';
import nocodbService from '@/services/nocodbService';
import { useToast } from '@/hooks/use-toast';

export interface GlobalStats {
  totalTasks: number;
  completedTasks: number;
  totalMilestones: number;
  completedMilestones: number;
  totalInvoices: number;
  paidInvoices: number;
  totalRevenue: number;
  paidRevenue: number;
  totalTimeSpent: number; // en secondes
  averageHourlyRate: number;
  isLoading: boolean;
  forceRefresh?: () => void;
}

export const useGlobalStats = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<GlobalStats>({
    totalTasks: 0,
    completedTasks: 0,
    totalMilestones: 0,
    completedMilestones: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    totalTimeSpent: 0,
    averageHourlyRate: 0,
    isLoading: true
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadGlobalStats = async () => {
      setStats(prev => ({ ...prev, isLoading: true }));
      try {
        console.log('📊 Chargement des statistiques globales...');

        // Charger les données en parallèle, avec filtrage utilisateur intégré dans chaque service
        const [tasksResponse, milestonesResponse, invoicesResponse] = await Promise.all([
          nocodbService.getTasks(undefined, { onlyCurrentUser: false }), // Filtré par espaces utilisateur dans le service
          nocodbService.getMilestones(undefined, { fields: undefined }), // Filtré par espaces utilisateur dans le service  
          nocodbService.getInvoices(undefined) // Filtré par espaces utilisateur dans le service
        ]);

        const tasks = tasksResponse.list || [];
        const milestones = milestonesResponse.list || [];
        const invoices = invoicesResponse.list || [];

        console.log('📊 Données chargées (filtrées par utilisateur):', {
          tasks: tasks.length,
          milestones: milestones.length,
          invoices: invoices.length
        });

        // Calculer les statistiques des tâches
        const completedTasks = tasks.filter((t: any) => 
          (t.statut || t.status) === 'fait' || (t.statut || t.status) === 'terminé'
        ).length;

        // Calculer les statistiques des jalons
        const completedMilestones = milestones.filter((m: any) => 
          m.terminé === true || m.terminé === 'true' || m.completed === true
        ).length;

        // Calculer les statistiques des factures
        const paidInvoices = invoices.filter((i: any) => 
          i.payée === true || i.payée === 'true' || i.paid === true
        ).length;

        const totalRevenue = invoices.reduce((acc: number, i: any) => 
          acc + (Number(i.montant) || Number(i.amount) || 0), 0
        );

        const paidRevenue = invoices
          .filter((i: any) => i.payée === true || i.payée === 'true' || i.paid === true)
          .reduce((acc: number, i: any) => acc + (Number(i.montant) || Number(i.amount) || 0), 0);

        // Calculer le temps total passé sur les tâches (en secondes) - FILTRÉ PAR UTILISATEUR
        const totalSeconds = tasks.reduce((sum: number, task: any) => {
          // SÉCURITÉ: Ne compter le temps que des tâches de l'utilisateur connecté
          const time = task.time_spent;
          if (!time) return sum;

          if (typeof time === 'string') {
            const timeStr = time.toString();
            if (timeStr.includes(':')) {
              const [hours, minutes, seconds] = timeStr.split(':').map(Number);
              return sum + hours * 3600 + minutes * 60 + seconds;
            }
            // Format décimal d'heures
            return sum + parseFloat(timeStr) * 3600;
          }

          // Rétrocompatibilité : temps stocké en minutes
          return sum + Number(time) * 60;
        }, 0);

        const totalHours = totalSeconds / 3600;
        const averageHourlyRate = totalHours > 0 ? paidRevenue / totalHours : 0;

        setStats({
          totalTasks: tasks.length,
          completedTasks,
          totalMilestones: milestones.length,
          completedMilestones,
          totalInvoices: invoices.length,
          paidInvoices,
          totalRevenue,
          paidRevenue,
          totalTimeSpent: totalSeconds,
          averageHourlyRate,
          isLoading: false
        });

        console.log('✅ Statistiques globales calculées (sécurisées par utilisateur):', {
          totalTasks: tasks.length,
          completedTasks,
          totalMilestones: milestones.length,
          completedMilestones,
          totalInvoices: invoices.length,
          paidInvoices,
          totalRevenue,
          paidRevenue,
          totalTimeSpent: totalSeconds,
          averageHourlyRate
        });

      } catch (error) {
        console.error('❌ Erreur lors du chargement des statistiques globales:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        
        if (errorMessage.includes('Too many requests')) {
          toast({
            title: "Limite de requêtes atteinte",
            description: "Les statistiques seront rechargées automatiquement",
            variant: "default"
          });
          
          // Réessayer après 15 secondes
          setTimeout(() => {
            loadGlobalStats();
          }, 15000);
        } else {
          toast({
            title: "Erreur de chargement",
            description: "Impossible de charger les statistiques globales",
            variant: "destructive"
          });
        }
        
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    // Délai pour éviter les appels multiples au montage
    const timeoutId = setTimeout(loadGlobalStats, 100);
    
    // Actualiser toutes les 5 minutes pour avoir des données plus récentes
    const interval = setInterval(loadGlobalStats, 300000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [refreshTrigger]);

  const forceRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { ...stats, forceRefresh };
};