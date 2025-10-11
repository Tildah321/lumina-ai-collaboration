import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, Building, Clock, Calendar, CheckCircle, ExternalLink, FolderOpen, Eye, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import nocodbService from '@/services/nocodbService';
import { getBrandingForUser, applyBranding, BrandingSettings } from '@/lib/branding';
import { Logo } from '@/components/ui/logo';

interface CollaboratorSession {
  id: string;
  name: string;
  role: string;
  invitation_token: string;
  loginTime: string;
  has_crm_access?: boolean;
}

interface SpaceAccess {
  id: string;
  space_id: string;
  permissions: string[];
  space_info?: {
    description: string;
    statut: string;
    prix_payement: string;
  };
}

const CollaborationDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<CollaboratorSession | null>(null);
  const [spaceAccesses, setSpaceAccesses] = useState<SpaceAccess[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>({});

  useEffect(() => {
    // Vérifier la session collaborateur
    const sessionData = localStorage.getItem('collaborator_session');
    if (!sessionData) {
      navigate('/');
      return;
    }

    const loadCollaboratorData = async () => {
      try {
        const parsedSession = JSON.parse(sessionData);
        // Utiliser l'info stockée en session et charger le reste via RPC sécurisé
        setSession(parsedSession);
        loadSpaceAccesses(parsedSession);
        loadBrandingData(parsedSession);
      } catch (error) {
        console.error('Erreur lors du parsing de la session:', error);
        localStorage.removeItem('collaborator_session');
        navigate('/');
      }
    };
    
    loadCollaboratorData();
  }, [navigate]);

  const loadSpaceAccesses = async (collaboratorSession: CollaboratorSession) => {
    setIsLoadingSpaces(true);
    try {
      console.log('🔍 Chargement des espaces pour le collaborateur:', collaboratorSession);
      
      // Déterminer le bon token (compat rétro)
      const invitationToken = collaboratorSession.invitation_token || (collaboratorSession as any).token;
      if (!invitationToken) {
        throw new Error("Token d'invitation manquant. Veuillez vous reconnecter.");
      }
      const { data, error } = await supabase.rpc('get_spaces_for_collaborator_by_token', {
        p_invitation_token: invitationToken
      });

      console.log('📡 Résultat RPC:', { data, error });

      if (error) {
        console.error('❌ Erreur RPC:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ Aucun espace trouvé pour ce collaborateur');
        setSpaceAccesses([]);
        return;
      }

      console.log('🗂️ Espaces trouvés:', data);

      const spacesWithInfo = await Promise.all(
        data.map(async (access: any) => {
          try {
            console.log('🔄 Chargement info espace:', access.space_id);
            const spaceInfo = await nocodbService.getClientByIdPublic(access.space_id);
            console.log('📋 Info espace récupérée:', spaceInfo);
            
            return {
              ...access,
              space_info: spaceInfo ? {
                description: spaceInfo.description || `Espace ${access.space_id}`,
                statut: spaceInfo.statut || 'En cours',
                prix_payement: spaceInfo.prix_payement || '0'
              } : {
                description: `Espace ${access.space_id}`,
                statut: 'En cours',
                prix_payement: '0'
              }
            };
          } catch (error) {
            console.error(`❌ Erreur lors du chargement de l'espace ${access.space_id}:`, error);
            return {
              ...access,
              space_info: {
                description: `Espace ${access.space_id}`,
                statut: 'Inconnu',
                prix_payement: '0'
              }
            };
          }
        })
      );

      console.log('✅ Espaces avec infos complètes:', spacesWithInfo);
      setSpaceAccesses(spacesWithInfo);
    } catch (error: any) {
      console.error('💥 Erreur lors du chargement des espaces:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger vos espaces accessibles: ${error.message || error}`,
        variant: "destructive"
      });
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('collaborator_session');
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt !"
    });
    navigate('/');
  };

  const openClientSpace = (spaceId: string) => {
    navigate(`/collaborator-space/${spaceId}`);
  };

  const loadBrandingData = async (collaboratorSession: CollaboratorSession) => {
    try {
      // Récupérer l'inviter via RPC sécurisé (pas besoin d'être connecté Supabase)
      const { data, error } = await supabase.rpc('get_collaborator_safe_info', {
        p_collaborator_id: collaboratorSession.id,
        p_email: null
      });

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        console.error('❌ Erreur lors de la récupération des données collaborateur:', error);
        return;
      }

      const invitedBy = (data[0] as any).invited_by as string;
      const brandingData = await getBrandingForUser(invitedBy);
      console.log('🎨 Branding chargé pour le collaborateur:', brandingData);
      
      setBranding(brandingData);
      applyBranding(brandingData);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du branding:', error);
    }
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
                {branding.brandName ? (
                  <Logo size="md" showText={false} />
                ) : (
                  <Users className="w-8 h-8 text-primary" />
                )}
                <div>
                  <h1 className="text-xl font-bold">
                    {branding.brandName ? `Espace ${branding.brandName}` : 'Espace Collaborateur'}
                  </h1>
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
              <Button variant="default" onClick={() => navigate('/collaborator-crm')} className="gap-2">
                <Database className="w-4 h-4" />
                Accéder au CRM
              </Button>
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
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Bienvenue dans {branding.brandName ? `l'équipe ${branding.brandName}` : 'l\'équipe'} !
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">{session.name}</p>
                  <p className="text-sm text-muted-foreground">Collaborateur</p>
                </div>
                <div className="text-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Building className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">Rôle</p>
                  <Badge style={{backgroundColor: `hsl(${branding.brandColor ? branding.brandColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(' ') : 'var(--primary)'})`, color: 'white'}} className="border-0">
                    {session.role}
                  </Badge>
                </div>
                <div className="text-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium">Connexion</p>
                  <p className="text-sm text-muted-foreground">
                    {formatLoginTime(session.loginTime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accessible Spaces */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Espaces Accessibles</h2>
            {isLoadingSpaces ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Chargement de vos espaces...</p>
                </CardContent>
              </Card>
            ) : spaceAccesses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spaceAccesses.map((access) => (
                  <Card key={access.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-primary" />
                            {access.space_info?.description}
                          </CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {access.space_info?.statut}
                            </Badge>
                            {access.space_info?.prix_payement && parseInt(access.space_info.prix_payement) > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {access.space_info.prix_payement}€
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Permissions:</p>
                          <div className="flex gap-1 flex-wrap">
                            {access.permissions?.map((permission: string) => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission === 'read' ? 'Lecture' : 
                                 permission === 'write' ? 'Écriture' : 
                                 permission === 'admin' ? 'Admin' : permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button 
                          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" 
                          onClick={() => openClientSpace(access.space_id)}
                        >
                          <Eye className="w-4 h-4" />
                          Accéder à l'espace
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center">
                    Aucun espace ne vous a encore été assigné. Contactez l'administrateur pour obtenir l'accès aux espaces clients.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CollaborationDashboard;