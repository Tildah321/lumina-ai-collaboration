import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Target, Calendar, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface Milestone {
  id: string;
  titre: string;
  description: string;
  deadline: string;
  terminé: boolean;
  projet_id: string;
}

interface MilestoneManagerProps {
  projetId: string;
  isClient?: boolean;
  onDataChange?: () => void; // Callback pour notifier les changements
}

const MilestoneManager = ({ projetId, isClient = false, onDataChange }: MilestoneManagerProps) => {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [newMilestone, setNewMilestone] = useState({
    titre: '',
    description: '',
    deadline: '',
    terminé: false
  });

  // Charger les jalons depuis NocoDB
  useEffect(() => {
    const loadMilestones = async () => {
      try {
        const response = await nocodbService.getMilestones(projetId);
        const sortedMilestones = (response.list || []).map((milestone: any) => ({
          ...milestone,
          id: milestone.Id || milestone.id,
          terminé: milestone.terminé === 'true' || milestone.terminé === true
        })).sort((a, b) => 
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
        setMilestones(sortedMilestones);
      } catch (error) {
        console.error('Erreur lors du chargement des jalons:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les jalons",
          variant: "destructive"
        });
      }
    };

    loadMilestones();
  }, [projetId, toast]);

  // Créer un jalon
  const handleCreateMilestone = async () => {
    if (!newMilestone.titre.trim() || !newMilestone.deadline) return;

    try {
      const milestoneData = {
        titre: newMilestone.titre,
        description: newMilestone.description,
        deadline: newMilestone.deadline,
        terminé: newMilestone.terminé,
        projet_id: projetId
      };

      const response = await nocodbService.createMilestone(milestoneData);
      const milestoneWithId = { ...response, id: response.Id || response.id };
      const updatedMilestones = [...milestones, milestoneWithId].sort((a, b) => 
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      );
      setMilestones(updatedMilestones);
      
      // Notifier le changement si callback fourni
      if (onDataChange) {
        onDataChange();
      }
      setNewMilestone({
        titre: '',
        description: '',
        deadline: '',
        terminé: false
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Jalon créé",
        description: "Le jalon a été ajouté avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la création du jalon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le jalon",
        variant: "destructive"
      });
    }
  };

  // Modifier un jalon
  const handleEditMilestone = async () => {
    if (!editingMilestone) return;

    try {
      const payload = {
        titre: editingMilestone.titre,
        description: editingMilestone.description,
        deadline: editingMilestone.deadline,
        terminé: editingMilestone.terminé,
      };

      await nocodbService.updateMilestone(editingMilestone.id, payload);
      
      const updatedMilestones = milestones
        .map(milestone =>
          milestone.id === editingMilestone.id ? { ...milestone, ...payload } : milestone
        )
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      
      setMilestones(updatedMilestones);
      setEditingMilestone(null);
      setIsEditDialogOpen(false);
      
      // Seulement notifier le changement
      if (onDataChange) {
        onDataChange();
      }
      
      toast({
        title: "Jalon modifié",
        description: "Le jalon a été mis à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification du jalon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le jalon",
        variant: "destructive"
      });
    }
  };

  // Supprimer un jalon
  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await nocodbService.deleteMilestone(milestoneId);
      
      const updatedMilestones = milestones.filter(milestone => milestone.id !== milestoneId);
      setMilestones(updatedMilestones);
      
      // Notifier le changement si callback fourni
      if (onDataChange) {
        onDataChange();
      }
      toast({
        title: "Jalon supprimé",
        description: "Le jalon a été supprimé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du jalon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le jalon",
        variant: "destructive"
      });
    }
  };

  // Marquer comme terminé
  const handleCompleteMilestone = async (milestoneId: string) => {
    try {
      const milestoneToUpdate = milestones.find(milestone => milestone.id === milestoneId);
      if (!milestoneToUpdate) return;

      const payload = { terminé: true };

      await nocodbService.updateMilestone(milestoneId, payload);
      
      const updatedMilestones = milestones.map(milestone =>
        milestone.id === milestoneId ? { ...milestone, ...payload } : milestone
      );
      setMilestones(updatedMilestones);
      
      // Notifier le changement si callback fourni
      if (onDataChange) {
        onDataChange();
      }
      toast({
        title: "Jalon terminé",
        description: "Le jalon a été marqué comme terminé"
      });
    } catch (error) {
      console.error('Erreur lors de la complétion du jalon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer le jalon comme terminé",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (milestone: Milestone) => {
    setEditingMilestone({ ...milestone });
    setIsEditDialogOpen(true);
  };

  const completedMilestones = milestones.filter(m => m.terminé).length;

  return (
    <div className="space-y-6">
      {/* En-tête et statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{milestones.length}</p>
                <p className="text-sm text-muted-foreground">Jalons totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedMilestones}</p>
                <p className="text-sm text-muted-foreground">Terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gestion des jalons */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Jalons du projet
            </CardTitle>
            {!isClient && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nouveau jalon
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Créer un nouveau jalon</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="titre">Titre du jalon *</Label>
                      <Input
                        id="titre"
                        value={newMilestone.titre}
                        onChange={(e) => setNewMilestone({ ...newMilestone, titre: e.target.value })}
                        placeholder="Livraison V1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newMilestone.description}
                        onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                        placeholder="Description de l'étape"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Date d'échéance *</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={newMilestone.deadline}
                        onChange={(e) => setNewMilestone({ ...newMilestone, deadline: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleCreateMilestone} disabled={!newMilestone.titre.trim() || !newMilestone.deadline}>
                      Créer le jalon
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {milestones.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun jalon défini pour le moment</p>
              {!isClient && (
                <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  Créer le premier jalon
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {milestones.map((milestone) => {
                const isOverdue = new Date(milestone.deadline) < new Date() && !milestone.terminé;
                
                return (
                  <div key={milestone.id} className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 ${
                        milestone.terminé 
                          ? 'bg-green-500' 
                          : isOverdue
                            ? 'bg-red-500'
                            : 'bg-primary'
                      }`}></div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-medium ${milestone.terminé ? 'text-muted-foreground' : ''}`}>
                            {milestone.titre}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              milestone.terminé 
                                ? 'default' 
                                : isOverdue 
                                  ? 'destructive' 
                                  : 'outline'
                            } className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(milestone.deadline).toLocaleDateString('fr-FR')}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                En retard
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mb-3">{milestone.description}</p>
                        )}
                        
                        {!isClient && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(milestone)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            
                            {!milestone.terminé && (
                              <Button size="sm" variant="default" onClick={() => handleCompleteMilestone(milestone.id)}>
                                Terminer
                              </Button>
                            )}
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer le jalon</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer ce jalon ? Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteMilestone(milestone.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de modification */}
      {editingMilestone && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifier le jalon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-titre">Titre du jalon *</Label>
                <Input
                  id="edit-titre"
                  value={editingMilestone.titre}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, titre: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingMilestone.description}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-deadline">Date d'échéance *</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={editingMilestone.deadline}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, deadline: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditMilestone} disabled={!editingMilestone.titre.trim() || !editingMilestone.deadline}>
                Sauvegarder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MilestoneManager;