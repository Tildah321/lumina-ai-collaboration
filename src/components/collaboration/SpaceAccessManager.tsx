import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Share2, Trash2, Mail, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Collaborator {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'collaborateur';
  status: 'pending' | 'accepted' | 'declined';
}

interface SpaceAccess {
  id: string;
  space_id: string;
  collaborator_id: string;
  permissions: string[];
  collaborator?: Collaborator;
}

interface ClientSpace {
  id: string;
  email: string;
  description?: string;
  statut: string;
}

interface SpaceAccessManagerProps {
  spaceId: string;
  spaceName?: string;
}

const SpaceAccessManager = ({ spaceId, spaceName }: SpaceAccessManagerProps) => {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [spaceAccesses, setSpaceAccesses] = useState<SpaceAccess[]>([]);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['read']);

  const availablePermissions = [
    { id: 'read', label: 'Lecture', description: 'Voir les tâches, jalons et factures' },
    { id: 'write', label: 'Écriture', description: 'Créer et modifier les tâches' },
    { id: 'admin', label: 'Administration', description: 'Gérer tous les aspects du projet' }
  ];

  // Charger les collaborateurs acceptés
  const loadCollaborators = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le rôle de l'utilisateur actuel
      const { data: currentUserRole } = await supabase
        .from('collaborators')
        .select('role')
        .eq('email', user.email)
        .eq('status', 'accepted')
        .single();

      let query = supabase
        .from('collaborators')
        .select('*')
        .eq('status', 'accepted');

      // Si l'utilisateur n'est pas admin, ne charger que les collaborateurs (pas les autres admins)
      if (currentUserRole?.role !== 'admin') {
        query = query.eq('role', 'collaborateur');
      }

      const { data, error } = await query.order('name');

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

  // Charger les accès existants pour cet espace
  const loadSpaceAccesses = async () => {
    try {
      const { data, error } = await supabase
        .from('space_collaborators')
        .select(`
          *,
          collaborator:collaborators(*)
        `)
        .eq('space_id', spaceId)
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
  }, [spaceId]);

  // Donner accès à un collaborateur
  const handleGrantAccess = async () => {
    if (!selectedCollaborator || selectedPermissions.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un collaborateur et au moins une permission",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour accorder des accès",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('space_collaborators')
        .insert({
          space_id: spaceId,
          collaborator_id: selectedCollaborator,
          permissions: selectedPermissions,
          granted_by: user.id
        })
        .select(`
          *,
          collaborator:collaborators(*)
        `)
        .single();

      if (error) throw error;

      setSpaceAccesses([data as SpaceAccess, ...spaceAccesses]);
      setSelectedCollaborator('');
      setSelectedPermissions(['read']);
      setIsShareDialogOpen(false);

      const collaborator = collaborators.find(c => c.id === selectedCollaborator);
      toast({
        title: "Accès accordé",
        description: `${collaborator?.email} peut maintenant accéder à cet espace`
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'attribution d\'accès:', error);
      toast({
        title: "Erreur",
        description: error.message?.includes('duplicate') 
          ? "Ce collaborateur a déjà accès à cet espace" 
          : "Impossible d'accorder l'accès",
        variant: "destructive"
      });
    }
  };

  // Révoquer l'accès
  const handleRevokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('space_collaborators')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      setSpaceAccesses(spaceAccesses.filter(sa => sa.id !== accessId));

      toast({
        title: "Accès révoqué",
        description: "L'accès à cet espace a été retiré"
      });
    } catch (error) {
      console.error('Erreur lors de la révocation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de révoquer l'accès",
        variant: "destructive"
      });
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permissionId));
    }
  };

  const getPermissionBadges = (permissions: string[]) => {
    return permissions.map(permission => {
      const perm = availablePermissions.find(p => p.id === permission);
      return (
        <Badge key={permission} variant="secondary" className="text-xs">
          {perm?.label}
        </Badge>
      );
    });
  };

  // Filtrer les collaborateurs qui n'ont pas encore accès
  const availableCollaborators = collaborators.filter(
    c => !spaceAccesses.some(sa => sa.collaborator_id === c.id)
  );

  if (isLoading) {
    return <div>Chargement des accès...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Partage d'accès</h3>
          <p className="text-sm text-muted-foreground">
            {spaceName ? `Gérer l'accès à l'espace "${spaceName}"` : 'Gérer l\'accès à cet espace'}
          </p>
        </div>
        
        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={availableCollaborators.length === 0}>
              <Share2 className="w-4 h-4" />
              Partager l'accès
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Partager l'accès à l'espace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Collaborateur</Label>
                <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un collaborateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCollaborators.map((collaborator) => (
                      <SelectItem key={collaborator.id} value={collaborator.id}>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{collaborator.name || collaborator.email}</span>
                          {collaborator.name && (
                            <span className="text-muted-foreground">({collaborator.email})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-3">
                  {availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(permission.id, checked as boolean)
                        }
                      />
                      <div className="space-y-1">
                        <Label 
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleGrantAccess} 
                disabled={!selectedCollaborator || selectedPermissions.length === 0}
              >
                Accorder l'accès
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {availableCollaborators.length === 0 && collaborators.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Tous vos collaborateurs ont déjà accès à cet espace
            </p>
          </CardContent>
        </Card>
      )}

      {collaborators.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Aucun collaborateur disponible pour le partage
            </p>
            <p className="text-sm text-muted-foreground">
              Commencez par inviter des collaborateurs depuis la section "Gestion des collaborateurs"
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {spaceAccesses.length > 0 && (
          <div>
            <h4 className="font-medium mb-4">Collaborateurs ayant accès ({spaceAccesses.length})</h4>
            <div className="space-y-2">
              {spaceAccesses.map((access) => (
                <Card key={access.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {access.collaborator?.name || access.collaborator?.email}
                          </div>
                          {access.collaborator?.name && (
                            <div className="text-sm text-muted-foreground">
                              {access.collaborator.email}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {getPermissionBadges(access.permissions)}
                        </div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Révoquer l'accès</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir retirer l'accès de ce collaborateur à cet espace ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevokeAccess(access.id)}>
                                Révoquer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaceAccessManager;