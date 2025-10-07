import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Euro, Target } from 'lucide-react';
import { Prospect } from '@/types/prospect';


interface ProspectStatsProps {
  prospects: Prospect[];
}

const ProspectStats = ({ prospects }: ProspectStatsProps) => {
  const stats = useMemo(() => {
    const total = prospects.length;
    
    // Calculate revenue projections
    const projectedRevenue = prospects.reduce((sum, p) => {
      const prix = parseFloat(p.prix || '0');
      return sum + prix;
    }, 0);
    
    // Count converted prospects
    const converted = prospects.filter(p => p.status === 'Converti').length;
    
    // Calculate billed revenue (from converted prospects)
    const billedRevenue = prospects
      .filter(p => p.status === 'Converti')
      .reduce((sum, p) => {
        const prix = parseFloat(p.prix || '0');
        return sum + prix;
      }, 0);
    
    // Count by status for chart
    const statusCounts = prospects.reduce((acc, p) => {
      const status = p.status || 'Nouveau';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    return {
      total,
      projectedRevenue,
      billedRevenue,
      converted,
      chartData,
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0'
    };
  }, [prospects]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.converted} converti{stats.converted > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Projeté</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectedRevenue.toLocaleString()}€</div>
            <p className="text-xs text-muted-foreground mt-1">
              Potentiel total
            </p>
          </CardContent>
        </Card>

        <Card className="glass-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Facturé</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.billedRevenue.toLocaleString()}€</div>
            <p className="text-xs text-muted-foreground mt-1">
              Prospects convertis
            </p>
          </CardContent>
        </Card>

        <Card className="glass-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.converted}/{stats.total} prospects
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default ProspectStats;
