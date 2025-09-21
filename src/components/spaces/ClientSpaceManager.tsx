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
import { Plus, Edit, Trash2, Building, Share2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';
import ClientShareDialog from '@/components/client/ClientShareDialog';
import SpaceAccessManager from '@/components/collaboration/SpaceAccessManager';
import { usePlan } from '@/contexts/PlanContext';

interface ClientSpace {
  id: string;
  email: string;
  statut: 'Nouveau' | 'En cours' | 'Terminé' | 'En attente' | 'Annulé';
  description: string;
  lien_portail: string;
  prix_payement: number;
  lien_payement: string; 
  lien_whatsapp: string;
  client_access_enabled: boolean;
  client_link_token: string;
  client_password_hash?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientSpaceManagerProps {
  onSpaceSelect?: (space: ClientSpace) => void;
}

const ClientSpaceManager = ({ onSpaceSelect }: ClientSpaceManagerProps) => {
  const { toast } = useToast();
  const { updateActiveSpacesCount } = usePlan();
  const [spaces, setSpaces] = useState<ClientSpace[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [selectedSpaceForShare, setSelectedSpaceForShare] = useState<ClientSpace | null>(null);
  const [selectedSpaceForAccess, setSelectedSpaceForAccess] = useState<ClientSpace | null>(null);
  const [editingSpace, setEditingSpace] = useState<ClientSpace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newSpace, setNewSpace] = useState({
    email: '',
    statut: 'Nouveau' as ClientSpace['statut'],
    description: '',
    lien_portail: '',
    prix_payement: 0,
    lien_payement: '',
    lien_whatsapp: '',
    lien_onboarding: ''
  });

  // Mapping refactorisé - alignement EXACT avec structure table NocoDB
  const mapSpaceFromNoco = (space: any) => {
    console.log('🔄 Raw NocoDB data:', space);
    
    let parsedNotes = {};
    try {
      parsedNotes = space.notes ? JSON.parse(space.notes) : {};
    } catch (e) {
      console.log('Notes parsing failed, using empty object');
    }
    
    const mapped = {
      id: space.Id || space.id,
      email: space.email || '',
      statut: space.statut || 'Nouveau',
      description: space.description || '',
      lien_portail: space.lien_portail || '',
      prix_payement: Number(space.prix_payement) || 0,
      lien_payement: space.lien_payement || '',
      lien_whatsapp: space.lien_whatsapp || '',
      client_access_enabled: space.client_access_enabled || false,
      client_link_token: space.client_link_token || '',
      client_password_hash: space.client_password_hash || '',
      notes: space.notes || '',
      createdAt: space.CreatedAt || '',
      updatedAt: space.UpdatedAt || ''
    } as ClientSpace;
    
    console.log('✅ Mapped space:', mapped);
    return mapped;
  };

  // Charger les espaces depuis NocoDB
  useEffect(() => {
    const loadSpaces = async () => {
      setIsLoading(true);
      try {
        const response = await nocodbService.getClients();
        console.log('🏢 Spaces loaded:', response);
        const mappedSpaces = (response.list || []).map(mapSpaceFromNoco);
        setSpaces(mappedSpaces);
      } catch (error) {
        console.error('Erreur lors du chargement des espaces:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les espaces clients",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSpaces();
  }, [toast]);


  // CRUD refactorisé complet selon structure exacte NocoDB
  const handleCreateSpace = async () => {
    if (!newSpace.email.trim()) {
      toast({
        title: "Erreur",
        description: "L'email est requis",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🎯 Creating space with exact table structure:', newSpace);
      
      // Payload EXACT selon colonnes visibles dans screenshot
      const payload = {
        email: newSpace.email.trim(),
        statut: newSpace.statut,
        description: newSpace.description.trim() || null,
        lien_portail: newSpace.lien_portail.trim() || null,
        prix_payement: newSpace.prix_payement > 0 ? newSpace.prix_payement : null,
        lien_payement: newSpace.lien_payement.trim() || null,
        lien_whatsapp: newSpace.lien_whatsapp.trim() || null,
        cz787nu83e9bvlu: newSpace.lien_onboarding.trim() || null,
        client_access_enabled: false,
        client_link_token: null,
        notes: JSON.stringify({
          created_by: 'admin',
          creation_date: new Date().toISOString()
        })
      };

      console.log('🚀 Exact payload for NocoDB:', payload);

      const response = await nocodbService.createClient(payload);
      console.log('✅ NocoDB creation response:', response);
      
      // Mettre à jour le compteur d'espaces actifs dans le plan utilisateur
      await updateActiveSpacesCount();
      
      // Recharger la liste complète
      const freshResponse = await nocodbService.getClients();
      const mappedSpaces = (freshResponse.list || []).map(mapSpaceFromNoco);
      setSpaces(mappedSpaces);
      
      // Reset form
      setNewSpace({
        email: '',
        statut: 'Nouveau',
        description: '',
        lien_portail: '',
        prix_payement: 0,
        lien_payement: '',
        lien_whatsapp: '',
        lien_onboarding: ''
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Espace créé",
        description: "L'espace client a été créé avec succès"
      });
    } catch (error) {
      console.error('❌ Erreur création espace:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'espace client",
        variant: "destructive"
      });
    }
  };

  // Modifier un espace
  const handleEditSpace = async () => {
    if (!editingSpace) return;

    try {
      console.log('🔄 Editing space:', editingSpace);
      
      const payload = {
        email: editingSpace.email.trim(),
        statut: editingSpace.statut,
        description: editingSpace.description.trim() || null,
        lien_portail: editingSpace.lien_portail.trim() || null,
        prix_payement: editingSpace.prix_payement > 0 ? editingSpace.prix_payement : null,
        lien_payement: editingSpace.lien_payement.trim() || null,
        lien_whatsapp: editingSpace.lien_whatsapp.trim() || null,
        notes: JSON.stringify({
          updated_by: 'admin',
          updated_date: new Date().toISOString()
        })
      };

      console.log('🚀 Update payload:', payload);

      await nocodbService.updateClient(editingSpace.id, payload);
      
      // Recharger depuis NocoDB
      const freshResponse = await nocodbService.getClients();
      const mappedSpaces = (freshResponse.list || []).map(mapSpaceFromNoco);
      setSpaces(mappedSpaces);
      
      setEditingSpace(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Espace modifié",
        description: "L'espace client a été mis à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification de l\'espace:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'espace client",
        variant: "destructive"
      });
    }
  };

  // Supprimer un espace
  const handleDeleteSpace = async (spaceId: string) => {
    try {
      await nocodbService.deleteClient(spaceId);
      
      // Mettre à jour le compteur d'espaces actifs
      await updateActiveSpacesCount();
      
      const updatedSpaces = spaces.filter(space => space.id !== spaceId);
      setSpaces(updatedSpaces);
      
      toast({
        title: "Espace supprimé",
        description: "L'espace client a été supprimé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'espace:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'espace client",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (space: ClientSpace) => {
    setEditingSpace({ ...space });
    setIsEditDialogOpen(true);
  };

  const openShareDialog = (space: ClientSpace) => {
    setSelectedSpaceForShare(space);
    setIsShareDialogOpen(true);
  };

  const openAccessDialog = (space: ClientSpace) => {
    setSelectedSpaceForAccess(space);
    setIsAccessDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Terminé': return 'default';
      case 'En cours': return 'secondary';
      case 'En attente': return 'outline';
      case 'Annulé': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div>Chargement des espaces...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des espaces clients</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvel espace
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Créer un nouvel espace client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email du client *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newSpace.email || ''}
                  onChange={(e) => setNewSpace({ ...newSpace, email: e.target.value })}
                  placeholder="client@email.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description du projet</Label>
                <Textarea
                  id="description"
                  value={newSpace.description || ''}
                  onChange={(e) => setNewSpace({ ...newSpace, description: e.target.value })}
                  placeholder="Description du projet"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={newSpace.statut} onValueChange={(value: ClientSpace['statut']) => setNewSpace({ ...newSpace, statut: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nouveau">Nouveau</SelectItem>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Terminé">Terminé</SelectItem>
                      <SelectItem value="En attente">En attente</SelectItem>
                      <SelectItem value="Annulé">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prix">Prix (€)</Label>
                  <Input
                    id="prix"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newSpace.prix_payement || ''}
                    onChange={(e) => setNewSpace({ ...newSpace, prix_payement: Number(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lien_portail">Lien Portail/Drive (optionnel)</Label>
                  <Input
                    id="lien_portail"
                    value={newSpace.lien_portail || ''}
                    onChange={(e) => setNewSpace({ ...newSpace, lien_portail: e.target.value })}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lien_payement">Lien de paiement</Label>
                  <Input
                    id="lien_payement"
                    value={newSpace.lien_payement || ''}
                    onChange={(e) => setNewSpace({ ...newSpace, lien_payement: e.target.value })}
                    placeholder="https://stripe.com/payment..."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lien_whatsapp">Lien Messages (optionnel)</Label>
                  <Input
                    id="lien_whatsapp"
                    value={newSpace.lien_whatsapp || ''}
                    onChange={(e) => setNewSpace({ ...newSpace, lien_whatsapp: e.target.value })}
                    placeholder="https://slack.com/... ou https://discord.gg/..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lien_onboarding">Lien d'onboarding (optionnel)</Label>
                  <Input
                    id="lien_onboarding"
                    value={newSpace.lien_onboarding || ''}
                    onChange={(e) => setNewSpace({ ...newSpace, lien_onboarding: e.target.value })}
                    placeholder="https://calendly.com/... ou formulaire"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateSpace} disabled={!newSpace.email.trim()}>
                Créer l'espace
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spaces.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun espace client pour le moment</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                Créer le premier espace
              </Button>
            </CardContent>
          </Card>
        ) : (
          spaces.map((space) => (
            <Card key={space.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{space.email}</CardTitle>
                  <Badge variant={getStatusColor(space.statut)} className="text-xs">
                    {space.statut}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {space.description && (
                    <div className="text-sm text-muted-foreground">
                      {space.description}
                    </div>
                  )}
                  {space.prix_payement > 0 && (
                    <div className="text-sm font-medium">
                      Prix: {space.prix_payement}€
                    </div>
                  )}
                  <div className="flex gap-2">
                    {space.lien_portail && <Badge variant="secondary" className="text-xs">Drive</Badge>}
                    {space.lien_payement && <Badge variant="secondary" className="text-xs">Paiement</Badge>}
                    {space.lien_whatsapp && <Badge variant="secondary" className="text-xs">WhatsApp</Badge>}
                    {space.client_access_enabled && <Badge variant="default" className="text-xs">🔗 Partagé</Badge>}
                    {space.client_password_hash && <Badge variant="outline" className="text-xs">🔐 Protégé</Badge>}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onSpaceSelect?.(space)}>
                    Ouvrir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(space)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openShareDialog(space)}>
                    <Share2 className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openAccessDialog(space)}>
                    <Users className="w-3 h-3" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer cet espace client ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSpace(space.id)}>
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
      {editingSpace && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifier l'espace client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email du client</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingSpace.email}
                  onChange={(e) => setEditingSpace({ ...editingSpace, email: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingSpace.description}
                  onChange={(e) => setEditingSpace({ ...editingSpace, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editingSpace.statut} onValueChange={(value: ClientSpace['statut']) => setEditingSpace({ ...editingSpace, statut: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nouveau">Nouveau</SelectItem>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Terminé">Terminé</SelectItem>
                      <SelectItem value="En attente">En attente</SelectItem>
                      <SelectItem value="Annulé">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-prix">Prix (€)</Label>
                  <Input
                    id="edit-prix"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingSpace.prix_payement}
                    onChange={(e) => setEditingSpace({ ...editingSpace, prix_payement: Number(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-lien_portail">Lien Portail/Drive</Label>
                  <Input
                    id="edit-lien_portail"
                    value={editingSpace.lien_portail}
                    onChange={(e) => setEditingSpace({ ...editingSpace, lien_portail: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-lien_payement">Lien de paiement</Label>
                  <Input
                    id="edit-lien_payement"
                    value={editingSpace.lien_payement}
                    onChange={(e) => setEditingSpace({ ...editingSpace, lien_payement: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-lien_whatsapp">Lien WhatsApp</Label>
                  <Input
                    id="edit-lien_whatsapp"
                    value={editingSpace.lien_whatsapp}
                    onChange={(e) => setEditingSpace({ ...editingSpace, lien_whatsapp: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditSpace} disabled={!editingSpace.email.trim()}>
                Mettre à jour
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de partage client */}
      {selectedSpaceForShare && (
        <ClientShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          spaceId={selectedSpaceForShare.id}
          spaceName={selectedSpaceForShare.email}
        />
      )}

      {/* Dialog de gestion des accès collaborateurs */}
      {selectedSpaceForAccess && (
        <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestion des accès collaborateurs</DialogTitle>
            </DialogHeader>
            <SpaceAccessManager 
              spaceId={selectedSpaceForAccess.id}
              spaceName={selectedSpaceForAccess.email}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClientSpaceManager;