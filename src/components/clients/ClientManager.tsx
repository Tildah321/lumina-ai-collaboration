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
import { Plus, Edit, Trash2, Users, Calendar, Building, Settings, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  entreprise: string;
  statut: 'prospect' | 'actif' | 'terminé';
  offre: 'boost' | 'build' | 'partner';
  date_debut: string;
  date_fin: string;
  lien_portail: string;
  lien_onboarding: string;
  notes: string;
}

interface ClientManagerProps {
  onClientSelect?: (client: Client) => void;
}

const ClientManager = ({ onClientSelect }: ClientManagerProps) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    entreprise: '',
    statut: 'prospect' as Client['statut'],
    offre: 'boost' as Client['offre'],
    date_debut: '',
    date_fin: '',
    lien_portail: '',
    lien_onboarding: '',
    notes: ''
  });

  // Charger les clients depuis NocoDB
  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      try {
        const response = await nocodbService.getClients();
        setClients(response.list || []);
      } catch (error) {
        console.error('Erreur lors du chargement des clients:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les clients",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, [toast]);

  // Créer un client
  const handleCreateClient = async () => {
    if (!newClient.name.trim() || !newClient.email.trim()) return;

    try {
      const response = await nocodbService.createClient(newClient);
      const updatedClients = [...clients, response];
      setClients(updatedClients);
      
      setNewClient({
        name: '',
        email: '',
        phone: '',
        entreprise: '',
        statut: 'prospect',
        offre: 'boost',
        date_debut: '',
        date_fin: '',
        lien_portail: '',
        lien_onboarding: '',
        notes: ''
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Client créé",
        description: "Le client a été ajouté avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le client",
        variant: "destructive"
      });
    }
  };

  // Modifier un client
  const handleEditClient = async () => {
    if (!editingClient) return;

    try {
      await nocodbService.updateClient(editingClient.id, editingClient);
      
      const updatedClients = clients.map(client =>
        client.id === editingClient.id ? editingClient : client
      );
      setClients(updatedClients);
      
      setEditingClient(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Client modifié",
        description: "Le client a été mis à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification du client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le client",
        variant: "destructive"
      });
    }
  };

  // Supprimer un client
  const handleDeleteClient = async (clientId: string) => {
    try {
      await nocodbService.deleteClient(clientId);
      
      const updatedClients = clients.filter(client => client.id !== clientId);
      setClients(updatedClients);
      
      toast({
        title: "Client supprimé",
        description: "Le client a été supprimé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient({ ...client });
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'actif': return 'default';
      case 'prospect': return 'secondary';
      case 'terminé': return 'outline';
      default: return 'outline';
    }
  };

  const getOfferColor = (offer: string) => {
    switch (offer) {
      case 'partner': return 'destructive';
      case 'build': return 'default';
      case 'boost': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div>Chargement des clients...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des clients</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Créer un nouveau client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du client *</Label>
                  <Input
                    id="name"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="Martin Dupont"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="martin@email.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="+33612345678"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="entreprise">Entreprise</Label>
                  <Input
                    id="entreprise"
                    value={newClient.entreprise}
                    onChange={(e) => setNewClient({ ...newClient, entreprise: e.target.value })}
                    placeholder="Dupont SARL"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={newClient.statut} onValueChange={(value: Client['statut']) => setNewClient({ ...newClient, statut: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="terminé">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Offre</Label>
                  <Select value={newClient.offre} onValueChange={(value: Client['offre']) => setNewClient({ ...newClient, offre: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boost">Boost</SelectItem>
                      <SelectItem value="build">Build</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_debut">Date début</Label>
                  <Input
                    id="date_debut"
                    type="date"
                    value={newClient.date_debut}
                    onChange={(e) => setNewClient({ ...newClient, date_debut: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date_fin">Date fin</Label>
                  <Input
                    id="date_fin"
                    type="date"
                    value={newClient.date_fin}
                    onChange={(e) => setNewClient({ ...newClient, date_fin: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lien_portail">Lien portail</Label>
                <Input
                  id="lien_portail"
                  value={newClient.lien_portail}
                  onChange={(e) => setNewClient({ ...newClient, lien_portail: e.target.value })}
                  placeholder="URL vers l'espace portail"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lien_onboarding">Lien d'onboarding</Label>
                <Input
                  id="lien_onboarding"
                  value={newClient.lien_onboarding}
                  onChange={(e) => setNewClient({ ...newClient, lien_onboarding: e.target.value })}
                  placeholder="URL du formulaire d'onboarding ou calendly"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  placeholder="Infos WhatsApp, contexte..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateClient} disabled={!newClient.name.trim() || !newClient.email.trim()}>
                Créer le client
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun client pour le moment</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                Créer le premier client
              </Button>
            </CardContent>
          </Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onClientSelect?.(client)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <div className="flex gap-1">
                    <Badge variant={getStatusColor(client.statut)} className="text-xs">
                      {client.statut}
                    </Badge>
                    <Badge variant={getOfferColor(client.offre)} className="text-xs">
                      {client.offre}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.entreprise && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="w-4 h-4" />
                      <span>{client.entreprise}</span>
                    </div>
                  )}
                  {client.date_fin && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(client.date_fin).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(client)}>
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
                        <AlertDialogTitle>Supprimer le client</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteClient(client.id)}>
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
      {editingClient && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifier le client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nom du client *</Label>
                  <Input
                    id="edit-name"
                    value={editingClient.name}
                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingClient.email}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Téléphone</Label>
                  <Input
                    id="edit-phone"
                    value={editingClient.phone}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-entreprise">Entreprise</Label>
                  <Input
                    id="edit-entreprise"
                    value={editingClient.entreprise}
                    onChange={(e) => setEditingClient({ ...editingClient, entreprise: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editingClient.statut} onValueChange={(value: Client['statut']) => setEditingClient({ ...editingClient, statut: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="terminé">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Offre</Label>
                  <Select value={editingClient.offre} onValueChange={(value: Client['offre']) => setEditingClient({ ...editingClient, offre: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boost">Boost</SelectItem>
                      <SelectItem value="build">Build</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date_debut">Date début</Label>
                  <Input
                    id="edit-date_debut"
                    type="date"
                    value={editingClient.date_debut}
                    onChange={(e) => setEditingClient({ ...editingClient, date_debut: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-date_fin">Date fin</Label>
                  <Input
                    id="edit-date_fin"
                    type="date"
                    value={editingClient.date_fin}
                    onChange={(e) => setEditingClient({ ...editingClient, date_fin: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-lien_portail">Lien portail</Label>
                <Input
                  id="edit-lien_portail"
                  value={editingClient.lien_portail}
                  onChange={(e) => setEditingClient({ ...editingClient, lien_portail: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-lien_onboarding">Lien d'onboarding</Label>
                <Input
                  id="edit-lien_onboarding"
                  value={editingClient.lien_onboarding || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, lien_onboarding: e.target.value })}
                  placeholder="URL du formulaire d'onboarding ou calendly"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingClient.notes}
                  onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditClient} disabled={!editingClient.name.trim() || !editingClient.email.trim()}>
                Mettre à jour
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClientManager;