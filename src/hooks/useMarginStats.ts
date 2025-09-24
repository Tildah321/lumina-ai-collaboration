import { useState, useEffect, useMemo } from 'react';
import { useGlobalStats } from './useGlobalStats';
import nocodbService from '@/services/nocodbService';

interface Investment {
  id: string;
  type: 'monthly' | 'project';
  amount: number;
  description: string;
  projectId?: string;
  projectName?: string;
  date: string;
}

interface MarginStats {
  totalRevenue: number;
  paidRevenue: number;
  monthlyInvestments: number;
  projectInvestments: number;
  totalInvestments: number;
  grossMargin: number;
  netMargin: number;
  marginPercentage: number;
  isLoading: boolean;
}

export const useMarginStats = () => {
  const globalStats = useGlobalStats();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [monthlyInvestment, setMonthlyInvestment] = useState(0);

  // Charger les données depuis localStorage ET NocoDB
  useEffect(() => {
    const savedInvestments = localStorage.getItem('investments');
    const savedMonthlyInvestment = localStorage.getItem('monthlyInvestment');
    
    if (savedInvestments) {
      setInvestments(JSON.parse(savedInvestments));
    }
    if (savedMonthlyInvestment) {
      setMonthlyInvestment(Number(savedMonthlyInvestment));
    }

    // Charger les investissements depuis NocoDB (filtrés par espaces utilisateur)
    const loadNocoInvestments = async () => {
      try {
        const clients = await nocodbService.getClients(); // Déjà filtré par getUserSpaceIds()

        // Vérifier que l'utilisateur a des clients accessibles
        if (!clients.list || clients.list.length === 0) {
          console.log('🔒 Aucun client accessible pour les investissements');
          return;
        }

        // Ajouter les investissements par projet uniquement des clients autorisés
        const projectInvestments =
          clients.list?.map((client: any) => {
            const notes: Record<string, unknown> =
              typeof client.notes === 'string'
                ? JSON.parse(client.notes)
                : (client.notes || {});
            const rawAmount =
              (notes as any).projectInvestment ??
              (notes as any).investissement_projet ??
              client.coqh9knygkxr52k;
            const amount = Number(
              typeof rawAmount === 'string' ? rawAmount.replace(',', '.') : rawAmount
            ) || 0;
            return { amount, client };
          })
            .filter(({ amount }) => amount > 0)
            .map(({ amount, client }) => ({
              id: `noco_${client.Id || client.id}`,
              type: 'project' as const,
              amount,
              description: `Investissement ${client.email || client.description || 'Client'}`,
              projectId: client.Id || client.id,
              projectName: client.email || client.description,
              date: new Date().toISOString()
            })) || [];

        // Fusionner avec les investissements localStorage existants
        const existingInvestments = savedInvestments ? JSON.parse(savedInvestments) : [];
        const localInvestments = existingInvestments.filter((inv: Investment) => !inv.id.startsWith('noco_'));
        const allInvestments = [...localInvestments, ...projectInvestments];
        setInvestments(allInvestments);

      } catch (error) {
        console.error('Erreur chargement investissements NocoDB:', error);
      }
    };

    loadNocoInvestments();
  }, []);

  // Calculer les statistiques de marge
  const marginStats = useMemo((): MarginStats => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Investissements du mois en cours (localStorage)
    const currentMonthInvestments = investments.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    });

    const localMonthlyInvestments = monthlyInvestment;
    const localProjectInvestments = currentMonthInvestments
      .filter(inv => inv.type === 'project')
      .reduce((acc, inv) => acc + inv.amount, 0);
    
    // Ajouter les investissements de NocoDB
    const totalMonthlyInvestments = localMonthlyInvestments;
    const totalInvestments = totalMonthlyInvestments + localProjectInvestments;
    const grossMargin = globalStats.paidRevenue - totalInvestments;
    const netMargin = grossMargin;
    const marginPercentage = globalStats.totalRevenue > 0 ? (netMargin / globalStats.totalRevenue) * 100 : 0;

    return {
      totalRevenue: globalStats.totalRevenue,
      paidRevenue: globalStats.paidRevenue,
      monthlyInvestments: totalMonthlyInvestments,
      projectInvestments: localProjectInvestments,
      totalInvestments,
      grossMargin,
      netMargin,
      marginPercentage,
      isLoading: globalStats.isLoading
    };
  }, [globalStats, investments, monthlyInvestment]);

  return {
    ...marginStats,
    investments,
    monthlyInvestment,
    setInvestments,
    setMonthlyInvestment
  };
};