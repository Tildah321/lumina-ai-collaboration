import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Clock, CheckCircle2, Play, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import nocodbService from '@/services/nocodbService';

interface Task {
  Id: string;
  titre: string;
  assigne_a: 'client' | 'moi';
  deadline: string;
  statut: 'à faire' | 'en cours' | 'en attente' | 'fait';
  projet_id: string;
  priorite: 'faible' | 'moyenne' | 'haute';
  time_spent?: number | string;
}

interface ClientTaskManagerProps {
  spaceId: string;
}

const ClientTaskManager = ({ spaceId }: ClientTaskManagerProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await nocodbService.getTasksPublic(spaceId);
        setTasks(response?.list || []);
      } catch (error) {
        console.error('Erreur lors du chargement des tâches:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les tâches",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [spaceId, toast]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await nocodbService.updateTaskPublic(taskId, { statut: 'fait' });
      setTasks(prev => prev.map(task => 
        task.Id === taskId ? { ...task, statut: 'fait' } : task
      ));
      toast({
        title: "Tâche terminée",
        description: "La tâche a été marquée comme terminée"
      });
    } catch (error) {
      console.error('Erreur lors de la complétion de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la tâche comme terminée",
        variant: "destructive"
      });
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await nocodbService.updateTaskPublic(taskId, { statut: 'en cours' });
      setTasks(prev => prev.map(task => 
        task.Id === taskId ? { ...task, statut: 'en cours' } : task
      ));
      toast({
        title: "Tâche commencée",
        description: "La tâche est maintenant en cours"
      });
    } catch (error) {
      console.error('Erreur lors du démarrage de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de commencer la tâche",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fait':
        return 'default';
      case 'en cours':
        return 'secondary';
      case 'en attente':
        return 'secondary';
      case 'à faire':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getAssigneeColor = (assignee: string) => {
    return assignee === 'moi' ? 'default' : 'secondary';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'haute':
        return 'destructive';
      case 'moyenne':
        return 'secondary';
      case 'faible':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const isOverdue = (deadline: string) => {
    return deadline && new Date(deadline) < new Date();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune tâche pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  // Séparer les tâches client et admin
  const clientTasks = tasks.filter(task => (task.assigne_a || task.assigné_a) === 'client');
  const adminTasks = tasks.filter(task => (task.assigne_a || task.assigné_a) === 'moi');

  return (
    <div className="space-y-6">
      {/* Tâches en retard */}
      {clientTasks.filter(task => isOverdue(task.deadline) && task.statut !== 'fait').length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h4 className="font-medium text-destructive">Tâches en retard</h4>
            </div>
            <p className="text-sm text-destructive">
              Vous avez {clientTasks.filter(task => isOverdue(task.deadline) && task.statut !== 'fait').length} tâche(s) en retard qui nécessitent votre attention.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Vos tâches (client) */}
      {clientTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Vos tâches ({clientTasks.length})
          </h3>
          <div className="space-y-3">
            {clientTasks.map(task => (
              <Card key={task.Id} className={`transition-all hover:shadow-md ${
                isOverdue(task.deadline) && task.statut !== 'fait' 
                  ? 'border-destructive/50 bg-destructive/5' 
                  : 'hover:border-primary/50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{task.titre}</h4>
                        {isOverdue(task.deadline) && task.statut !== 'fait' && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            En retard
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getStatusColor(task.statut)} className="text-xs">
                          {task.statut}
                        </Badge>
                        
                        <Badge variant={getPriorityColor(task.priorite)} className="text-xs">
                          {task.priorite}
                        </Badge>
                        
                        {task.deadline && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(task.deadline).toLocaleDateString('fr-FR')}
                          </Badge>
                        )}
                        
                        {task.time_spent && Number(task.time_spent) > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {typeof task.time_spent === 'string' 
                              ? `${task.time_spent}h` 
                              : `${Math.floor(task.time_spent / 60)}h ${task.time_spent % 60}m`
                            }
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {task.statut === 'à faire' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartTask(task.Id)}
                          className="gap-1"
                        >
                          <Play className="w-3 h-3" />
                          {isMobile ? '' : 'Commencer'}
                        </Button>
                      )}
                      
                      {(task.statut === 'en cours' || task.statut === 'en attente') && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTask(task.Id)}
                          className="gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {isMobile ? '' : 'Terminer'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tâches collaborateur (read-only) */}
      {adminTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <User className="w-5 h-5" />
            Tâches collaborateur ({adminTasks.length})
          </h3>
          <div className="space-y-3">
            {adminTasks.map(task => (
              <Card key={task.Id} className="opacity-75 bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-muted-foreground">{task.titre}</h4>
                        <Badge variant="outline" className="text-xs">
                          <User className="w-3 h-3 mr-1" />
                          Collaborateur
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getStatusColor(task.statut)} className="text-xs">
                          {task.statut}
                        </Badge>
                        
                        <Badge variant={getPriorityColor(task.priorite)} className="text-xs">
                          {task.priorite}
                        </Badge>
                        
                        {task.deadline && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(task.deadline).toLocaleDateString('fr-FR')}
                          </Badge>
                        )}
                        
                        {task.time_spent && Number(task.time_spent) > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {typeof task.time_spent === 'string' 
                              ? `${task.time_spent}h` 
                              : `${Math.floor(task.time_spent / 60)}h ${task.time_spent % 60}m`
                            }
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientTaskManager;