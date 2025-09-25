import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building2, Clock, CheckCircle, Calendar, BarChart3, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import nocodbService from '@/services/nocodbService';
import { useToast } from '@/hooks/use-toast';

interface OverviewStats {
  totalCollaborators: number;
  activeCollaborators: number;
  totalSpaces: number;
  activeSpaceAccesses: number;
  recentActivity: Array<{
    id: string;
    type: 'collaborator_added' | 'space_access_granted' | 'collaborator_login';
    description: string;
    date: string;
  }>;
}

const Overview = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<OverviewStats>({
    totalCollaborators: 0,
    activeCollaborators: 0,
    totalSpaces: 0,
    activeSpaceAccesses: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadOverviewData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger les collaborateurs
      const { data: collaborators, error: collabError } = await supabase
        .from('collaborators')
        .select('*')
        .eq('invited_by', user.id);

      if (collabError) throw collabError;

      // Charger les accès aux espaces
      const { data: spaceAccesses, error: spaceError } = await supabase
        .from('space_collaborators')
        .select('*')
        .eq('granted_by', user.id);

      if (spaceError) throw spaceError;

      // Charger les espaces clients depuis NocoDB
      let totalSpaces = 0;
      try {
        const clientsRes = await nocodbService.getClients();
        totalSpaces = clientsRes?.list?.length || 0;
      } catch (e) {
        console.warn('Impossible de charger les espaces clients:', e);
      }

      // Générer une activité récente factice basée sur les données réelles
      const recentActivity = [
        ...(collaborators || []).slice(0, 3).map((collab: any) => ({
          id: `collab-${collab.id}`,
          type: 'collaborator_added' as const,
          description: `Collaborateur ${collab.name} ajouté`,
          date: collab.created_at
        })),
        ...(spaceAccesses || []).slice(0, 3).map((access: any) => ({
          id: `access-${access.id}`,
          type: 'space_access_granted' as const,
          description: `Accès accordé à l'espace ${access.space_id}`,
          date: access.created_at
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      setStats({
        totalCollaborators: collaborators?.length || 0,
        activeCollaborators: collaborators?.filter((c: any) => c.status === 'accepted').length || 0,
        totalSpaces,
        activeSpaceAccesses: spaceAccesses?.length || 0,
        recentActivity
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de vue d'ensemble",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'collaborator_added': return <Users className="w-4 h-4 text-blue-600" />;
      case 'space_access_granted': return <Building2 className="w-4 h-4 text-green-600" />;
      case 'collaborator_login': return <Activity className="w-4 h-4 text-purple-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h2>
        <p className="text-muted-foreground">
          Aperçu de votre activité collaborative et de vos espaces clients
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collaborateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCollaborators}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCollaborators} actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espaces Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSpaces}</div>
            <p className="text-xs text-muted-foreground">
              Espaces disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accès Partagés</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSpaceAccesses}</div>
            <p className="text-xs text-muted-foreground">
              Accès accordés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activité</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Actions récentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques et données */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activité Récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune activité récente
                </p>
              ) : (
                stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Résumé des performances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Résumé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Taux d'activation collaborateurs</span>
                <Badge variant="outline">
                  {stats.totalCollaborators > 0 
                    ? Math.round((stats.activeCollaborators / stats.totalCollaborators) * 100)
                    : 0}%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Espaces avec accès partagé</span>
                <Badge variant="outline">
                  {stats.activeSpaceAccesses} / {stats.totalSpaces}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Moyenne accès par collaborateur</span>
                <Badge variant="outline">
                  {stats.activeCollaborators > 0 
                    ? Math.round(stats.activeSpaceAccesses / stats.activeCollaborators * 10) / 10
                    : 0}
                </Badge>
              </div>
            </div>
            
            <div className="pt-4 mt-4 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadOverviewData}
                className="w-full"
              >
                <Activity className="w-4 h-4 mr-2" />
                Actualiser les données
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Overview;