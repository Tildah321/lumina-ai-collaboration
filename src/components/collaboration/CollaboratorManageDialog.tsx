import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nouveau mot de passe",
        variant: "destructive"
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
          title: "Mot de passe mis à jour",
          description: "Le mot de passe du collaborateur a été modifié avec succès"
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
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le mot de passe",
        variant: "destructive"
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