import { useEffect, useState, useRef, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { Plus, LayoutGrid, List, Target, Clock, Edit, Trash2, Users, Building, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePlan } from '@/contexts/PlanContext';
import { Navigate } from 'react-router-dom';
import nocodbService from '@/services/nocodbService';
import { TimeTracker } from '@/components/time/TimeTracker';
import TaskManager from '@/components/tasks/TaskManager';
import TaskKanban from '@/components/tasks/TaskKanban';

const Tasky = () => {
  const { hasFeatureAccess, upgradeRequired, loading } = usePlan();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState<any>({
    title: '',
    responsible: 'Nous',
    status: 'À faire',
    priority: 'Moyenne',
    deadline: '',
    spaceId: ''
  });
  // Projets et sélection
  const [projects, setProjects] = useState<any[]>([]);
  const [taskScope, setTaskScope] = useState<'client' | 'internal'>('client');
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const currentTimerTask = tasks.find(t => t.id === timerTaskId);
  const [timerPosition, setTimerPosition] = useState({ right: 16, top: 16 });
  const timerDragRef = useRef<{ startX: number; startY: number; startRight: number; startTop: number } | null>(null);

  const handleTimerDrag = (e: MouseEvent) => {
    if (!timerDragRef.current) return;
    const dx = e.clientX - timerDragRef.current.startX;
    const dy = e.clientY - timerDragRef.current.startY;
    setTimerPosition({
      right: timerDragRef.current.startRight - dx,
      top: timerDragRef.current.startTop + dy,
    });
  };

  const handleTimerDragEnd = () => {
    timerDragRef.current = null;
    window.removeEventListener('mousemove', handleTimerDrag);
    window.removeEventListener('mouseup', handleTimerDragEnd);
  };

  const handleTimerDragStart = (e: ReactMouseEvent<HTMLDivElement>) => {
    timerDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: timerPosition.right,
      startTop: timerPosition.top,
    };
    window.addEventListener('mousemove', handleTimerDrag);
    window.addEventListener('mouseup', handleTimerDragEnd);
  };

  const [editTask, setEditTask] = useState<any | null>(null);
  const [spaceTasksProject, setSpaceTasksProject] = useState<any | null>(null);

  const getProjectName = (projet: any) => projet.nom || projet.name || 'Projet';

  // Supprimer complètement le système localStorage
  useEffect(() => {
    // Plus d'utilisation de localStorage pour les espaces clients
    // Tout passe par NocoDB maintenant
    console.log('🚀 Tasky refactorisé - Plus de localStorage');
  }, []);

  // Charger les projets depuis NocoDB
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await nocodbService.getProjets();
        const loadedProjects = (response.list || [])
          .filter(Boolean)
          .map((p: any) => ({
            ...p,
            id: p.id ?? p.Id,
          }))
          .filter((p: any) => p.id !== undefined && p.id !== null);
        setProjects(loadedProjects);
      } catch (error) {
        console.error('Erreur chargement projets NocoDB:', error);
      }
    };
    loadProjects();
  }, []);

  const mapStatus = (status: string) => {
    switch (status) {
      case 'à faire':
        return 'À faire';
      case 'en cours':
        return 'En cours';
      case 'bientot fini':
      case 'bientôt fini':
        return 'Bientôt fini';
      case 'en attente':
      case 'en attente dcp':
        return 'En cours';
      case 'fait':
        return 'Terminé';
      default:
        return status;
    }
  };

  const mapStatusToNoco = (status: string) => {
    switch (status) {
      case 'À faire':
        return 'à faire';
      case 'En cours':
        return 'en cours';
      case 'Bientôt fini':
        return 'bientot fini';
      case 'Terminé':
        return 'fait';
      default:
        return status;
    }
  };

  const mapPriority = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'faible':
      case 'basse':
        return 'Basse';
      case 'moyenne':
        return 'Moyenne';
      case 'haute':
        return 'Haute';
      default:
        return priority;
    }
  };

  const mapPriorityToNoco = (priority: string) => {
    switch (priority) {
      case 'Basse':
        return 'faible';
      case 'Moyenne':
        return 'moyenne';
      case 'Haute':
        return 'haute';
      default:
        return priority;
    }
  };

  const mapResponsible = (responsible: string) => {
    switch (responsible?.toLowerCase()) {
      case 'moi':
      case 'nous':
        return 'Nous';
      case 'client':
        return 'Client';
      default:
        return responsible;
    }
  };

  const mapResponsibleToNoco = (responsible: string) => {
    switch (responsible) {
      case 'Nous':
        return 'moi';
      case 'Client':
        return 'client';
      default:
        return responsible;
    }
  };

  const handleTimeUpdate = (taskId: string, time: number) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, time_spent: time } : t)));
  };

  // Utiliser directement NocoDB pour les tâches au lieu de localStorage
  useEffect(() => {
    const loadTasksFromNoco = async () => {
      try {
        let list: any[] = [];
        if (taskScope === 'internal') {
          const res = await nocodbService.getInternalTasks(false, { onlyCurrentUser: true });
          list = res.list || [];
        } else {
          // Récupérer les tâches de vos espaces (exclut les tâches assignées aux clients)
          const res = await nocodbService.getTasks(undefined, { onlyCurrentUser: false });
          const isClientAssigned = (t: any) => {
            const v = (t.assigne_a || t['assigné_a'] || t.responsable || t.responsible || '')
              .toString()
              .trim()
              .toLowerCase();
            return v === 'client';
          };
          list = (res.list || []).filter((t: any) => !isClientAssigned(t)).map((t: any) => ({ ...t, isInternal: false }));
        }

        const projectMap = new Map(
          projects.map(p => [p.id.toString(), getProjectName(p)])
        );
        const tasksWithNames = list.map((t: any) => ({
          ...t,
          id: t.Id || t.id,
          status: mapStatus(t.statut),
          responsable: mapResponsible(
            t.assigne_a || t['assigné_a'] || t.responsable || t.responsible
          ),
          priorite: mapPriority(t.priorite || t.priorité || t.priority),
          isInternal: t.isInternal,
          _spaceName: t.isInternal
            ? 'Interne'
            : projectMap.get(t.projet_id?.toString()) ?? '',
        }));
        setTasks(tasksWithNames);
      } catch (error) {
        console.error('Erreur chargement tâches NocoDB:', error);
        setTasks([]);
      }
    };

    loadTasksFromNoco();
  }, [taskScope, refreshTick, projects]);

  // Colonnes basées sur les statuts simplifiés
  const columns = [
    { id: 'À faire', title: 'À faire', color: 'bg-orange-50/50 dark:bg-orange-950/20' },
    { id: 'En cours', title: 'En cours', color: 'bg-blue-50/50 dark:bg-blue-950/20' },
    { id: 'Bientôt fini', title: 'Bientôt fini', color: 'bg-yellow-50/50 dark:bg-yellow-950/20' },
    { id: 'Terminé', title: 'Terminé', color: 'bg-green-50/50 dark:bg-green-950/20' },
  ];

  const handleDragStart = (e: DragEvent, taskId: string | number) => {
    e.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDrop = async (e: DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const movedTask = tasks.find(t => String(t.id) === taskId);
    const isInternal = movedTask?.isInternal;
    setTasks(prev => prev.map(t => (String(t.id) === taskId ? { ...t, status: newStatus } : t)));

    try {
      if (isInternal) {
        await nocodbService.updateInternalTask(taskId, { statut: mapStatusToNoco(newStatus) });
      } else {
        await nocodbService.updateTask(taskId, { statut: mapStatusToNoco(newStatus) });
      }
    } catch (error) {
      console.error('Erreur mise à jour statut tâche:', error);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const isClientTask = (task: any) =>
    (task.responsable || task.responsible || '') === 'Client';

  const handleTaskDeconstruct = (task: any) => {
    alert(`✨ Décomposition de "${task.titre}": Cette tâche peut être décomposée en 3 sous-tâches :\n    1. Recherche et benchmark\n    2. Création des wireframes\n    3. Tests et validation`);
  };

  const handleAiOrganize = () => {
    alert(`🎯 Suggestion d'organisation : Je recommande de prioriser les tâches de l'espace sélectionné. Deadlines optimisées !`);
  };

  const createTask = async () => {
    try {
      const payload: any = {
        titre: newTask.title,
        assigne_a: mapResponsibleToNoco(newTask.responsible),
        statut: mapStatusToNoco(newTask.status),
        priorite: mapPriorityToNoco(newTask.priority),
        deadline: newTask.deadline,
      };
      const isInternal = !newTask.spaceId.trim();
      if (!isInternal) {
        payload.projet_id = newTask.spaceId.trim();
      }
      if (isInternal) {
        await nocodbService.createInternalTask(payload);
      } else {
        await nocodbService.createTask(payload);
      }
      setIsCreateOpen(false);
      setNewTask({ title: '', responsible: 'Nous', status: 'À faire', priority: 'Moyenne', deadline: '', spaceId: '' });
      setRefreshTick((t) => t + 1);
    } catch (error) {
      console.error('Erreur création tâche:', error);
    }
  };

  const handleEditTask = (task: any) => {
    setEditTask({
      id: task.id,
      title: task.titre,
      responsible: task.responsable || task.responsible || 'Nous',
      status: task.status,
      priority: task.priorite || task.priority,
      deadline: task.deadline,
      isInternal: task.isInternal,
    });
  };

  const handleEditSubmit = async () => {
    if (!editTask) return;
    try {
      const payload: any = {
        titre: editTask.title,
        assigne_a: mapResponsibleToNoco(editTask.responsible),
        statut: mapStatusToNoco(editTask.status),
        priorite: mapPriorityToNoco(editTask.priority),
        deadline: editTask.deadline,
      };
      if (editTask.isInternal) {
        await nocodbService.updateInternalTask(editTask.id, payload);
      } else {
        await nocodbService.updateTask(editTask.id, payload);
      }
      setTasks(prev =>
        prev.map(t =>
          t.id === editTask.id
            ? {
                ...t,
                titre: editTask.title,
                responsable: editTask.responsible,
                status: editTask.status,
                priorite: editTask.priority,
                deadline: editTask.deadline,
              }
            : t,
        ),
      );
      setEditTask(null);
      setRefreshTick(t => t + 1);
    } catch (error) {
      console.error('Erreur mise à jour tâche:', error);
    }
  };

  const handleDeleteTask = async (task: any) => {
    try {
      if (task.isInternal) {
        await nocodbService.deleteInternalTask(task.id);
      } else {
        await nocodbService.deleteTask(task.id);
      }
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (error) {
      console.error('Erreur suppression tâche:', error);
    }
  };

  // Check for feature access after all hooks are declared
  if (!loading && !hasFeatureAccess('hasAIAssistants')) {
    upgradeRequired();
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header simple comme Pipou */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="w-8 h-8" />
              Tasky
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestion intelligente de vos tâches et projets
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ToggleGroup
              type="single"
              value={taskScope}
              onValueChange={value => value && setTaskScope(value as 'client' | 'internal')}
              variant="outline"
            >
              <ToggleGroupItem value="client" className="gap-2">
                <Users className="w-4 h-4" />
                Clients
              </ToggleGroupItem>
              <ToggleGroupItem value="internal" className="gap-2">
                <Building className="w-4 h-4" />
                Interne
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
              className="gap-2"
            >
              {viewMode === 'kanban' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              {viewMode === 'kanban' ? 'Vue Liste' : 'Vue Kanban'}
            </Button>
            
            <Button onClick={handleAiOrganize} variant="secondary" className="gap-2">
              <Target className="w-4 h-4" />
              Organiser IA
            </Button>
            
            <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Nouvelle tâche
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-6 space-y-6">
        {projects.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {projects.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant="outline"
                onClick={() => setSpaceTasksProject(p)}
                className="glass border-border/50 hover:bg-accent/10 hover-scale whitespace-nowrap"
              >
                {getProjectName(p)}
              </Button>
            ))}
          </div>
        )}

        {viewMode === 'kanban' ? (
          tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="glass-glow rounded-2xl p-8 border border-border/50 max-w-md mx-auto">
                <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Aucune tâche trouvée
                </p>
                <p className="text-sm text-muted-foreground/80 mt-2">
                  Créez votre première tâche pour commencer !
                </p>
              </div>
            </div>
          ) : (
            <TaskKanban
              tasks={tasks}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onTaskDeconstruct={handleTaskDeconstruct}
              onTimeUpdate={handleTimeUpdate}
              timerTaskId={timerTaskId}
              setTimerTaskId={setTimerTaskId}
            />
          )
        ) : (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="glass-glow rounded-2xl p-8 border border-border/50">
                  <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Aucune tâche trouvée
                  </p>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Créez votre première tâche pour commencer !
                  </p>
                </div>
              </div>
            ) : (
              tasks.map((task, index) => (
                <Card 
                  key={task.id} 
                  className="glass-glow hover:shadow-glow transition-all duration-300 hover-scale border-border/50 animate-fade-in hover:border-primary/20"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-center">
                      <div className="md:col-span-2 space-y-2">
                        <h4 className="font-semibold text-foreground text-lg">{task.titre}</h4>
                        {task.time_spent && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {Math.round(task.time_spent / 60)}min
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge 
                          variant={
                            task.status === 'Terminé' ? 'default' : 
                            task.status === 'En cours' ? 'secondary' : 
                            'outline'
                          }
                          className="text-xs bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20"
                        >
                          {task.status}
                        </Badge>
                        {task.priorite && (
                          <Badge 
                            variant={task.priorite === 'Haute' ? 'destructive' : task.priorite === 'Moyenne' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {task.priorite}
                          </Badge>
                        )}
                        {!task.isInternal && task._spaceName && (
                          <Badge variant="outline" className="text-xs bg-accent/10 text-accent-foreground border-accent/20">
                            {task._spaceName}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <Badge variant="outline" className="bg-background/50">
                          {task.responsable}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {task.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {task.deadline}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        {!task.isInternal && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTimerTaskId(timerTaskId === task.id ? null : task.id)}
                            className="gap-1 glass border-border/50 hover:bg-accent/10"
                          >
                            <Clock className="w-3 h-3" />
                            {timerTaskId === task.id ? 'Stop' : 'Timer'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditTask(task)}
                          className="gap-1 glass border-border/50 hover:bg-accent/10"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTask(task)}
                          className="gap-1 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Timer flottant avec design amélioré */}
        {timerTaskId && currentTimerTask && (
          <div
            className="fixed glass-glow border border-border/50 rounded-xl p-4 shadow-glow z-50 cursor-move backdrop-blur-sm bg-background/90"
            style={{ right: timerPosition.right, top: timerPosition.top }}
            onMouseDown={handleTimerDragStart}
          >
            <TimeTracker
              task={currentTimerTask}
              onTimeUpdate={handleTimeUpdate}
              onClose={() => setTimerTaskId(null)}
            />
          </div>
        )}
      </div>

      {/* Dialog de création avec design moderne */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="glass-glow border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Nouvelle tâche
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">Titre</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Titre de la tâche"
                className="glass border-border/50 focus:border-primary/50 mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="spaceId" className="text-sm font-medium">Espace client</Label>
              <Select
                value={newTask.spaceId}
                onValueChange={value => setNewTask({ ...newTask, spaceId: value })}
              >
                <SelectTrigger className="glass border-border/50 focus:border-primary/50 mt-1">
                  <SelectValue placeholder="Sélectionner un espace" />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  <SelectItem value="">Tâche interne</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {getProjectName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responsible" className="text-sm font-medium">Responsable</Label>
                <Select
                  value={newTask.responsible}
                  onValueChange={value => setNewTask({ ...newTask, responsible: value })}
                >
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-border/50">
                    <SelectItem value="Nous">Nous</SelectItem>
                    <SelectItem value="Client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority" className="text-sm font-medium">Priorité</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={value => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-border/50">
                    <SelectItem value="Basse">Basse</SelectItem>
                    <SelectItem value="Moyenne">Moyenne</SelectItem>
                    <SelectItem value="Haute">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="text-sm font-medium">Statut</Label>
                <Select
                  value={newTask.status}
                  onValueChange={value => setNewTask({ ...newTask, status: value })}
                >
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-border/50">
                    <SelectItem value="À faire">À faire</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Bientôt fini">Bientôt fini</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="deadline" className="text-sm font-medium">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newTask.deadline}
                  onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="glass border-border/50 focus:border-primary/50 mt-1"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="glass border-border/50">
              Annuler
            </Button>
            <Button 
              onClick={createTask} 
              disabled={!newTask.title}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              Créer la tâche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition avec design moderne */}
      {editTask && (
        <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
          <DialogContent className="glass-glow border-border/50 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Éditer la tâche
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="edit-title" className="text-sm font-medium">Titre</Label>
                <Input
                  id="edit-title"
                  value={editTask.title}
                  onChange={e => setEditTask({ ...editTask, title: e.target.value })}
                  placeholder="Titre de la tâche"
                  className="glass border-border/50 focus:border-primary/50 mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-responsible" className="text-sm font-medium">Responsable</Label>
                  <Select
                    value={editTask.responsible}
                    onValueChange={value => setEditTask({ ...editTask, responsible: value })}
                  >
                    <SelectTrigger className="glass border-border/50 focus:border-primary/50 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      <SelectItem value="Nous">Nous</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-priority" className="text-sm font-medium">Priorité</Label>
                  <Select
                    value={editTask.priority}
                    onValueChange={value => setEditTask({ ...editTask, priority: value })}
                  >
                    <SelectTrigger className="glass border-border/50 focus:border-primary/50 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      <SelectItem value="Basse">Basse</SelectItem>
                      <SelectItem value="Moyenne">Moyenne</SelectItem>
                      <SelectItem value="Haute">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-status" className="text-sm font-medium">Statut</Label>
                  <Select
                    value={editTask.status}
                    onValueChange={value => setEditTask({ ...editTask, status: value })}
                  >
                    <SelectTrigger className="glass border-border/50 focus:border-primary/50 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      <SelectItem value="À faire">À faire</SelectItem>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Bientôt fini">Bientôt fini</SelectItem>
                      <SelectItem value="Terminé">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-deadline" className="text-sm font-medium">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={editTask.deadline}
                    onChange={e => setEditTask({ ...editTask, deadline: e.target.value })}
                    className="glass border-border/50 focus:border-primary/50 mt-1"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="pt-6">
              <Button variant="outline" onClick={() => setEditTask(null)} className="glass border-border/50">
                Annuler
              </Button>
              <Button 
                onClick={handleEditSubmit} 
                disabled={!editTask.title}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog pour les tâches d'un espace spécifique */}
      {spaceTasksProject && (
        <Dialog open={!!spaceTasksProject} onOpenChange={() => setSpaceTasksProject(null)}>
          <DialogContent className="glass-glow border-border/50 max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Tâches - {getProjectName(spaceTasksProject)}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              <TaskManager projetId={spaceTasksProject.id} isClient={false} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Tasky;