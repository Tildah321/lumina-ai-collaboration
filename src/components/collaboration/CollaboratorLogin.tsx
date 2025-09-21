import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CollaboratorLogin = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [invitationValid, setInvitationValid] = useState(false);
  const [loginForm, setLoginForm] = useState({
    name: '',
    password: ''
  });

  // Vérifier la validité du token
  useEffect(() => {
    // Skip pre-check to avoid RLS issues; validation happens on submit
    setInvitationValid(true);
    setIsLoading(false);
  }, [token]);

  // Connexion collaborateur
  const handleLogin = async () => {
    if (!loginForm.name.trim() || !loginForm.password.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.rpc('verify_collaborator_credentials', {
        p_invitation_token: token,
        p_name: loginForm.name.trim(),
        p_password: loginForm.password.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; collaborator?: any };
      
      if (result.success && result.collaborator) {
        // Stocker les informations du collaborateur dans localStorage
        localStorage.setItem('collaborator_session', JSON.stringify({
          ...result.collaborator,
          loginTime: new Date().toISOString()
        }));

        toast({
          title: "Connexion réussie",
          description: `Bienvenue ${result.collaborator.name} !`
        });
        
        // Rediriger vers le dashboard collaborateur
        navigate('/collaboration-dashboard');
      } else {
        throw new Error(result.error || 'Identifiants incorrects');
      }
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      toast({
        title: "Erreur de connexion",
        description: error.message || "Identifiants incorrects",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
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


  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <LogIn className="w-12 h-12 text-primary mx-auto mb-4" />
          <CardTitle>Connexion Collaborateur</CardTitle>
          <p className="text-sm text-muted-foreground">
            Connectez-vous avec vos identifiants pour accéder aux espaces partagés
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={loginForm.name}
              onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
              placeholder="Votre nom"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="Votre mot de passe"
            />
          </div>
          
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleLogin}
              disabled={isLoggingIn || !loginForm.name.trim() || !loginForm.password.trim()}
              className="w-full"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Se connecter
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Utilisez les identifiants fournis lors de votre invitation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaboratorLogin;