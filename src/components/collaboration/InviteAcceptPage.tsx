import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const InviteAcceptPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitationValid, setInvitationValid] = useState(false);
  const [collaboratorInfo, setCollaboratorInfo] = useState<any>(null);
  const [acceptForm, setAcceptForm] = useState({
    name: '',
    password: ''
  });

  // Bypass RLS-dependent pre-check; we'll validate on accept
  useEffect(() => {
    setInvitationValid(true);
    setIsLoading(false);
  }, [token]);

  // Accepter l'invitation
  const handleAcceptInvitation = async () => {
    if (!acceptForm.name.trim() || !acceptForm.password.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    setIsAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        token,
        user_name: acceptForm.name.trim(),
        user_password: acceptForm.password.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        toast({
          title: "Invitation acceptée",
          description: "Vous faites maintenant partie de l'équipe ! Utilisez le lien avec vos identifiants pour vous connecter."
        });
        
        // Rediriger vers le lien de connexion après un délai
        setTimeout(() => {
          navigate(`/invite/${token}`);
        }, 2000);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'acceptation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'accepter l'invitation",
        variant: "destructive"
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitationValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invitation invalide</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Cette invitation n'est plus valide ou a déjà été utilisée.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <CardTitle>Configurer vos identifiants</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vous êtes invité à rejoindre l'équipe en tant que{' '}
            <span className="font-medium">{collaboratorInfo?.role ?? 'collaborateur'}</span>.
            Choisissez vos identifiants de connexion.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Votre nom *</Label>
            <Input
              id="name"
              value={acceptForm.name}
              onChange={(e) => setAcceptForm({ ...acceptForm, name: e.target.value })}
              placeholder="Martin Dupont"
            />
            <p className="text-xs text-muted-foreground">
              Ce nom sera utilisé pour vous identifier
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              value={acceptForm.password}
              onChange={(e) => setAcceptForm({ ...acceptForm, password: e.target.value })}
              placeholder="Votre mot de passe"
            />
            <p className="text-xs text-muted-foreground">
              Ce mot de passe sera utilisé pour vous connecter via le lien d'invitation
            </p>
          </div>
          
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={isAccepting || !acceptForm.name.trim() || !acceptForm.password.trim()}
              className="w-full"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Configuration en cours...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Configurer mes identifiants
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Après configuration, vous pourrez utiliser ce lien avec vos identifiants pour accéder aux espaces partagés.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteAcceptPage;