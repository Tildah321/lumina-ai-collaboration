import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Target, Clock, Users, Building, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { TimeTracker } from '@/components/time/TimeTracker';

interface TaskKanbanTask {
  id: string | number;
  titre: string;
  status: string;
  responsable: string;
  priorite: string;
  deadline?: string;
  time_spent?: number;
  isInternal?: boolean;
  _spaceName?: string;
}

interface TaskKanbanProps {
  tasks: TaskKanbanTask[];
  onDragStart: (e: React.DragEvent, taskId: string | number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => Promise<void>;
  onEditTask: (task: TaskKanbanTask) => void;
  onDeleteTask: (task: TaskKanbanTask) => Promise<void>;
  onTaskDeconstruct: (task: TaskKanbanTask) => void;
  onTimeUpdate: (taskId: string, time: number) => void;
  timerTaskId: string | null;
  setTimerTaskId: (id: string | null) => void;
}

const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  onDragStart,
  onDragOver,
  onDrop,
  onEditTask,
  onDeleteTask,
  onTaskDeconstruct,
  onTimeUpdate,
  timerTaskId,
  setTimerTaskId
}) => {
  const columns = [
    { id: 'À faire', title: 'À faire', color: 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800' },
    { id: 'En cours', title: 'En cours', color: 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' },
    { id: 'Bientôt fini', title: 'Bientôt fini', color: 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800' },
    { id: 'Terminé', title: 'Terminé', color: 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Haute': return 'bg-red-500';
      case 'Moyenne': return 'bg-yellow-500';
      case 'Basse': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getResponsibleIcon = (responsible: string) => {
    return responsible === 'Client' ? <Users className="w-3 h-3" /> : <Building className="w-3 h-3" />;
  };

  const isOverdue = (deadline: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const isClientTask = (task: TaskKanbanTask) => task.responsable === 'Client';

  const [dragPosition, setDragPosition] = React.useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setDragPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const activeTask = tasks.find(task => task.id.toString() === timerTaskId);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {columns.map(column => (
        <div
          key={column.id}
          onDragOver={onDragOver}
          onDrop={e => onDrop(e, column.id)}
          className={`${column.color} rounded-xl p-3 lg:p-4 min-h-[600px] transition-all duration-200 hover:shadow-sm`}
        >
          <div className="font-semibold mb-4 flex items-center justify-between sticky top-0 bg-inherit pb-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              {column.id === 'À faire' && <AlertCircle className="w-4 h-4 text-orange-500" />}
              {column.id === 'En cours' && <Clock className="w-4 h-4 text-blue-500" />}
              {column.id === 'Bientôt fini' && <Target className="w-4 h-4 text-yellow-500" />}
              {column.id === 'Terminé' && <CheckCircle className="w-4 h-4 text-green-500" />}
              {column.title}
            </span>
            <Badge variant="outline" className="text-xs px-2 py-1">
              {tasks.filter(t => t.status === column.id).length}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {tasks
              .filter(t => t.status === column.id)
              .map(task => (
                <Card
                  key={task.id}
                  className="hover:shadow-lg transition-all duration-200 cursor-move bg-card/95 backdrop-blur-sm border-border/50 hover:border-border group"
                  draggable
                  onDragStart={e => onDragStart(e, task.id)}
                >
                  <CardContent className="p-3 lg:p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
                          {task.titre}
                        </h4>
                        
                        {task._spaceName && (
                          <p className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md inline-block">
                            {task._spaceName}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            {getResponsibleIcon(task.responsable)}
                            <span className="text-xs text-muted-foreground">
                              {task.responsable}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priorite)}`} />
                            <span className="text-xs text-muted-foreground">{task.priorite}</span>
                          </div>
                        </div>
                        
                        {task.deadline && (
                          <div className={`text-xs flex items-center gap-2 ${
                            isOverdue(task.deadline) ? 'text-red-600' : 'text-muted-foreground'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>


                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 flex-1 h-7 text-xs"
                        onClick={e => {
                          e.stopPropagation();
                          onTaskDeconstruct(task);
                        }}
                      >
                        <Target className="w-3 h-3" />
                        IA
                      </Button>
                      
                      {isClientTask(task) && task.status === 'En cours' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-7 text-xs px-2"
                          onClick={e => {
                            e.stopPropagation();
                            setTimerTaskId(timerTaskId === task.id.toString() ? null : task.id.toString());
                          }}
                        >
                          <Clock className="w-3 h-3" />
                        </Button>
                      )}
                      
                      {!isClientTask(task) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs px-2"
                            onClick={e => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs px-2 text-red-600 hover:text-red-700"
                            onClick={e => {
                              e.stopPropagation();
                              onDeleteTask(task);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            
            {tasks.filter(t => t.status === column.id).length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed border-border rounded-lg">
                Glissez une tâche ici
              </div>
            )}
          </div>
        </div>
      ))}
      </div>

      {/* TimeTracker en popup draggable */}
      {timerTaskId && activeTask && (
        <div
          className="fixed z-50 w-80"
          style={{
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <TimeTracker
            task={{
              id: activeTask.id.toString(),
              titre: activeTask.titre,
              time_spent: activeTask.time_spent,
              isInternal: activeTask.isInternal
            }}
            onTimeUpdate={(taskId, time) => onTimeUpdate(taskId, time)}
            onClose={() => setTimerTaskId(null)}
            onDragStart={handleDragStart}
          />
        </div>
      )}
    </>
  );
};

export default TaskKanban;