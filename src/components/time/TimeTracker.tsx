import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Clock, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface Task {
  id: string;
  titre: string;
  time_spent?: number | string; // peut être en minutes (number) ou en heures décimales (string)
  isInternal?: boolean;
}

interface TimeTrackerProps {
  task: Task;
  onTimeUpdate: (taskId: string, timeSpent: number) => void;
  onClose: () => void;
  onDragStart?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export const TimeTracker = ({ task, onTimeUpdate, onClose, onDragStart }: TimeTrackerProps) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0); // en secondes
  const [totalTimeMinutes, setTotalTimeMinutes] = useState<number>(0); // en minutes
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Convertir le temps stocké en format décimal vers minutes pour l'affichage
    const timeSpent = task.time_spent || 0;
    let timeInMinutes: number;
    
    if (typeof timeSpent === 'string') {
      // Si c'est une chaîne, on assume que c'est au format décimal d'heures
      timeInMinutes = Math.round(parseFloat(timeSpent) * 60);
    } else {
      // Si c'est un nombre, on garde tel quel (rétrocompatibilité)
      timeInMinutes = timeSpent;
    }
    
    setTotalTimeMinutes(timeInMinutes);
  }, [task.time_spent]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setCurrentSessionSeconds(elapsed);
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleStart = () => {
    startTimeRef.current = Date.now() - currentSessionSeconds * 1000;
    setIsRunning(true);
    toast({
      title: "Timer démarré",
      description: `Timer lancé pour "${task.titre}"`
    });
  };

  const handlePause = () => {
    setIsRunning(false);
    toast({
      title: "Timer mis en pause",
      description: "Le temps est en pause, vous pouvez reprendre quand vous le souhaitez"
    });
  };

  const handleStop = async () => {
    setIsRunning(false);
    const sessionMinutes = currentSessionSeconds / 60; // Conversion exacte en minutes
    
    if (sessionMinutes > 0) {
      // Convertir en heures décimales (format 00.00) avec plus de précision
      const sessionHours = parseFloat((sessionMinutes / 60).toFixed(4)); // Plus de précision
      const currentTotalHours = parseFloat((totalTimeMinutes / 60).toFixed(4));
      const newTotalHours = parseFloat((currentTotalHours + sessionHours).toFixed(4));
      
      try {
        // Sauvegarder le temps en format décimal d'heures
        if (task.isInternal) {
          await nocodbService.updateInternalTask(task.id, {
            time_spent: `${Math.floor(newTotalHours)}:${Math.floor((newTotalHours % 1) * 60).toString().padStart(2, '0')}:${Math.floor(((newTotalHours % 1) * 60 % 1) * 60).toString().padStart(2, '0')}`
          });
        } else {
          await nocodbService.updateTask(task.id, {
            time_spent: `${Math.floor(newTotalHours)}:${Math.floor((newTotalHours % 1) * 60).toString().padStart(2, '0')}:${Math.floor(((newTotalHours % 1) * 60 % 1) * 60).toString().padStart(2, '0')}`
          });
        }
        
        // Mettre à jour en minutes pour l'affichage local
        const newTotalMinutes = Math.round(newTotalHours * 60);
        setTotalTimeMinutes(newTotalMinutes);
        onTimeUpdate(task.id, newTotalMinutes);
        
        
        const hours = Math.floor(currentSessionSeconds / 3600);
        const minutes = Math.floor((currentSessionSeconds % 3600) / 60);
        const seconds = currentSessionSeconds % 60;
        const timeDisplay = hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`;
        
        toast({
          title: "Temps enregistré",
          description: `${timeDisplay} ajoutées. Total: ${newTotalHours.toFixed(2)}h`
        });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du temps:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder le temps",
          variant: "destructive"
        });
      }
    }

    startTimeRef.current = null;
    setCurrentSessionSeconds(0);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatSessionTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader
        className="pb-3 cursor-move relative"
        onMouseDown={onDragStart}
      >
        <CardTitle className="text-sm font-medium flex items-center gap-2 pr-8">
          <Clock className="w-4 h-4" />
          {task.titre}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-2 right-2"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Fermer</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-mono font-bold text-primary">
              {formatSessionTime(currentSessionSeconds)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total: {formatTime(totalTimeMinutes)} 
              {totalTimeMinutes > 0 && (
                <span className="ml-1">({(totalTimeMinutes / 60).toFixed(2)}h)</span>
              )}
            </div>
          </div>
          <Badge variant={isRunning ? "default" : "secondary"}>
            {isRunning ? "En cours" : "Arrêté"}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} size="sm" className="gap-2">
              <Play className="w-3 h-3" />
              Démarrer
            </Button>
          ) : (
            <>
              <Button onClick={handlePause} variant="outline" size="sm" className="gap-2">
                <Pause className="w-3 h-3" />
                Pause
              </Button>
              <Button onClick={handleStop} variant="destructive" size="sm" className="gap-2">
                <Square className="w-3 h-3" />
                Arrêter
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};