import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, FolderOpen, Calendar, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface Projet {
  id: string;
  nom: string;
  client_id: string;
  description: string;
  livrable_type: string;
  deadline: string;
  statut: 'todo' | 'en cours' | 'livré' | 'validé';
  lien_drive: string;
}

interface ProjetManagerProps {
  clientId: string;
  onProjetSelect?: (projet: Projet) => void;
}

const ProjetManager = ({ clientId, onProjetSelect }: ProjetManagerProps) => {
  const { toast } = useToast();
  const [projets, setProjets] = useState<Projet[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProjet, setEditingProjet] = useState<Projet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjet, setNewProjet] = useState({
    nom: '',
    description: '',
    livrable_type: '',
    deadline: '',
    statut: 'todo' as Projet['statut'],
    lien_drive: ''
  });

  // Charger les projets depuis NocoDB
  useEffect(() => {
    const loadProjets = async () => {
      setIsLoading(true);
      try {
        const response = await nocodbService.getProjets(clientId);
        setProjets(response.list || []);
      } catch (error) {
        console.error('Erreur lors du chargement des projets:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les projets",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProjets();
  }, [clientId, toast]);

  // Créer un projet
  const handleCreateProjet = async () => {
    if (!newProjet.nom.trim()) return;

    try {
      const projetData = {
        ...newProjet,
        client_id: clientId
      };

      const response = await nocodbService.createProjet(projetData);
      const updatedProjets = [...projets, response];
      setProjets(updatedProjets);
      
      setNewProjet({
        nom: '',
        description: '',
        livrable_type: '',
        deadline: '',
        statut: 'todo',
        lien_drive: ''
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Projet créé",
        description: "Le projet a été ajouté avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet",
        variant: "destructive"
      });
    }
  };

  // Modifier un projet
  const handleEditProjet = async () => {
    if (!editingProjet) return;

    try {
      await nocodbService.updateProjet(editingProjet.id, editingProjet);
      
      const updatedProjets = projets.map(projet =>
        projet.id === editingProjet.id ? editingProjet : projet
      );
      setProjets(updatedProjets);
      
      setEditingProjet(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Projet modifié",
        description: "Le projet a été mis à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le projet",
        variant: "destructive"
      });
    }
  };

  // Supprimer un projet
  const handleDeleteProjet = async (projetId: string) => {
    try {
      await nocodbService.deleteProjet(projetId);
      
      const updatedProjets = projets.filter(projet => projet.id !== projetId);
      setProjets(updatedProjets);
      
      toast({
        title: "Projet supprimé",
        description: "Le projet a été supprimé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (projet: Projet) => {
    setEditingProjet({ ...projet });
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validé': return 'default';
      case 'livré': return 'secondary';
      case 'en cours': return 'outline';
      case 'todo': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div>Chargement des projets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Projets du client</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Créer un nouveau projet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom du projet *</Label>
                <Input
                  id="nom"
                  value={newProjet.nom}
                  onChange={(e) => setNewProjet({ ...newProjet, nom: e.target.value })}
                  placeholder="Refonte site web"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProjet.description}
                  onChange={(e) => setNewProjet({ ...newProjet, description: e.target.value })}
                  placeholder="Détails sur le projet"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="livrable_type">Type de livrable</Label>
                  <Input
                    id="livrable_type"
                    value={newProjet.livrable_type}
                    onChange={(e) => setNewProjet({ ...newProjet, livrable_type: e.target.value })}
                    placeholder="site vitrine, automatisations..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newProjet.deadline}
                    onChange={(e) => setNewProjet({ ...newProjet, deadline: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={newProjet.statut} onValueChange={(value: Projet['statut']) => setNewProjet({ ...newProjet, statut: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">À faire</SelectItem>
                      <SelectItem value="en cours">En cours</SelectItem>
                      <SelectItem value="livré">Livré</SelectItem>
                      <SelectItem value="validé">Validé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lien_drive">Lien Drive</Label>
                  <Input
                    id="lien_drive"
                    value={newProjet.lien_drive}
                    onChange={(e) => setNewProjet({ ...newProjet, lien_drive: e.target.value })}
                    placeholder="Lien vers le dossier partagé"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateProjet} disabled={!newProjet.nom.trim()}>
                Créer le projet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projets.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun projet pour ce client</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                Créer le premier projet
              </Button>
            </CardContent>
          </Card>
        ) : (
          projets.map((projet) => (
            <Card key={projet.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onProjetSelect?.(projet)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{projet.nom}</CardTitle>
                  <Badge variant={getStatusColor(projet.statut)} className="text-xs">
                    {projet.statut}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {projet.livrable_type && (
                    <div className="text-sm text-muted-foreground">
                      Type: {projet.livrable_type}
                    </div>
                  )}
                  {projet.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(projet.deadline).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  {projet.lien_drive && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ExternalLink className="w-4 h-4" />
                      <a href={projet.lien_drive} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Drive
                      </a>
                    </div>
                  )}
                  {projet.description && (
                    <p className="text-sm text-muted-foreground mt-2">{projet.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(projet)}>
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
                        <AlertDialogTitle>Supprimer le projet</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteProjet(projet.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de modification */}
      {editingProjet && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifier le projet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom du projet *</Label>
                <Input
                  id="edit-nom"
                  value={editingProjet.nom}
                  onChange={(e) => setEditingProjet({ ...editingProjet, nom: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingProjet.description}
                  onChange={(e) => setEditingProjet({ ...editingProjet, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-livrable_type">Type de livrable</Label>
                  <Input
                    id="edit-livrable_type"
                    value={editingProjet.livrable_type}
                    onChange={(e) => setEditingProjet({ ...editingProjet, livrable_type: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={editingProjet.deadline}
                    onChange={(e) => setEditingProjet({ ...editingProjet, deadline: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editingProjet.statut} onValueChange={(value: Projet['statut']) => setEditingProjet({ ...editingProjet, statut: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">À faire</SelectItem>
                      <SelectItem value="en cours">En cours</SelectItem>
                      <SelectItem value="livré">Livré</SelectItem>
                      <SelectItem value="validé">Validé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-lien_drive">Lien Drive</Label>
                  <Input
                    id="edit-lien_drive"
                    value={editingProjet.lien_drive}
                    onChange={(e) => setEditingProjet({ ...editingProjet, lien_drive: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditProjet} disabled={!editingProjet.nom.trim()}>
                Mettre à jour
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProjetManager;