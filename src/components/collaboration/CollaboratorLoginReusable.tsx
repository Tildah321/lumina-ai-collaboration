import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CollaboratorLoginReusable = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginForm, setLoginForm] = useState({
    name: '',
    password: ''
  });

  // Connexion collaborateur réutilisable
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
      const { data, error } = await supabase.rpc('verify_collaborator_login', {
        p_invitation_token: token,
        p_name: loginForm.name.trim(),
        p_password: loginForm.password.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; collaborator?: any };
      
      if (result.success && result.collaborator) {
        // Stocker les informations du collaborateur dans le localStorage
        const collaboratorInfo = {
          id: result.collaborator.id,
          name: result.collaborator.name,
          role: result.collaborator.role,
          invitation_token: token as string,
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('collaborator_session', JSON.stringify(collaboratorInfo));
        
        toast({
          title: "Connexion réussie",
          description: `Bienvenue ${result.collaborator.name}!`
        });
        
        // Rediriger vers le dashboard collaborateur
        navigate('/collaboration-dashboard');
      } else {
        throw new Error(result.error || 'Identifiants incorrects');
      }
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      
      let errorMessage = "Connexion échouée";
      if (error.message?.includes('Mot de passe incorrect') || error.message?.includes('password')) {
        errorMessage = "Mot de passe incorrect";
      } else if (error.message?.includes('Collaborateur non trouvé') || error.message?.includes('not found')) {
        errorMessage = "Nom d'utilisateur incorrect ou compte non activé";
      } else if (error.message?.includes('invitation non acceptée')) {
        errorMessage = "Votre accès n'a pas encore été activé";
      }
      
      toast({
        title: "Erreur de connexion",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lien invalide</h3>
            <p className="text-muted-foreground">Ce lien de connexion n'est pas valide.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Connexion Collaborateur</CardTitle>
          <p className="text-muted-foreground">
            Connectez-vous avec vos identifiants
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom d'utilisateur</Label>
              <Input
                id="name"
                type="text"
                value={loginForm.name}
                onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                placeholder="Votre nom"
                disabled={isLoggingIn}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Votre mot de passe"
                disabled={isLoggingIn}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoggingIn || !loginForm.name.trim() || !loginForm.password.trim()}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Se connecter
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Utilisez les identifiants fournis par votre administrateur
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaboratorLoginReusable;