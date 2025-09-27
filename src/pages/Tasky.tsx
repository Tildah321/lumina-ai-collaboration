import { useEffect, useState, useRef, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { Plus, LayoutGrid, List, Target, Clock, Edit, Trash2, Users, Building } from 'lucide-react';
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

const Tasky = () => {
  const { hasFeatureAccess, upgradeRequired, loading } = usePlan();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  
  if (!loading && !hasFeatureAccess('hasAIAssistants')) {
    upgradeRequired();
    return <Navigate to="/dashboard" replace />;
  }
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
          list = (res.list || []).filter((t: any) => !t.assigned_to_client).map((t: any) => ({ ...t, isInternal: false }));
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
    { id: 'À faire', title: 'À faire', color: 'bg-gray-100 dark:bg-gray-800' },
    { id: 'En cours', title: 'En cours', color: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: 'Bientôt fini', title: 'Bientôt fini', color: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { id: 'Terminé', title: 'Terminé', color: 'bg-green-100 dark:bg-green-900/30' },
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

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            Tasky - Chef de projet IA
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
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem value="client" className="gap-2 px-3">
              <Users className="w-4 h-4" />
              Clients
            </ToggleGroupItem>
            <ToggleGroupItem value="internal" className="gap-2 px-3">
              <Building className="w-4 h-4" />
              Interne
            </ToggleGroupItem>
          </ToggleGroup>


          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
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
        {projects.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4">
            {projects.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant="outline"
                onClick={() => setSpaceTasksProject(p)}
              >
                {getProjectName(p)}
              </Button>
            ))}
          </div>
        )}
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
            {tasks.length === 0 ? (
              <p className="col-span-full text-center text-sm text-muted-foreground">
                Aucune tâche trouvée.
              </p>
            ) : (
              columns.map((column) => (
                <div
                  key={column.id}
                  className={`${column.color} rounded-lg p-4`}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, column.id)}
                >
                  <h3 className="font-semibold mb-4 flex items-center justify-between">
                    {column.title}
                    <Badge variant="secondary" className="ml-2">
                      {tasks.filter(task => task.status === column.id).length}
                    </Badge>
                  </h3>
                  
                  <div className="space-y-3">
                    {tasks
                      .filter(task => task.status === column.id)
                      .map((task) => (
                        <Card
                          key={task.id}
                          className="hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={e => handleDragStart(e, task.id)}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">{task.titre}</h4>
                            
                              <div className="flex items-center justify-between text-xs">
                                {!task.isInternal && task._spaceName && (
                                  <Badge variant="outline">{task._spaceName}</Badge>
                                )}
                                {task.deadline && (
                                  <span className="text-muted-foreground">{task.deadline}</span>
                                )}
                              </div>
                            <div className="space-y-2 mt-3">
                              {!task.isInternal && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setTimerTaskId(timerTaskId === task.id ? null : task.id)}
                                  className="w-full gap-2 text-xs"
                                >
                                  <Clock className="w-3 h-3" />
                                  Timer
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTaskDeconstruct(task)}
                                className="w-full text-xs"
                                disabled={isClientTask(task)}
                              >
                                Déconstruire la tâche
                              </Button>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="p-2"
                                  onClick={() => handleEditTask(task)}
                                >
                                  <Edit className="w-3 h-3" />
                                  <span className="sr-only">Editer</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="p-2 text-destructive"
                                  onClick={() => handleDeleteTask(task)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span className="sr-only">Supprimer</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
      ) : (
        <Card className="glass-glow">
              <CardHeader>
                <CardTitle>Vue Liste des Tâches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Aucune tâche trouvée.
                    </p>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="space-y-2">
                        <div
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div>
                            <h4 className="font-medium">{task.titre}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            {!task.isInternal && task._spaceName && (
                              <Badge variant="outline">{task._spaceName}</Badge>
                            )}
                            {!task.isInternal && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setTimerTaskId(timerTaskId === task.id ? null : task.id)}
                                className="gap-2"
                              >
                                <Clock className="w-4 h-4" />
                                Timer
                              </Button>
                            )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTaskDeconstruct(task)}
                                disabled={isClientTask(task)}
                              >
                                Déconstruire la tâche
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditTask(task)}
                                className="p-2"
                              >
                                <Edit className="w-4 h-4" />
                                <span className="sr-only">Editer</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTask(task)}
                                className="p-2 text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="sr-only">Supprimer</span>
                              </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  </div>
                </CardContent>
          </Card>
        )}

        {currentTimerTask && (
          <div
            className="fixed w-80 z-50"
            style={{ top: timerPosition.top, right: timerPosition.right }}
          >
            <TimeTracker
              task={currentTimerTask}
              onTimeUpdate={handleTimeUpdate}
              onClose={() => setTimerTaskId(null)}
              onDragStart={handleTimerDragStart}
            />
          </div>
        )}

        {/* Dialog création tâche */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={newTask.responsible} onValueChange={(v: any) => setNewTask({ ...newTask, responsible: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nous">Nous</SelectItem>
                    <SelectItem value="Client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={newTask.priority} onValueChange={(v: any) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Basse">Basse</SelectItem>
                    <SelectItem value="Moyenne">Moyenne</SelectItem>
                    <SelectItem value="Haute">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={newTask.status} onValueChange={(v: any) => setNewTask({ ...newTask, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À faire">À faire</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Bientôt fini">Bientôt fini</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Échéance</Label>
                <Input type="date" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ID espace client (optionnel)</Label>
              <Input value={newTask.spaceId} onChange={(e) => setNewTask({ ...newTask, spaceId: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button onClick={createTask} disabled={!newTask.title.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>

        {/* Dialog édition tâche */}
        <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
          {editTask && (
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Modifier la tâche</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Responsable</Label>
                    <Select value={editTask.responsible} onValueChange={(v: any) => setEditTask({ ...editTask, responsible: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nous">Nous</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select value={editTask.priority} onValueChange={(v: any) => setEditTask({ ...editTask, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Basse">Basse</SelectItem>
                        <SelectItem value="Moyenne">Moyenne</SelectItem>
                        <SelectItem value="Haute">Haute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={editTask.status} onValueChange={(v: any) => setEditTask({ ...editTask, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="À faire">À faire</SelectItem>
                        <SelectItem value="En cours">En cours</SelectItem>
                        <SelectItem value="Bientôt fini">Bientôt fini</SelectItem>
                        <SelectItem value="Terminé">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Échéance</Label>
                    <Input type="date" value={editTask.deadline} onChange={(e) => setEditTask({ ...editTask, deadline: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditTask(null)}>Annuler</Button>
                <Button onClick={handleEditSubmit}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          )}
          </Dialog>
          <Dialog
            open={!!spaceTasksProject}
            onOpenChange={(o) => !o && setSpaceTasksProject(null)}
          >
            {spaceTasksProject && (
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Tâches {getProjectName(spaceTasksProject)}</DialogTitle>
                </DialogHeader>
                <TaskManager projetId={spaceTasksProject.id} />
              </DialogContent>
            )}
          </Dialog>
        </div>
    );
  };

  export default Tasky;