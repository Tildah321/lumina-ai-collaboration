import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, UserPlus, Trash2, Settings, Link, CheckCircle, Clock, XCircle, Copy, Share2, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CollaboratorManageDialog from './CollaboratorManageDialog';

interface Collaborator {
  id: string;
  email?: string;
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
    name: '',
    role: 'collaborateur' as Collaborator['role'],
    password: ''
  });
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [manageDialog, setManageDialog] = useState<{ isOpen: boolean; collaborator: Collaborator | null }>({
    isOpen: false,
    collaborator: null
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

  // Générer un lien d'invitation
  const handleGenerateInviteLink = async () => {
    if (!newInvite.name.trim() || !newInvite.password.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et le mot de passe sont requis",
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
          name: newInvite.name.trim(),
          role: newInvite.role,
          invitation_token: invitationToken,
          status: 'pending',
          invited_by: user.id,
          password_hash: btoa(newInvite.password.trim()) // Simple base64 encoding pour matcher la DB
        })
        .select()
        .single();

      if (error) throw error;

      const inviteLink = `${window.location.origin}/invite-setup/${invitationToken}`;
      const inviteMessage = `Lien: ${inviteLink}\nNom: ${newInvite.name}\nMot de passe: ${newInvite.password}`;
      setGeneratedLink(inviteMessage);
      setCollaborators([data as Collaborator, ...collaborators]);

      toast({
        title: "Lien d'invitation généré",
        description: "Le lien d'invitation a été créé avec succès"
      });
    } catch (error: any) {
      console.error('Erreur lors de la génération du lien:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le lien d'invitation",
        variant: "destructive"
      });
    }
  };

  // Copier le lien d'invitation
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Lien copié",
        description: "Le lien d'invitation a été copié dans le presse-papier"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };

  // Partager via différentes plateformes
  const handleShare = (platform: string) => {
    const message = `Rejoignez notre équipe !\n${generatedLink}`;
    
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?text=${encodeURIComponent(message)}`,
      email: `mailto:?subject=${encodeURIComponent('Invitation à rejoindre notre équipe')}&body=${encodeURIComponent(message)}`,
      sms: `sms:?body=${encodeURIComponent(message)}`
    };

    if (shareUrls[platform as keyof typeof shareUrls]) {
      window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
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
              {!generatedLink ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du collaborateur *</Label>
                    <Input
                      id="name"
                      value={newInvite.name}
                      onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                      placeholder="Martin Dupont"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe pour ce collaborateur *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newInvite.password}
                      onChange={(e) => setNewInvite({ ...newInvite, password: e.target.value })}
                      placeholder="Mot de passe temporaire"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ce mot de passe sera utilisé par le collaborateur pour se connecter avec son nom.
                    </p>
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
                      Les collaborateurs peuvent accéder aux espaces partagés. Les administrateurs ont accès à tout.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Informations de connexion</Label>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Nom: {newInvite.name}</p>
                      <p className="text-sm font-medium">Mot de passe: {newInvite.password}</p>
                      <div className="mt-2 p-2 bg-background rounded border">
                        <p className="text-xs text-muted-foreground">Lien d'invitation:</p>
                        <p className="text-xs font-mono break-all">{generatedLink.split('\n')[0].replace('Lien: ', '')}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Message complet à partager</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedLink}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Partager via</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare('whatsapp')}
                        className="gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare('telegram')}
                        className="gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Telegram
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare('email')}
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare('sms')}
                        className="gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        SMS
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setIsInviteDialogOpen(false);
                setGeneratedLink('');
                setNewInvite({ name: '', role: 'collaborateur', password: '' });
              }}>
                {generatedLink ? 'Fermer' : 'Annuler'}
              </Button>
              {!generatedLink && (
                <Button onClick={handleGenerateInviteLink} disabled={!newInvite.name.trim() || !newInvite.password.trim()}>
                  <Link className="w-4 h-4 mr-2" />
                  Générer le lien
                </Button>
              )}
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
                  {collaborator.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Settings className="w-4 h-4" />
                      <span>{collaborator.email}</span>
                    </div>
                  )}
                  
                  {collaborator.status === 'pending' && collaborator.invitation_token && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Link className="w-4 h-4" />
                      <span>Lien d'invitation en attente</span>
                    </div>
                  )}
                  
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
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setManageDialog({ isOpen: true, collaborator })}
                  >
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
      
      {manageDialog.collaborator && (
        <CollaboratorManageDialog
          collaborator={manageDialog.collaborator}
          isOpen={manageDialog.isOpen}
          onClose={() => setManageDialog({ isOpen: false, collaborator: null })}
          onUpdate={loadCollaborators}
        />
      )}
    </div>
  );
};

export default CollaboratorManager;