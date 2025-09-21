import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, Building, Clock, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SpaceAccessManager from '@/components/collaboration/SpaceAccessManager';

interface CollaboratorSession {
  id: string;
  name: string;
  role: string;
  invitation_token: string;
  loginTime: string;
}

const CollaborationDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<CollaboratorSession | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  useEffect(() => {
    // Vérifier la session collaborateur
    const sessionData = localStorage.getItem('collaborator_session');
    if (!sessionData) {
      navigate('/');
      return;
    }

    try {
      const parsedSession = JSON.parse(sessionData);
      setSession(parsedSession);
    } catch (error) {
      console.error('Erreur lors du parsing de la session:', error);
      localStorage.removeItem('collaborator_session');
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('collaborator_session');
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt !"
    });
    navigate('/');
  };

  const formatLoginTime = (loginTime: string) => {
    return new Date(loginTime).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">Espace Collaborateur</h1>
                  <p className="text-sm text-muted-foreground">
                    Connecté en tant que {session.name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-2">
                <Clock className="w-3 h-3" />
                Connecté depuis {formatLoginTime(session.loginTime)}
              </Badge>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Bienvenue dans l'équipe !
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">{session.name}</p>
                  <p className="text-sm text-muted-foreground">Collaborateur</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Building className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">Rôle</p>
                  <Badge variant="default">{session.role}</Badge>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">Connexion</p>
                  <p className="text-sm text-muted-foreground">
                    {formatLoginTime(session.loginTime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Space Access Management */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Espaces Accessibles</h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  Les espaces qui vous sont assignés apparaîtront ici une fois que l'administrateur vous aura donné accès.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CollaborationDashboard;