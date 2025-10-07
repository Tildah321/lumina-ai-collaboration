import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface Task {
  id: string | number;
  status: string;
  priorite?: string;
  time_spent?: number;
  deadline?: string;
}

interface TaskStatsProps {
  tasks: Task[];
}

export const TaskStats: React.FC<TaskStatsProps> = ({ tasks }) => {
  const stats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Terminé').length;
    const inProgress = tasks.filter(t => t.status === 'En cours').length;
    const pending = tasks.filter(t => t.status === 'À faire').length;
    const highPriority = tasks.filter(t => 
      (t.priorite || '').toLowerCase() === 'haute'
    ).length;
    
    const totalTimeSpent = tasks.reduce((acc, t) => acc + (t.time_spent || 0), 0);
    const averageTime = total > 0 ? totalTimeSpent / total : 0;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const now = new Date();
    const overdue = tasks.filter(t => {
      if (!t.deadline || t.status === 'Terminé') return false;
      return new Date(t.deadline) < now;
    }).length;

    return {
      total,
      completed,
      inProgress,
      pending,
      highPriority,
      totalTimeSpent,
      averageTime,
      completionRate,
      overdue
    };
  }, [tasks]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h${mins > 0 ? mins + 'm' : ''}`;
    }
    return `${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="glass-glow border-border/50 hover:border-primary/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total tâches</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.completed} terminées • {stats.inProgress} en cours
          </p>
        </CardContent>
      </Card>

      <Card className="glass-glow border-border/50 hover:border-primary/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taux de complétion</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completionRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.pending} à faire • {stats.highPriority} priorité haute
          </p>
        </CardContent>
      </Card>

      <Card className="glass-glow border-border/50 hover:border-primary/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Temps total</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatTime(stats.totalTimeSpent)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Moy. {formatTime(stats.averageTime)} par tâche
          </p>
        </CardContent>
      </Card>

      <Card className="glass-glow border-border/50 hover:border-primary/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En retard</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.overdue}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.overdue > 0 ? 'Nécessite attention' : 'Tout est à jour'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
