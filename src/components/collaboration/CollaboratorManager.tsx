import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, UserPlus, Trash2, Settings, Mail, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Collaborator {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'collaborateur';
  status: 'pending' | 'accepted' | 'declined';
  invitation_token?: string;
  created_at: string;
}

interface SpaceAccess {
  id: string;
  space_id: string;
  collaborator_id: string;
  permissions: string[];
  collaborator?: Collaborator;
}

const CollaboratorManager = () => {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [spaceAccesses, setSpaceAccesses] = useState<SpaceAccess[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newInvite, setNewInvite] = useState({
    email: '',
    name: '',
    role: 'collaborateur' as Collaborator['role']
  });

  // Charger les collaborateurs
  const loadCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollaborators((data || []) as Collaborator[]);
    } catch (error) {
      console.error('Erreur lors du chargement des collaborateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les collaborateurs",
        variant: "destructive"
      });
    }
  };

  // Charger les accès aux espaces
  const loadSpaceAccesses = async () => {
    try {
      const { data, error } = await supabase
        .from('space_collaborators')
        .select(`
          *,
          collaborator:collaborators(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpaceAccesses((data || []) as SpaceAccess[]);
    } catch (error) {
      console.error('Erreur lors du chargement des accès:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadCollaborators(), loadSpaceAccesses()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Inviter un collaborateur
  const handleInviteCollaborator = async () => {
    if (!newInvite.email.trim()) {
      toast({
        title: "Erreur",
        description: "L'email est requis",
        variant: "destructive"
      });
      return;
    }

    try {
      const invitationToken = crypto.randomUUID();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour inviter des collaborateurs",
          variant: "destructive"
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('collaborators')
        .insert({
          email: newInvite.email.trim(),
          name: newInvite.name.trim() || null,
          role: newInvite.role,
          invitation_token: invitationToken,
          status: 'pending',
          invited_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setCollaborators([data as Collaborator, ...collaborators]);
      setNewInvite({ email: '', name: '', role: 'collaborateur' });
      setIsInviteDialogOpen(false);

      toast({
        title: "Invitation envoyée",
        description: `Une invitation a été envoyée à ${newInvite.email}`
      });

      // Ici on pourrait envoyer un email d'invitation avec le token
      // Via une edge function par exemple
    } catch (error: any) {
      console.error('Erreur lors de l\'invitation:', error);
      toast({
        title: "Erreur",
        description: error.message?.includes('duplicate') 
          ? "Ce collaborateur a déjà été invité" 
          : "Impossible d'envoyer l'invitation",
        variant: "destructive"
      });
    }
  };

  // Supprimer un collaborateur
  const handleDeleteCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      setCollaborators(collaborators.filter(c => c.id !== collaboratorId));
      setSpaceAccesses(spaceAccesses.filter(sa => sa.collaborator_id !== collaboratorId));

      toast({
        title: "Collaborateur supprimé",
        description: "Le collaborateur a été retiré avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le collaborateur",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'default';
      case 'pending': return 'secondary';
      case 'declined': return 'destructive';
      default: return 'outline';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'collaborateur': return 'default';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div>Chargement des collaborateurs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestion des collaborateurs</h3>
          <p className="text-sm text-muted-foreground">
            Invitez vos collaborateurs pour qu'ils puissent accéder aux espaces clients
          </p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Inviter un collaborateur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Inviter un nouveau collaborateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  placeholder="collaborateur@email.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Nom (optionnel)</Label>
                <Input
                  id="name"
                  value={newInvite.name}
                  onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                  placeholder="Martin Dupont"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={newInvite.role} onValueChange={(value: Collaborator['role']) => setNewInvite({ ...newInvite, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collaborateur">Collaborateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Les administrateurs peuvent gérer tous les espaces et inviter d'autres collaborateurs
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleInviteCollaborator} disabled={!newInvite.email.trim()}>
                Envoyer l'invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collaborators.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucun collaborateur pour le moment</p>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
                Inviter le premier collaborateur
              </Button>
            </CardContent>
          </Card>
        ) : (
          collaborators.map((collaborator) => (
            <Card key={collaborator.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(collaborator.status)}
                    <CardTitle className="text-base">
                      {collaborator.name || collaborator.email}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={getRoleColor(collaborator.role)} className="text-xs">
                      {collaborator.role}
                    </Badge>
                    <Badge variant={getStatusColor(collaborator.status)} className="text-xs">
                      {collaborator.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{collaborator.email}</span>
                  </div>
                  
                  {collaborator.status === 'pending' && (
                    <div className="text-xs text-muted-foreground">
                      Invitation envoyée le {new Date(collaborator.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  
                  {spaceAccesses.filter(sa => sa.collaborator_id === collaborator.id).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Accès à {spaceAccesses.filter(sa => sa.collaborator_id === collaborator.id).length} espace(s)
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled>
                    <Settings className="w-3 h-3 mr-1" />
                    Gérer
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le collaborateur</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir retirer ce collaborateur ? 
                          Il perdra l'accès à tous les espaces clients partagés avec lui.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCollaborator(collaborator.id)}>
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
    </div>
  );
};

export default CollaboratorManager;