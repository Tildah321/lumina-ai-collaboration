import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, Eye, EyeOff, Loader2, Trash2, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import nocodbService from '@/services/nocodbService';

interface CollaboratorManageDialogProps {
  collaborator: {
    id: string;
    name?: string;
    role: string;
    status: string;
    invitation_token?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const CollaboratorManageDialog = ({ collaborator, isOpen, onClose, onUpdate }: CollaboratorManageDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Gestion des accès aux espaces
  const [spaceAccesses, setSpaceAccesses] = useState<{ id: string; space_id: string; permissions: string[] }[]>([]);
  const [spaces, setSpaces] = useState<{ id: string; label: string }[]>([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['read']);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);

  const availablePermissions = [
    { id: 'read', label: 'Lecture' },
    { id: 'write', label: 'Écriture' },
    { id: 'admin', label: 'Administration' }
  ];

  const loadSpaces = async () => {
    try {
      const res: any = await nocodbService.getClients();
      const list = (res?.list || []).map((c: any) => ({
        id: (c.Id || c.id)?.toString?.() || '',
        label: c.email || c.description || `Espace ${(c.Id || c.id)}`
      })).filter((s: any) => !!s.id);
      setSpaces(list);
    } catch (e) {
      console.error('Erreur chargement espaces:', e);
    }
  };

  const loadSpaceAccesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('space_collaborators')
        .select('id, space_id, permissions')
        .eq('collaborator_id', collaborator.id)
        .eq('granted_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSpaceAccesses((data as any[]) || []);
    } catch (e) {
      console.error('Erreur chargement accès espaces:', e);
    }
  };

  const handleGrantSpaceAccess = async () => {
    if (!selectedSpace || selectedPermissions.length === 0) {
      toast({ title: 'Erreur', description: 'Sélectionnez un espace et au moins une permission', variant: 'destructive' });
      return;
    }
    setIsLoadingAccess(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté');
      const { data, error } = await supabase
        .from('space_collaborators')
        .insert({
          space_id: selectedSpace,
          collaborator_id: collaborator.id,
          permissions: selectedPermissions,
          granted_by: user.id
        })
        .select('id, space_id, permissions')
        .single();
      if (error) throw error;
      setSpaceAccesses([data as any, ...spaceAccesses]);
      setSelectedSpace('');
      setSelectedPermissions(['read']);
      toast({ title: 'Accès ajouté', description: 'Le collaborateur a maintenant accès à cet espace' });
    } catch (error: any) {
      console.error('Erreur attribution accès:', error);
      const msg = error?.message || '';
      toast({
        title: 'Erreur',
        description: msg?.toLowerCase?.().includes('duplicate')
          ? 'Ce collaborateur a déjà accès à cet espace'
          : msg?.toLowerCase?.().includes('row-level security') || msg?.toLowerCase?.().includes('rls')
          ? 'Action non autorisée. Connectez-vous avec le compte qui a invité ce collaborateur.'
          : 'Impossible d\'accorder l\'accès',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingAccess(false);
    }
  };

  const handleRevokeSpaceAccess = async (accessId: string) => {
    setIsLoadingAccess(true);
    try {
      const { error } = await supabase
        .from('space_collaborators')
        .delete()
        .eq('id', accessId);
      if (error) throw error;
      setSpaceAccesses(spaceAccesses.filter(a => a.id !== accessId));
      toast({ title: 'Accès révoqué', description: 'L\'accès à cet espace a été retiré' });
    } catch (e) {
      console.error('Erreur révocation accès:', e);
      toast({ title: 'Erreur', description: 'Impossible de révoquer l\'accès', variant: 'destructive' });
    } finally {
      setIsLoadingAccess(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadSpaces();
    loadSpaceAccesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, collaborator.id]);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un nouveau mot de passe',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Vous devez être connecté');
      }

      const { data, error } = await supabase.rpc('update_collaborator_password', {
        collaborator_id: collaborator.id,
        new_password: newPassword.trim(),
        requester_id: user.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        toast({
          title: 'Mot de passe mis à jour',
          description: 'Le mot de passe du collaborateur a été modifié avec succès'
        });
        setNewPassword('');
        onUpdate();
        onClose();
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le mot de passe',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gérer {collaborator.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Informations du collaborateur</Label>
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="text-sm"><span className="font-medium">Nom:</span> {collaborator.name}</p>
              <p className="text-sm"><span className="font-medium">Rôle:</span> {collaborator.role}</p>
              <p className="text-sm"><span className="font-medium">Statut:</span> {collaborator.status}</p>
              {collaborator.invitation_token && (
                <p className="text-sm">
                  <span className="font-medium">Lien:</span> 
                  <span className="text-xs font-mono break-all ml-1">
                    {window.location.origin}/invite-setup/{collaborator.invitation_token}
                  </span>
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <div className="flex gap-2">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Le collaborateur devra utiliser ce nouveau mot de passe pour se connecter
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Accès aux espaces</Label>
            <div className="p-3 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Select value={selectedSpace} onValueChange={setSelectedSpace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un espace" />
                    </SelectTrigger>
                    <SelectContent>
                      {spaces.filter(s => !spaceAccesses.some(a => a.space_id === s.id)).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-4">
                    {availablePermissions.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`perm-${p.id}`}
                          checked={selectedPermissions.includes(p.id)}
                          onCheckedChange={(checked) => {
                            const c = checked as boolean;
                            setSelectedPermissions(prev => c ? [...prev, p.id] : prev.filter(x => x !== p.id));
                          }}
                        />
                        <Label htmlFor={`perm-${p.id}`} className="text-sm">{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Button size="sm" onClick={handleGrantSpaceAccess} disabled={isLoadingAccess || !selectedSpace || selectedPermissions.length === 0}>
                    {isLoadingAccess ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Ajout...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Ajouter l'accès
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {spaceAccesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun accès d'espace pour ce collaborateur.</p>
                ) : (
                  spaceAccesses.map(access => {
                    const space = spaces.find(s => s.id === access.space_id);
                    return (
                      <div key={access.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{space?.label || access.space_id}</span>
                          <div className="flex gap-1">
                            {access.permissions.map((perm) => (
                              <Badge key={perm} variant="secondary" className="text-xs">{perm}</Badge>
                            ))}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Révoquer l'accès</AlertDialogTitle>
                              <AlertDialogDescription>Retirer l'accès à cet espace pour ce collaborateur ?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevokeSpaceAccess(access.id)}>Révoquer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleUpdatePassword}
            disabled={isLoading || !newPassword.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Mise à jour...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Mettre à jour
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollaboratorManageDialog;