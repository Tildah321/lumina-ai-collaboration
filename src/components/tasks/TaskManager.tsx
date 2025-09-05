import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Calendar, User, Clock } from 'lucide-react';
import { TimeTracker } from '@/components/time/TimeTracker';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSpaceData } from '@/hooks/useSpaceData';
import nocodbService from '@/services/nocodbService';
interface Task {
  Id: string;
  id: string;
  titre: string;
  assigné_a: 'client' | 'moi';
  deadline: string;
  statut: 'à faire' | 'en cours' | 'en attente' | 'fait';
  projet_id: string;
  priorité: 'faible' | 'moyenne' | 'haute';
  time_spent?: number | string; // en minutes (number) ou heures décimales (string)
}
interface TaskManagerProps {
  projetId: string;
  isClient?: boolean;
  onDataChange?: () => void; // Callback pour notifier les changements
}
const TaskManager = ({
  projetId,
  isClient = false,
  onDataChange
}: TaskManagerProps) => {
  const { toast } = useToast();
  const spaceData = useSpaceData(projetId, isClient);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    titre: '',
    assigné_a: 'moi' as 'client' | 'moi',
    statut: 'à faire' as Task['statut'],
    deadline: '',
    priorité: 'moyenne' as Task['priorité']
  });

  // Utiliser les données du hook centralisé avec filtre pour client
  const allTasks = spaceData.tasks;
  const tasks = isClient
    ? allTasks.filter((task: any) => (task.assigne_a || task["assigné_a"]) === 'client')
    : allTasks;
  
  // Afficher les erreurs si nécessaire
  useEffect(() => {
    if (spaceData.error && !spaceData.error.includes('Too many requests')) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les tâches",
        variant: "destructive"
      });
    }
  }, [spaceData.error, toast]);

  // Créer une tâche
  const handleCreateTask = async () => {
    if (!newTask.titre.trim()) return;
    try {
      const taskData = {
        titre: newTask.titre,
        assigne_a: newTask.assigné_a,
        // NocoDB utilise sans accent
        statut: newTask.statut,
        deadline: newTask.deadline,
        projet_id: projetId,
        priorite: newTask.priorité // NocoDB utilise sans accent
      };
      console.log('🎯 Creating task with data:', taskData);
      const createdTask = await nocodbService.createTask(taskData);
      console.log('✅ Task created successfully:', createdTask);
      
      // Normaliser et mettre à jour le cache local (sans refresh)
      const taskWithFullData: Task = {
        ...(createdTask as any),
        id: (createdTask as any).Id || (createdTask as any).id,
        assigné_a: taskData.assigne_a,
        priorité: taskData.priorite,
        time_spent: 0,
      } as any;
      
      spaceData.addTaskToCache?.(taskWithFullData as any);
      
      setNewTask({
        titre: '',
        assigné_a: 'moi',
        statut: 'à faire',
        deadline: '',
        priorité: 'moyenne'
      });
      setIsCreateDialogOpen(false);
      toast({
        title: "Tâche créée",
        description: "La tâche a été ajoutée avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la tâche",
        variant: "destructive"
      });
    }
  };

  // Modifier une tâche
  const handleEditTask = async () => {
    if (!editingTask) return;
    const taskId = editingTask.Id || editingTask.id;
    const previousTask = tasks.find(t => (t.Id || t.id) === taskId);

    // Mise à jour optimiste du cache
    spaceData.updateTaskInCache?.(taskId, {
      titre: editingTask.titre,
      assigné_a: editingTask.assigné_a,
      statut: editingTask.statut,
      deadline: editingTask.deadline,
      priorité: editingTask.priorité
    } as any);

    setEditingTask(null);
    setIsEditDialogOpen(false);

    try {
      const payload = {
        titre: editingTask.titre,
        assigne_a: editingTask.assigné_a,
        // NocoDB utilise sans accent
        statut: editingTask.statut,
        deadline: editingTask.deadline,
        priorite: editingTask.priorité // NocoDB utilise sans accent
      };
      await nocodbService.updateTask(taskId, payload);
      toast({
        title: "Tâche modifiée",
        description: "La tâche a été mise à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification de la tâche:', error);
      // Revenir à l'état précédent si l'update échoue
      if (previousTask) {
        spaceData.updateTaskInCache?.(taskId, previousTask as any);
      }
      toast({
        title: "Erreur",
        description: "Impossible de modifier la tâche",
        variant: "destructive"
      });
    }
  };

  // Supprimer une tâche
  const handleDeleteTask = async (taskId: string) => {
    try {
      await nocodbService.deleteTask(taskId);
      // Mettre à jour le cache local
      spaceData.removeTaskFromCache?.(taskId);
      
      toast({
        title: "Tâche supprimée",
        description: "La tâche a été supprimée avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la tâche",
        variant: "destructive"
      });
    }
  };

  // Marquer comme terminé
  const handleCompleteTask = async (taskId: string) => {
    try {
      const taskToUpdate = tasks.find(task => task.Id === taskId);
      if (!taskToUpdate) return;
      const payload = {
        statut: 'fait' as Task['statut']
      };
      await nocodbService.updateTask(taskId, payload);
      // Mettre à jour le cache local (sans refresh)
      spaceData.updateTaskInCache?.(taskId, { statut: 'fait' as Task['statut'] });
      
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

  // Commencer une tâche (passer de "à faire" à "en cours")
  const handleStartTask = async (taskId: string) => {
    try {
      const payload = {
        statut: 'en cours' as Task['statut']
      };
      await nocodbService.updateTask(taskId, payload);
      // Mettre à jour le cache local
      spaceData.updateTaskInCache?.(taskId, { statut: 'en cours' as Task['statut'] });
      
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

  const handleTimeUpdate = (taskId: string, timeSpent: number) => {
    // Mettre à jour dans le cache local si le contexte est disponible
    if (spaceData.updateTaskInCache) {
      spaceData.updateTaskInCache(taskId, { time_spent: timeSpent });
    }
    
    // Notifier le changement
    if (onDataChange) {
      onDataChange();
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask({
      ...task
    });
    setIsEditDialogOpen(true);
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
  return <div className="space-y-4">
      {!isClient && <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Gestion des tâches</h3>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle tâche</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="titre">Titre *</Label>
                  <Input id="titre" value={newTask.titre} onChange={e => setNewTask({
                ...newTask,
                titre: e.target.value
              })} placeholder="Installer le CMS" />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Assigné à</Label>
                    <Select value={newTask.assigné_a} onValueChange={(value: 'client' | 'moi') => setNewTask({
                  ...newTask,
                  assigné_a: value
                })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moi">Moi</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={newTask.statut} onValueChange={(value: Task['statut']) => setNewTask({
                  ...newTask,
                  statut: value
                })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="à faire">À faire</SelectItem>
                        <SelectItem value="en cours">En cours</SelectItem>
                        <SelectItem value="en attente">En attente</SelectItem>
                        <SelectItem value="fait">Fait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select value={newTask.priorité} onValueChange={(value: Task['priorité']) => setNewTask({
                  ...newTask,
                  priorité: value
                })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faible">Faible</SelectItem>
                        <SelectItem value="moyenne">Moyenne</SelectItem>
                        <SelectItem value="haute">Haute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deadline">Échéance</Label>
                  <Input id="deadline" type="date" value={newTask.deadline} onChange={e => setNewTask({
                ...newTask,
                deadline: e.target.value
              })} />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateTask} disabled={!newTask.titre.trim()}>
                  Créer la tâche
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>}

      <div className="space-y-3">
        {/* Afficher une alerte pour les tâches en retard si c'est un client et qu'il a des tâches en retard */}
        {isClient && tasks.filter(task => task.assigné_a === 'client' && task.deadline && new Date(task.deadline) < new Date() && task.statut !== 'fait').length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4">
              <h4 className="font-medium text-destructive mb-2">⚠️ Tâches en retard</h4>
              <p className="text-sm text-destructive">
                Vous avez {tasks.filter(task => task.assigné_a === 'client' && task.deadline && new Date(task.deadline) < new Date() && task.statut !== 'fait').length} tâche(s) en retard qui nécessitent votre attention.
              </p>
            </CardContent>
          </Card>
        )}
        
        {tasks.length === 0 ? <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune tâche pour le moment</p>
              {!isClient && <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  Créer la première tâche
                </Button>}
            </CardContent>
          </Card> : tasks.map(task => {
            // Pour les clients, masquer les tâches qui ne leur sont pas assignées
            if (isClient && task.assigné_a !== 'client') {
              return null;
            }
            
            return <Card key={task.Id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{task.titre}</h4>
                      <Badge variant={getAssigneeColor(task.assigné_a)} className="text-xs">
                        <User className="w-3 h-3 mr-1" />
                        {task.assigné_a === 'moi' ? 'Moi' : 'Client'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getStatusColor(task.statut)} className="text-xs">
                        {task.statut}
                      </Badge>
                      
                      {task.deadline && <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(task.deadline).toLocaleDateString('fr-FR')}
                        </Badge>}
                        
                        {/* Afficher le temps passé si il y en a */}
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
                    {!isClient && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(task)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer la tâche</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTask(task.Id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    
                    {/* Bouton Commencer pour les tâches "à faire" */}
                    {task.statut === 'à faire' && !isClient && task.assigné_a === 'moi' && (
                      <Button size="sm" variant="outline" onClick={() => handleStartTask(task.Id)}>
                        Commencer
                      </Button>
                    )}
                    
                    {/* Bouton Terminer pour les tâches "en cours" ou pour les clients */}
                    {task.statut !== 'fait' && task.statut !== 'à faire' && (
                      (isClient ? task.assigné_a === 'client' : true) && (
                        <Button size="sm" variant="default" onClick={() => handleCompleteTask(task.Id)}>
                          {isClient ? 'Valider' : 'Terminer'}
                        </Button>
                      )
                    )}
                  </div>
                </div>
                
                {/* TimeTracker pour les tâches en cours et assignées à moi (pour les non-clients) */}
                {!isClient && task.assigné_a === 'moi' && task.statut === 'en cours' && (
                  <div className="mt-4 pt-4 border-t">
                    <TimeTracker task={task} onTimeUpdate={handleTimeUpdate} />
                  </div>
                )}
              </CardContent>
            </Card>
          })}
        
        {/* Message si un client n'a aucune tâche assignée */}
        {isClient && tasks.filter(task => task.assigné_a === 'client').length === 0 && tasks.length > 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune tâche ne vous est assignée pour le moment</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de modification */}
      {editingTask && <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifier la tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-titre">Titre *</Label>
                <Input id="edit-titre" value={editingTask.titre} onChange={e => setEditingTask({
              ...editingTask,
              titre: e.target.value
            })} />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Assigné à</Label>
                  <Select value={editingTask.assigné_a} onValueChange={(value: 'client' | 'moi') => setEditingTask({
                ...editingTask,
                assigné_a: value
              })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moi">Moi</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editingTask.statut} onValueChange={(value: Task['statut']) => setEditingTask({
                ...editingTask,
                statut: value
              })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="à faire">À faire</SelectItem>
                      <SelectItem value="en cours">En cours</SelectItem>
                      <SelectItem value="en attente">En attente</SelectItem>
                      <SelectItem value="fait">Fait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={editingTask.priorité} onValueChange={(value: Task['priorité']) => setEditingTask({
                ...editingTask,
                priorité: value
              })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faible">Faible</SelectItem>
                      <SelectItem value="moyenne">Moyenne</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-deadline">Échéance</Label>
                <Input id="edit-deadline" type="date" value={editingTask.deadline} onChange={e => setEditingTask({
              ...editingTask,
              deadline: e.target.value
            })} />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditTask}>
                Sauvegarder
              </Button>
            </div>
          </DialogContent>
        </Dialog>}
    </div>;
};
export default TaskManager;