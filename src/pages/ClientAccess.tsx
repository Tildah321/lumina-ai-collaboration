import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Users, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { clientAuthService } from '@/services/clientAuthService';

const ClientAccess = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir votre token d'accès",
        variant: "destructive"
      });
      return;
    }

    // Extraire et nettoyer le token de manière plus robuste
    const extractToken = (input: string) => {
      const trimmed = input.trim();
      
      // Supprimer les espaces et caractères invisibles
      const cleaned = trimmed.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
      
      // Si c'est une URL complète (avec http/https)
      if (cleaned.match(/^https?:\/\//)) {
        try {
          const url = new URL(cleaned);
          const parts = url.pathname.split('/').filter(Boolean);
          const idx = parts.indexOf('client');
          if (idx !== -1 && parts[idx + 1]) {
            return parts[idx + 1].toLowerCase();
          }
        } catch (e) {
          console.log('Error parsing URL:', e);
        }
      }
      
      // Si c'est un path relatif (commence par / ou contient client/)
      const pathMatch = cleaned.match(/(?:\/)?client\/([a-z0-9]+)/i);
      if (pathMatch) {
        return pathMatch[1].toLowerCase();
      }
      
      // Si c'est juste une chaîne de caractères alphanumériques
      const directMatch = cleaned.match(/^[a-z0-9]+$/i);
      if (directMatch) {
        return cleaned.toLowerCase();
      }
      
      // Fallback: prendre tout après le dernier /
      const parts = cleaned.split('/').filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.match(/^[a-z0-9]+$/i)) {
          return lastPart.toLowerCase();
        }
      }
      
      return cleaned.toLowerCase();
    };

    const cleanToken = extractToken(token);
    console.log('🔍 Clean token for validation:', cleanToken);

    if (!cleanToken || cleanToken.length < 3) {
      toast({
        title: "Token invalide",
        description: "Le format du token n'est pas reconnu",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Validation avec retry automatique
      let spaceId = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!spaceId && attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Validation attempt ${attempts}/${maxAttempts}`);
        
        try {
          spaceId = await clientAuthService.validateClientToken(cleanToken);
          if (spaceId) {
            break;
          }
        } catch (validationError) {
          console.log(`⚠️ Attempt ${attempts} failed:`, validationError);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, attempts * 1000));
          }
        }
      }
      
      if (!spaceId) {
        toast({
          title: "Token invalide",
          description: "Le token d'accès n'est pas valide ou a expiré. Vérifiez le lien.",
          variant: "destructive"
        });
        return;
      }

      // Si un mot de passe est fourni, le vérifier avec retry
      if (password) {
        let isPasswordValid = false;
        attempts = 0;
        
        while (!isPasswordValid && attempts < maxAttempts) {
          attempts++;
          try {
            isPasswordValid = await clientAuthService.verifyClientPassword(spaceId, password);
            if (isPasswordValid) {
              break;
            }
          } catch (passwordError) {
            console.log(`⚠️ Password verification attempt ${attempts} failed:`, passwordError);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, attempts * 500));
            }
          }
        }
        
        if (!isPasswordValid) {
          toast({
            title: "Mot de passe incorrect",
            description: "Le mot de passe fourni n'est pas correct",
            variant: "destructive"
          });
          return;
        }
      }

      // Rediriger vers l'espace client
      console.log('✅ Redirecting to client space with token:', cleanToken);
      navigate(`/client/${cleanToken}`);
    } catch (error) {
      console.error('Erreur lors de l\'accès client:', error);
      toast({
        title: "Erreur de connexion",
        description: "Problème de réseau. Vérifiez votre connexion et réessayez.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 relative overflow-hidden">
      {/* Animated Background Glows */}
      <div className="floating-glow floating-glow-1"></div>
      <div className="floating-glow floating-glow-2"></div>
      <div className="floating-glow floating-glow-3"></div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow bg-black">
              <img src="/lovable-uploads/cb6c54cf-a6f8-4ef1-aca0-b5011c552548.png" alt="Lumina Logo" className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Lumina
            </span>
          </Link>
          <Link to="/auth">
            <Button variant="hero" size="sm">
              Se connecter <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Accès Espace Client</h1>
            <p className="text-muted-foreground">
              Connectez-vous à votre espace client personnalisé
            </p>
          </div>

          <Card className="glass-glow shadow-xl">
            <CardHeader>
              <CardTitle className="text-center flex items-center gap-2 justify-center">
                <Lock className="w-5 h-5" />
                Authentification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="token">Token d'accès</Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Saisissez votre token d'accès"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Mot de passe (optionnel)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mot de passe si requis"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  variant="hero"
                  disabled={isLoading}
                >
                  {isLoading ? 'Connexion...' : 'Accéder à mon espace'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Vous n'avez pas de token d'accès ?
                </p>
                <p className="text-xs text-muted-foreground">
                  Contactez votre prestataire pour obtenir vos identifiants d'accès
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientAccess;