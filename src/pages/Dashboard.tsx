import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Users, Eye, Link as LinkIcon, Edit, Trash2, LogOut, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import ClientShareDialog from '@/components/client/ClientShareDialog';
import nocodbService from '@/services/nocodbService';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import GlobalStats from '@/components/overview/GlobalStats';
import { WebhookManager } from '@/components/notifications/WebhookManager';
import { NotificationList } from '@/components/notifications/NotificationList';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { userPlan, planLimits, canCreateSpace, upgradeRequired } = usePlan();
  const globalStats = useGlobalStats();
  
  const [clientSpaces, setClientSpaces] = useState([]);
  const [editingSpace, setEditingSpace] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedSpaceForShare, setSelectedSpaceForShare] = useState(null);

  const [newSpace, setNewSpace] = useState({
    name: '',
    googleDriveLink: '',
    paymentAmount: '',
    paymentLink: '',
    messageLink: '',
    meetingLink: ''
  });

  useEffect(() => {
    if (isCreateDialogOpen) {
      const savedLinks = JSON.parse(localStorage.getItem('defaultLinks') || '{}');
      setNewSpace(ns => ({
        ...ns,
        paymentLink: savedLinks.paymentLink || '',
        messageLink: savedLinks.messageLink || '',
        meetingLink: savedLinks.meetingLink || ''
      }));
    }
  }, [isCreateDialogOpen]);

  // Charger seulement les espaces depuis NocoDB
  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const response = await nocodbService.getClients();
        console.log('🏢 Dashboard spaces loaded:', response);
        const mappedSpaces = (response.list || []).map((space: any) => ({
          ...space,
          id: space.Id || space.id,
          name: space.description || space.name || '',
          googleDriveLink: space.lien_portail || '',
          paymentLink: space.lien_payement || '',
          messageLink: space.lien_whatsapp || '',
          meetingLink: space.cc9tztuoagcmq8l || space.lien_rdv || '',
          paymentAmount: (space.prix_payement ?? 0).toString(),
          status: space.statut || 'Nouveau',
          projectsCount: 0,
          tasksCount: 0,
          lastActivity: 'Maintenant'
        }));
        setClientSpaces(mappedSpaces);
      } catch (error) {
        console.error('Erreur lors du chargement des espaces:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les espaces clients",
          variant: "destructive"
        });
      }
    };

    loadSpaces();
  }, [toast]);
  
  // Statistiques globales


  const handleCreateSpace = async () => {
    if (!newSpace.name) return;
    
    if (!canCreateSpace) {
      upgradeRequired();
      return;
    }
    
    try {
      const spaceData = {
        description: newSpace.name,
        statut: 'Nouveau',
        lien_portail: newSpace.googleDriveLink || null,
        prix_payement: newSpace.paymentAmount ? parseFloat(newSpace.paymentAmount) : null,
        lien_payement: newSpace.paymentLink || null,
        lien_whatsapp: newSpace.messageLink || null,
        cc9tztuoagcmq8l: newSpace.meetingLink || null,
        lien_rdv: newSpace.meetingLink || null,
        client_access_enabled: false,
        client_link_token: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await nocodbService.createClient(spaceData);
      const newSpaceWithId = {
        ...response,
        id: response.Id || response.id,
        name: response.description || '',
        googleDriveLink: response.lien_portail || '',
        paymentLink: response.lien_payement || '',
        messageLink: response.lien_whatsapp || '',
        meetingLink: response.cc9tztuoagcmq8l || response.lien_rdv || '',
        paymentAmount: (response.prix_payement ?? 0).toString(),
        status: response.statut || 'Nouveau',
        projectsCount: 0,
        tasksCount: 0,
        lastActivity: 'Maintenant'
      };

      setClientSpaces([...clientSpaces, newSpaceWithId]);
      setNewSpace({
        name: '',
        googleDriveLink: '',
        paymentAmount: '',
        paymentLink: '',
        messageLink: '',
        meetingLink: ''
      });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Espace créé',
        description: "L'espace client a été créé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de créer l'espace client",
        variant: 'destructive'
      });
    }
  };

  const handleEditSpace = async () => {
    if (!editingSpace) return;
    
    try {
      await nocodbService.updateClient(editingSpace.id, {
        description: editingSpace.name,
        lien_portail: editingSpace.googleDriveLink,
        prix_payement: editingSpace.paymentAmount ? parseFloat(editingSpace.paymentAmount) : null,
        lien_payement: editingSpace.paymentLink,
        lien_whatsapp: editingSpace.messageLink,
        cc9tztuoagcmq8l: editingSpace.meetingLink,
        lien_rdv: editingSpace.meetingLink,
        updatedAt: new Date().toISOString()
      });

      const updatedSpaces = clientSpaces.map(space => 
        space.id === editingSpace.id ? { ...editingSpace, lastActivity: "Maintenant" } : space
      );
      setClientSpaces(updatedSpaces);
      setEditingSpace(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Espace modifié",
        description: "L'espace client a été modifié avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'espace client",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSpace = async (spaceId) => {
    try {
      await nocodbService.deleteClient(spaceId);
      const updatedSpaces = clientSpaces.filter(space => space.id !== spaceId);
      setClientSpaces(updatedSpaces);
      toast({
        title: "Espace supprimé",
        description: "L'espace client a été supprimé"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'espace client",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (space) => {
    setEditingSpace({...space});
    setIsEditDialogOpen(true);
  };

  const handleInviteClient = () => {
    if (clientSpaces.length > 0) {
      setSelectedSpaceForShare(clientSpaces[0]);
      setShareDialogOpen(true);
    } else {
      toast({
        title: "Aucun espace disponible",
        description: "Créez d'abord un espace client pour pouvoir l'inviter"
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue {user?.email} • Gérez vos espaces clients</p>
          {userPlan && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={userPlan.plan_type === 'pro' ? 'default' : 'secondary'}>
                Plan {userPlan.plan_type === 'free' ? 'Gratuit' : 'Pro'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {userPlan.active_spaces_count}/{planLimits.maxActiveSpaces} espaces • 
                {userPlan.ai_tokens_used_today}/{planLimits.maxAITokensPerDay} tokens IA
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="lg" 
                className="gap-2"
                disabled={!canCreateSpace}
                onClick={!canCreateSpace ? upgradeRequired : undefined}
              >
                <Plus className="w-5 h-5" />
                Nouvel espace client
                {!canCreateSpace && <Crown className="w-4 h-4 ml-1" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Créer un nouvel espace client</DialogTitle>
                <DialogDescription>
                  Configurez un portail collaboratif personnalisé pour votre client
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="spaceName">Nom de l'espace *</Label>
                  <Input
                    id="spaceName"
                    placeholder="Ex: Projet Site Web StartupTech"
                    value={newSpace.name}
                    onChange={(e) => setNewSpace({...newSpace, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleDrive">Lien Portail / Drive (optionnel)</Label>
                  <Input
                    id="googleDrive"
                    placeholder="https://drive.google.com/..."
                    value={newSpace.googleDriveLink}
                    onChange={(e) => setNewSpace({...newSpace, googleDriveLink: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">Montant (€)</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      placeholder="1500"
                      value={newSpace.paymentAmount}
                      onChange={(e) => setNewSpace({...newSpace, paymentAmount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentLink">Lien de paiement</Label>
                    <Input
                      id="paymentLink"
                      placeholder="https://stripe.com/payment/..."
                      value={newSpace.paymentLink}
                      onChange={(e) => setNewSpace({...newSpace, paymentLink: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="messageLink">Lien Messages (optionnel)</Label>
                  <Input
                    id="messageLink"
                    placeholder="https://slack.com/... ou https://discord.gg/..."
                    value={newSpace.messageLink}
                    onChange={(e) => setNewSpace({...newSpace, messageLink: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingLink">Lien RDV (optionnel)</Label>
                  <Input
                    id="meetingLink"
                    placeholder="https://calendly.com/..."
                    value={newSpace.meetingLink}
                    onChange={(e) => setNewSpace({...newSpace, meetingLink: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <DialogTrigger asChild>
                  <Button variant="outline">Annuler</Button>
                </DialogTrigger>
                <Button 
                  onClick={handleCreateSpace}
                  disabled={!newSpace.name}
                >
                  Créer l'espace
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <GlobalStats stats={globalStats} activeClients={clientSpaces.length} />

      {/* Client Spaces */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Mes Espaces Clients</h2>
        
        {clientSpaces.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted/50 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun espace client</h3>
            <p className="text-muted-foreground mb-6">Créez votre premier espace client pour commencer</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer mon premier espace
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {clientSpaces.map((space) => (
              <Card key={space.id} className="hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{space.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant={space.status === 'Actif' ? 'default' : 'secondary'} className="text-xs">
                            {space.status}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/client-space/${space.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Gérer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedSpaceForShare(space);
                        setShareDialogOpen(true);
                      }}
                      className="px-3"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(space)}
                      className="px-3"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="px-3">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer l'espace</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer l'espace "{space.name}" ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteSpace(space.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier l'espace client</DialogTitle>
            <DialogDescription>
              Modifiez les informations de votre espace client
            </DialogDescription>
          </DialogHeader>
          {editingSpace && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editSpaceName">Nom de l'espace *</Label>
                <Input
                  id="editSpaceName"
                  value={editingSpace.name}
                  onChange={(e) => setEditingSpace({...editingSpace, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editGoogleDrive">Lien Portail / Drive</Label>
                <Input
                  id="editGoogleDrive"
                  value={editingSpace.googleDriveLink || ''}
                  onChange={(e) => setEditingSpace({...editingSpace, googleDriveLink: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editPaymentAmount">Montant (€)</Label>
                  <Input
                    id="editPaymentAmount"
                    type="number"
                    value={editingSpace.paymentAmount || ''}
                    onChange={(e) => setEditingSpace({...editingSpace, paymentAmount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPaymentLink">Lien de paiement</Label>
                  <Input
                    id="editPaymentLink"
                    value={editingSpace.paymentLink || ''}
                    onChange={(e) => setEditingSpace({...editingSpace, paymentLink: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMessageLink">Lien Messages</Label>
                <Input
                  id="editMessageLink"
                  value={editingSpace.messageLink || ''}
                  onChange={(e) => setEditingSpace({...editingSpace, messageLink: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMeetingLink">Lien RDV</Label>
                <Input
                  id="editMeetingLink"
                  value={editingSpace.meetingLink || ''}
                  onChange={(e) => setEditingSpace({...editingSpace, meetingLink: e.target.value})}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditSpace}>
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de partage client */}
      {selectedSpaceForShare && (
        <ClientShareDialog
          isOpen={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setSelectedSpaceForShare(null);
          }}
          spaceId={selectedSpaceForShare.id}
          spaceName={selectedSpaceForShare.name}
        />
      )}

      {/* Section Notifications */}
      <div className="space-y-6 pt-8 border-t">
        <h2 className="text-2xl font-bold">Notifications</h2>
        <WebhookManager />
        <NotificationList />
      </div>
    </div>
  );
};

export default Dashboard;