import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Clock, Target, FileText, Euro, TrendingUp, Users, Calculator, RefreshCw } from 'lucide-react';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { useSpaceData } from '@/hooks/useSpaceData';
import { useMarginStats } from '@/hooks/useMarginStats';
import MarginManager from '@/components/finances/MarginManager';

interface StatisticsOverviewProps {
  spaceId: string;
  isPublic?: boolean;
}

const StatisticsOverview = ({ spaceId, isPublic = false }: StatisticsOverviewProps) => {
  const globalStats = useGlobalStats();
  const spaceData = useSpaceData(spaceId, isPublic);
  const marginStats = useMarginStats();

  // Utiliser les données appropriées (spécifiques à l'espace ou globales)
  const isSpaceSpecific = Boolean(spaceId);
  const isLoading = isSpaceSpecific ? spaceData.isLoading : globalStats.isLoading;

  // Calculer les statistiques selon les données disponibles
  const taskStats = isSpaceSpecific ? {
    total: spaceData.tasks.length,
    completed: spaceData.tasks.filter((t: any) => (t.statut || t.status) === 'fait').length,
    inProgress: spaceData.tasks.filter((t: any) => ['en cours', 'en attente'].includes(t.statut || t.status)).length,
    pending: spaceData.tasks.filter((t: any) => (t.statut || t.status) === 'à faire').length,
    delayed: spaceData.tasks.filter((t: any) => {
      if (!t.deadline) return false;
      const today = new Date();
      const deadline = new Date(t.deadline);
      return deadline < today && (t.statut || t.status) !== 'fait';
    }).length,
    completionRate: spaceData.tasks.length > 0 ? Math.round((spaceData.tasks.filter((t: any) => (t.statut || t.status) === 'fait').length / spaceData.tasks.length) * 100) : 0
  } : {
    total: globalStats.totalTasks,
    completed: globalStats.completedTasks,
    inProgress: 0,
    pending: globalStats.totalTasks - globalStats.completedTasks,
    delayed: 0,
    completionRate: globalStats.totalTasks > 0 ? Math.round((globalStats.completedTasks / globalStats.totalTasks) * 100) : 0
  };

  const milestoneStats = isSpaceSpecific ? {
    total: spaceData.milestones.length,
    completed: spaceData.milestones.filter((m: any) => m.terminé === true || m.terminé === 'true').length,
    avgProgress: spaceData.milestones.length > 0 ? Math.round(((spaceData.milestones.filter((m: any) => m.terminé === true || m.terminé === 'true').length) / spaceData.milestones.length) * 100) : 0,
    upcoming: spaceData.milestones.filter((m: any) => {
      if (!m.deadline) return false;
      const today = new Date();
      const milestoneDate = new Date(m.deadline);
      const diffDays = Math.ceil((milestoneDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return !(m.terminé === true || m.terminé === 'true') && diffDays > 0 && diffDays <= 30;
    }).length
  } : {
    total: globalStats.totalMilestones,
    completed: globalStats.completedMilestones,
    avgProgress: globalStats.totalMilestones > 0 ? Math.round((globalStats.completedMilestones / globalStats.totalMilestones) * 100) : 0,
    upcoming: 0
  };

  const invoiceStats = isSpaceSpecific ? {
    total: spaceData.invoices.length,
    paid: spaceData.invoices.filter((i: any) => i.payée === true || i.payée === 'true').length,
    pending: spaceData.invoices.filter((i: any) => !i.payée || i.payée === 'false').length,
    overdue: 0,
    totalAmount: spaceData.invoices.reduce((acc: number, i: any) => acc + (Number(i.montant) || 0), 0),
    paidAmount: spaceData.invoices.filter((i: any) => i.payée === true || i.payée === 'true').reduce((acc: number, i: any) => acc + (Number(i.montant) || 0), 0)
  } : {
    total: globalStats.totalInvoices,
    paid: globalStats.paidInvoices,
    pending: globalStats.totalInvoices - globalStats.paidInvoices,
    overdue: 0,
    totalAmount: globalStats.totalRevenue,
    paidAmount: globalStats.paidRevenue
  };

  const nextDeadlines = isSpaceSpecific ? spaceData.tasks
    .filter((t: any) => (t.statut || t.status) !== 'fait' && t.deadline)
    .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3) : [];

  const nextMilestones = isSpaceSpecific ? spaceData.milestones
    .filter((m: any) => !(m.terminé === true || m.terminé === 'true') && m.deadline)
    .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3) : [];

  const getUrgencyBadge = (deadline: string) => {
    const today = new Date();
    const due = new Date(deadline);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return <Badge variant="destructive">En retard</Badge>;
    if (diffDays <= 3) return <Badge variant="destructive">Urgent</Badge>;
    if (diffDays <= 7) return <Badge variant="default">Bientôt</Badge>;
    return <Badge variant="secondary">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Statistiques</h2>
        {!isSpaceSpecific && globalStats.forceRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={globalStats.forceRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="margins">Marges & Investissements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Statistiques principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-glow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tâches complétées</p>
                    <p className="text-2xl font-bold text-primary">{taskStats.completed}/{taskStats.total}</p>
                    <p className="text-xs text-muted-foreground">{taskStats.completionRate}% de progression</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-primary/60" />
                </div>
                <Progress value={taskStats.completionRate} className="h-2 mt-3" />
              </CardContent>
            </Card>

            <Card className="glass-glow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Jalons atteints</p>
                    <p className="text-2xl font-bold text-primary">{milestoneStats.completed}/{milestoneStats.total}</p>
                    <p className="text-xs text-muted-foreground">Progression: {milestoneStats.avgProgress}%</p>
                  </div>
                  <Target className="h-8 w-8 text-primary/60" />
                </div>
                <Progress value={milestoneStats.avgProgress} className="h-2 mt-3" />
              </CardContent>
            </Card>

            <Card className="glass-glow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Factures payées</p>
                    <p className="text-2xl font-bold text-primary">{invoiceStats.paid}/{invoiceStats.total}</p>
                    <p className="text-xs text-muted-foreground">{invoiceStats.paidAmount.toFixed(2)}€ / {invoiceStats.totalAmount.toFixed(2)}€</p>
                  </div>
                  <Euro className="h-8 w-8 text-primary/60" />
                </div>
                <Progress value={invoiceStats.total > 0 ? (invoiceStats.paid / invoiceStats.total) * 100 : 0} className="h-2 mt-3" />
              </CardContent>
            </Card>

            <Card className="glass-glow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Marge nette</p>
                    <p className={`text-2xl font-bold ${marginStats.netMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {marginStats.netMargin.toFixed(2)}€
                    </p>
                    <p className="text-xs text-muted-foreground">{marginStats.marginPercentage.toFixed(1)}%</p>
                  </div>
                  <Calculator className={`h-8 w-8 ${marginStats.netMargin >= 0 ? 'text-success/60' : 'text-destructive/60'}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Détails des statistiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prochaines échéances */}
            <Card className="glass-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Prochaines échéances
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {nextDeadlines.map((task) => (
                      <div key={task.Id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.titre}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(task.deadline).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {getUrgencyBadge(task.deadline)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Aucune échéance proche</p>
                )}
              </CardContent>
            </Card>

            {/* Prochains jalons */}
            <Card className="glass-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Prochains jalons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextMilestones.length > 0 ? (
                  <div className="space-y-3">
                    {nextMilestones.map((milestone) => (
                      <div key={milestone.Id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium">{milestone.titre}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(milestone.deadline).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Progress value={milestoneStats.avgProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{milestoneStats.avgProgress}% complété</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Aucun jalon à venir</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Alertes et notifications */}
          {(taskStats.delayed > 0 || invoiceStats.overdue > 0) && (
            <Card className="glass-glow border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">Attention requise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {taskStats.delayed > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-destructive" />
                      <span>{taskStats.delayed} tâche(s) en retard</span>
                    </div>
                  )}
                  {invoiceStats.overdue > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-destructive" />
                      <span>{invoiceStats.overdue} facture(s) en retard</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="margins" className="space-y-6">
          <MarginManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatisticsOverview;