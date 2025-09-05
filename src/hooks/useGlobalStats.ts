import { useState, useEffect, useRef } from 'react';
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
}

interface Task {
  statut?: string;
  status?: string;
  time_spent?: string | number | null;
}

interface Milestone {
  projet_id?: string | number;
  terminé?: boolean | string;
  termine?: boolean | string;
  completed?: boolean;
}

interface Invoice {
  projet_id?: string | number;
  montant?: number | string;
  amount?: number | string;
  payée?: boolean | string;
  paid?: boolean;
}

let cachedStats: GlobalStats | null = null;
let lastFetch = 0;
let fetchPromise: Promise<void> | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useGlobalStats = () => {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

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
    isLoading: true,
  });

  useEffect(() => {
    const loadGlobalStats = async () => {
      setStats(prev => ({ ...prev, isLoading: true }));

      const now = Date.now();
      if (cachedStats && now - lastFetch < CACHE_DURATION) {
        setStats({ ...cachedStats, isLoading: false });
        return;
      }

      try {
        if (!fetchPromise) {
          fetchPromise = (async () => {
            const [tasksResponse, milestonesResponse, invoicesResponse] = await Promise.all([
              nocodbService.getTasks(undefined, {
                fields: 'statut,status,time_spent,projet_id',
                limit: 1000,
              }),
              nocodbService.getMilestones(undefined, {
                fields: 'projet_id,terminé,termine',
                limit: 1000,
              }),
              nocodbService.getInvoices(undefined, {
                fields: 'projet_id,montant,amount,payée,paid',
                limit: 1000,
              }),
            ]);

            const tasks = (tasksResponse.list || []) as Task[];
            const milestones = (milestonesResponse.list || []) as Milestone[];
            const invoices = (invoicesResponse.list || []) as Invoice[];

            const completedTasks = tasks.filter(
              t => (t.statut || t.status) === 'fait' || (t.statut || t.status) === 'terminé'
            ).length;

            const completedMilestones = milestones.filter(
              m => m.terminé === true || m.terminé === 'true' || m.completed === true
            ).length;

            const paidInvoices = invoices.filter(
              i => i.payée === true || i.payée === 'true' || i.paid === true
            ).length;

            const totalRevenue = invoices.reduce(
              (acc, i) => acc + (Number(i.montant) || Number(i.amount) || 0),
              0
            );

            const paidRevenue = invoices
              .filter(i => i.payée === true || i.payée === 'true' || i.paid === true)
              .reduce((acc, i) => acc + (Number(i.montant) || Number(i.amount) || 0), 0);

            const totalSeconds = tasks.reduce((sum, task) => {
              const time = task.time_spent;
              if (!time) return sum;

              if (typeof time === 'string') {
                const timeStr = time.toString();
                if (timeStr.includes(':')) {
                  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
                  return sum + hours * 3600 + minutes * 60 + seconds;
                }
                return sum + parseFloat(timeStr) * 3600;
              }

              return sum + Number(time) * 60;
            }, 0);

            const totalHours = totalSeconds / 3600;
            const averageHourlyRate = totalHours > 0 ? paidRevenue / totalHours : 0;

            cachedStats = {
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
              isLoading: false,
            };
            lastFetch = Date.now();
            fetchPromise = null;
          })();
        }

        await fetchPromise;
        if (cachedStats) {
          setStats({ ...cachedStats, isLoading: false });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        const showToast = toastRef.current;
        if (errorMessage.includes('Too many requests')) {
          showToast({
            title: 'Limite de requêtes atteinte',
            description: 'Les statistiques seront rechargées automatiquement',
            variant: 'default',
          });
          setTimeout(() => {
            loadGlobalStats();
          }, 15000);
        } else {
          showToast({
            title: 'Erreur de chargement',
            description: 'Impossible de charger les statistiques globales',
            variant: 'destructive',
          });
        }

        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadGlobalStats();

    const interval = setInterval(loadGlobalStats, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return stats;
};
