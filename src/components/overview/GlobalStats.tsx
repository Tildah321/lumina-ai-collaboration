import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Target, FileText, Euro, Clock, TrendingUp, Users } from 'lucide-react';
import type { GlobalStats as StatsType } from '@/hooks/useGlobalStats';
import type { ElementType } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  icon: ElementType;
  progress?: number;
}

const StatCard = ({ label, value, subLabel, icon: Icon, progress }: StatCardProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-primary">{value}</p>
          {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
        </div>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      {typeof progress === 'number' && (
        <Progress value={progress} className="h-1 mt-2" />
      )}
    </CardContent>
  </Card>
);

interface GlobalStatsProps {
  stats: StatsType;
  activeClients: number;
}

const GlobalStats = ({ stats, activeClients }: GlobalStatsProps) => {
  if (stats.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-12 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const taskRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  const milestoneRate = stats.totalMilestones > 0 ? (stats.completedMilestones / stats.totalMilestones) * 100 : 0;
  const invoiceRate = stats.totalRevenue > 0 ? (stats.paidRevenue / stats.totalRevenue) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
      <StatCard
        label="Tâches"
        value={`${stats.completedTasks}/${stats.totalTasks}`}
        subLabel={`${Math.round(taskRate)}% terminées`}
        icon={CheckCircle2}
        progress={taskRate}
      />
      <StatCard
        label="Jalons"
        value={`${stats.completedMilestones}/${stats.totalMilestones}`}
        subLabel={`${Math.round(milestoneRate)}% atteints`}
        icon={Target}
        progress={milestoneRate}
      />
      <StatCard
        label="Factures"
        value={`${stats.paidInvoices}/${stats.totalInvoices}`}
        subLabel={`${Math.round(invoiceRate)}% payées`}
        icon={FileText}
        progress={invoiceRate}
      />
      <StatCard
        label="Revenus"
        value={`${stats.paidRevenue.toFixed(0)}€`}
        subLabel={`sur ${stats.totalRevenue.toFixed(0)}€`}
        icon={Euro}
      />
      <StatCard
        label="Temps"
        value={`${stats.totalTimeSpent.toFixed(1)}h`}
        subLabel="Total"
        icon={Clock}
      />
      <StatCard
        label="Taux horaire"
        value={`${stats.averageHourlyRate.toFixed(0)}€/h`}
        icon={TrendingUp}
      />
      <StatCard
        label="Clients actifs"
        value={activeClients}
        icon={Users}
      />
    </div>
  );
};

export default GlobalStats;
