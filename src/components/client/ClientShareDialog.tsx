import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, Lock, Share2, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import clientAuthService from '@/services/clientAuthService';

interface ClientShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
}

const ClientShareDialog = ({ isOpen, onClose, spaceId, spaceName }: ClientShareDialogProps) => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [clientUrl, setClientUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  useEffect(() => {
    if (!isOpen || !spaceId) return;

    // Réinitialiser l'état lorsque la popup s'ouvre pour un nouvel espace
    setPassword('');
    setIsPasswordSet(false);
    setShowPassword(false);
    setClientUrl('');

    // Générer le lien sécurisé et vérifier l'état du mot de passe
    const generateSecureLink = async () => {
      setIsGeneratingLink(true);
      try {
        const secureUrl = await clientAuthService.generateClientLink(spaceId);
        setClientUrl(secureUrl);

        // Vérifier si un mot de passe est déjà configuré
        const hasPassword = await clientAuthService.hasPassword(spaceId);
        setIsPasswordSet(hasPassword);
      } catch (error) {
        console.error('Erreur génération lien:', error);
        // Fallback vers la vue directe si génération de token échoue
        setClientUrl(`${window.location.origin}/client-view/${spaceId}`);
      } finally {
        setIsGeneratingLink(false);
      }
    };

    generateSecureLink();
  }, [spaceId, isOpen]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const savePassword = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!password.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un mot de passe",
        variant: "destructive"
      });
      return;
    }

    try {
      await clientAuthService.setClientPassword(spaceId, password);
      setIsPasswordSet(true);
      toast({
        title: "Succès",
        description: "Mot de passe configuré avec succès"
      });
    } catch (error) {
      console.error('Erreur NocoDB:', error);
      // Fallback localStorage temporaire
      localStorage.setItem(`client_password_${spaceId}`, password);
      setIsPasswordSet(true);
      toast({
        title: "Succès (Local)",
        description: "Mot de passe sauvé temporairement en local"
      });
    }
  };

  const removePassword = async () => {
    try {
      await clientAuthService.removeClientPassword(spaceId);
      setPassword('');
      setIsPasswordSet(false);
      toast({
        title: "Succès",
        description: "Mot de passe supprimé"
      });
    } catch (error) {
      console.error('Erreur suppression:', error);
      // Fallback localStorage si erreur NocoDB
      localStorage.removeItem(`client_password_${spaceId}`);
      setPassword('');
      setIsPasswordSet(false);
      toast({
        title: "Succès (Local)",
        description: "Mot de passe supprimé localement"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copié",
        description: "Lien sécurisé copié dans le presse-papier"
      });
    });
  };

  const openClientView = () => {
    window.open(clientUrl, '_blank');
  };

  // Extraire le token ou l'identifiant de l'URL générée
  const linkToken = clientUrl
    ? clientUrl.includes('/client/')
      ? clientUrl.split('/client/')[1]
      : clientUrl.split('/client-view/')[1] || ''
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Partager l'espace "{spaceName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lien d'accès */}
          <div className="space-y-2">
            <Label htmlFor="client-url">Lien d'accès</Label>
            <div className="flex gap-2">
              <Input 
                id="client-url"
                value={isGeneratingLink ? "Génération..." : clientUrl} 
                readOnly 
                className="flex-1 text-sm" 
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(clientUrl)}
                disabled={isGeneratingLink || !clientUrl}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openClientView}
                disabled={isGeneratingLink || !clientUrl}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Token */}
          <div className="space-y-2">
            <Label htmlFor="client-token">Token d'accès</Label>
            <div className="flex gap-2">
              <Input
                id="client-token"
                value={linkToken}
                readOnly
                className="flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(linkToken)}
                disabled={isGeneratingLink || !clientUrl}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Protection par mot de passe */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4" />
              <span className="font-medium">Protection par mot de passe</span>
              {isPasswordSet && <Badge variant="secondary" className="text-xs">Activé</Badge>}
            </div>

            {!isPasswordSet ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez un mot de passe"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        savePassword(e);
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPassword(!showPassword);
                    }}
                    type="button"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      generatePassword();
                    }} 
                    type="button"
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    savePassword(e);
                  }} 
                  className="w-full"
                  type="button"
                  disabled={!password.trim()}
                >
                  Configurer le mot de passe
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">Mot de passe configuré</p>
                  <p className="text-xs text-muted-foreground">L'accès à l'espace est protégé</p>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={(e) => {
                    e.preventDefault();
                    removePassword();
                  }} 
                  className="w-full"
                  type="button"
                >
                  Supprimer le mot de passe
                </Button>
              </div>
            )}
          </div>

          {/* Récapitulatif */}
          {isPasswordSet && (
            <div className="border-t pt-4">
              <div className="p-3 rounded-lg bg-primary/5 space-y-2">
                <p className="font-medium text-sm">Informations de partage :</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Lien :</strong> {clientUrl}</p>
                  <p><strong>Token :</strong> {linkToken}</p>
                  <p><strong>Mot de passe :</strong> {password || 'Déjà configuré'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientShareDialog;