/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  ExternalLink,
  CreditCard,
  MessageSquare,
  Shield,
  Calendar,
  Target,
  CheckCircle2,
  Euro,
  FileText,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import ClientNavigation from '@/components/layout/ClientNavigation';
import ClientTaskManager from '@/components/tasks/ClientTaskManager';
import clientAuthService from '@/services/clientAuthService';
import nocodbService from '@/services/nocodbService';

const ClientByToken = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [space, setSpace] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const validateTokenAndLoadSpace = async () => {
      if (!token) {
        console.log('❌ No token provided');
        navigate('/');
        return;
      }

      try {
        const cleanToken = decodeURIComponent(String(token)).trim().toLowerCase();
        console.log('🔍 Validating token:', cleanToken);
        
        // Utiliser un système de retry robuste pour la validation
        let validSpaceId = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!validSpaceId && attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 Validation attempt ${attempts}/${maxAttempts}`);
          
          try {
            validSpaceId = await clientAuthService.validateClientToken(cleanToken);
            if (validSpaceId) {
              break;
            }
          } catch (error) {
            console.log(`⚠️ Attempt ${attempts} failed:`, error);
            if (attempts < maxAttempts) {
              // Délai progressif entre les tentatives
              await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            }
          }
        }
        
        if (!validSpaceId) {
          console.log('❌ Invalid token after all attempts');
          toast({
            title: "Lien invalide",
            description: "Ce lien d'accès client n'est pas valide. Vérifiez le lien et réessayez.",
            variant: "destructive"
          });
          navigate('/client-access');
          return;
        }

        console.log('✅ Token valid, space ID:', validSpaceId);
        setSpaceId(validSpaceId);

        // Charger les détails de l'espace avec retry
        let foundSpace = null;
        attempts = 0;
        
        while (!foundSpace && attempts < maxAttempts) {
          attempts++;
          try {
            foundSpace = await nocodbService.getClientByIdPublic(validSpaceId);
            if (foundSpace) {
              break;
            }
          } catch (error) {
            console.log(`⚠️ Space loading attempt ${attempts} failed:`, error);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, attempts * 500));
            }
          }
        }

        if (foundSpace) {
          console.log('✅ Space found:', foundSpace);

          let notes: any = {};
            try {
              notes = typeof foundSpace.notes === 'string' ? JSON.parse(foundSpace.notes) : (foundSpace.notes || {});
            } catch (error) {
              // ignore JSON parse errors
            }

          const mappedSpace = {
            id: foundSpace.Id || foundSpace.id,
            email: foundSpace.email || '',
            statut: foundSpace.statut || 'En cours',
            description: foundSpace.description || '',
            prix_payement: foundSpace.prix_payement || 0,
            driveLink: foundSpace.lien_portail || '',
            paymentLink: foundSpace.lien_payement || '',
            messageLink: foundSpace.lien_whatsapp || '',
            meetingLink:
              notes.meetingLink ||
              notes.lien_rdv ||
              (foundSpace as any).cc9tztuoagcmq8l ||
              (foundSpace as any).lien_rdv ||
              '',
            onboardingLink: notes.onboardingLink || notes.lien_onboarding || foundSpace.cz787nu83e9bvlu || foundSpace.lien_onboarding || '',
            recapLink: notes.recapLink || notes.lien_recap ||
              notes.lien_recapitulatif || foundSpace.lien_recap ||
              (foundSpace as any).lien_recapitulatif || ''
          };

          setSpace(mappedSpace);

          // Système de persistance amélioré
          const deviceId = `${navigator.userAgent.slice(0, 50)}_${screen.width}x${screen.height}`;
          const authKey = `client_auth_${validSpaceId}_${btoa(deviceId).slice(0, 8)}`;
          
          try {
            const alreadyAuthed = localStorage.getItem(authKey) === 'true';
            
            if (alreadyAuthed) {
              console.log('🔓 Already authenticated on this device');
              setIsAuthenticated(true);
              setNeedsPassword(false);
            } else {
              // Vérifier si un mot de passe est requis
              const hasPassword = await clientAuthService.hasPassword(validSpaceId);
              if (hasPassword) {
                console.log('🔒 Password required');
                setNeedsPassword(true);
                setIsAuthenticated(false);
              } else {
                console.log('🔓 No password required');
                setIsAuthenticated(true);
                localStorage.setItem(authKey, 'true');
              }
            }
          } catch (storageError) {
            console.log('⚠️ Local storage error, proceeding without cache:', storageError);
            // Procéder sans cache en cas d'erreur
            const hasPassword = await clientAuthService.hasPassword(validSpaceId);
            if (hasPassword) {
              setNeedsPassword(true);
              setIsAuthenticated(false);
            } else {
              setIsAuthenticated(true);
            }
          }
        } else {
          console.log('❌ Space not found after all attempts');
          toast({
            title: "Espace introuvable",
            description: "L'espace client associé à ce lien est introuvable",
            variant: "destructive"
          });
          navigate('/client-access');
        }
      } catch (error) {
        console.error('Error in token validation flow:', error);
        toast({
          title: "Erreur de connexion",
          description: "Problème de connexion. Vérifiez votre réseau et réessayez.",
          variant: "destructive"
        });
        navigate('/client-access');
      }
      
      setIsLoading(false);
    };

    validateTokenAndLoadSpace();
  }, [token, navigate, toast]);

  const handlePasswordSubmit = async () => {
    if (!spaceId) return;
    
    setIsLoading(true);
    try {
      let isValid = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      // Retry sur la vérification de mot de passe
      while (!isValid && attempts < maxAttempts) {
        attempts++;
        try {
          isValid = await clientAuthService.verifyClientPassword(spaceId, passwordInput);
          if (isValid) {
            break;
          }
        } catch (error) {
          console.log(`⚠️ Password verification attempt ${attempts} failed:`, error);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, attempts * 500));
          }
        }
      }
      
      if (isValid) {
        setIsAuthenticated(true);
        setNeedsPassword(false);
        
        // Persister la session avec device ID pour plus de robustesse
        try {
          const deviceId = `${navigator.userAgent.slice(0, 50)}_${screen.width}x${screen.height}`;
          const authKey = `client_auth_${spaceId}_${btoa(deviceId).slice(0, 8)}`;
          localStorage.setItem(authKey, 'true');
        } catch (storageError) {
          console.log('Storage failed, session won\'t persist:', storageError);
        }
        
        toast({
          title: "Accès autorisé",
          description: "Bienvenue dans votre espace client"
        });
      } else {
        toast({
          title: "Mot de passe incorrect",
          description: "Vérifiez votre mot de passe et réessayez",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Password verification error:', error);
      toast({
        title: "Erreur de connexion",
        description: "Problème de réseau. Réessayez dans quelques secondes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openLink = (url: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (url?.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Vérification de l'accès...</p>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Accès non autorisé</h3>
          <p className="text-muted-foreground mb-4">Ce lien n'est pas valide ou a expiré</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  if (needsPassword && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Espace Client Protégé</CardTitle>
            <CardDescription>
              Entrez le mot de passe pour accéder à votre espace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                />
              </div>
              <Button onClick={handlePasswordSubmit} className="w-full">
                Accéder à l'espace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Accès requis</h3>
          <p className="text-muted-foreground mb-4">Authentification en cours...</p>
        </div>
      </div>
    );
  }
  const quickActions: JSX.Element[] = [];

  if (space.driveLink && space.driveLink.trim()) {
    quickActions.push(
      <Card
        key="drive"
        className="glass-glow cursor-pointer hover:shadow-glow transition-all duration-300"
        onClick={(e) => openLink(space.driveLink, e)}
      >
        <CardContent className="flex items-center p-4">
          <ExternalLink className="w-6 h-6 text-primary mr-3" />
          <div>
            <h3 className="text-sm font-semibold">Fichiers</h3>
            <p className="text-xs text-muted-foreground">Accéder aux documents</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (space.paymentLink && space.paymentLink.trim()) {
    quickActions.push(
      <Card
        key="payment"
        className="glass-glow cursor-pointer hover:shadow-glow transition-all duration-300"
        onClick={(e) => openLink(space.paymentLink, e)}
      >
        <CardContent className="flex items-center p-4">
          <CreditCard className="w-6 h-6 text-primary mr-3" />
          <div>
            <h3 className="text-sm font-semibold">
              Paiement{space.prix_payement ? ` - ${space.prix_payement}€` : ''}
            </h3>
            <p className="text-xs text-muted-foreground">Effectuer un paiement</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (space.messageLink && space.messageLink.trim()) {
    quickActions.push(
      <Card
        key="messages"
        className="glass-glow cursor-pointer hover:shadow-glow transition-all duration-300"
        onClick={(e) => openLink(space.messageLink, e)}
      >
        <CardContent className="flex items-center p-4">
          <MessageSquare className="w-6 h-6 text-primary mr-3" />
          <div>
            <h3 className="text-sm font-semibold">Messages</h3>
            <p className="text-xs text-muted-foreground">Nous contacter</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (space.meetingLink && space.meetingLink.trim()) {
    quickActions.push(
      <Card
        key="meeting"
        className="glass-glow cursor-pointer hover:shadow-glow transition-all duration-300"
        onClick={(e) => openLink(space.meetingLink, e)}
      >
        <CardContent className="flex items-center p-4">
          <Calendar className="w-6 h-6 text-primary mr-3" />
          <div>
            <h3 className="text-sm font-semibold">Rendez-vous</h3>
            <p className="text-xs text-muted-foreground">Planifier un RDV</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gridColsClass =
    quickActions.length === 1
      ? 'grid-cols-1 md:grid-cols-1'
      : quickActions.length === 2
      ? 'grid-cols-2 md:grid-cols-2'
      : quickActions.length === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <ClientNavigation
          spaceName={space.description}
          spacePrice={space.prix_payement}
          onSidebarChange={setSidebarCollapsed}
        />
      )}

      {/* Main Content */}
      <main
        className={`transition-all duration-300 overflow-auto ${
          isMobile
            ? 'flex-1 p-4 pb-20'
            : `flex-1 p-8 ${sidebarCollapsed ? 'pl-20' : 'pl-72'}`
        }`}
      >
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Bienvenue dans votre espace</h1>
            <p className="text-muted-foreground">
              Suivez l'avancement de votre projet et accédez à vos ressources
            </p>
          </div>

          {space.recapLink && space.recapLink.trim() && (
            <Card className="mb-6 border-l-4 border-primary bg-primary/10">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="font-medium">Récapitulatif du projet</span>
                </div>
                <Button variant="secondary" onClick={(e) => openLink(space.recapLink, e)}>
                  Ouvrir
                </Button>
              </CardContent>
            </Card>
          )}

          {quickActions.length > 0 && (
            <div className={`grid gap-2 mb-6 ${gridColsClass}`}>{quickActions}</div>
          )}
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Vue d'ensemble du projet</h2>
              <ClientSpaceStatistics spaceId={spaceId || ''} />
              {space.onboardingLink && space.onboardingLink.trim() && (
                <Card className="border-none bg-primary text-primary-foreground">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">Prêt à commencer ?</h3>
                          <p className="text-sm opacity-90">Complétez votre formulaire de démarrage</p>
                        </div>
                      </div>
                      <Button
                        onClick={(e) => openLink(space.onboardingLink, e)}
                        variant="secondary"
                        className="bg-white text-primary hover:bg-white/90"
                      >
                        Commencer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Tâches du projet</h2>
            <p className="text-muted-foreground mb-6">
              Suivez l'avancement de toutes les tâches du projet
            </p>
            <ClientTaskManager spaceId={spaceId || ''} />
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Jalons du projet</h2>
            <p className="text-muted-foreground mb-6">
              Les étapes importantes de votre projet
            </p>
            <ClientMilestoneManager spaceId={spaceId || ''} />
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Vos factures</h2>
            <p className="text-muted-foreground mb-6">
              Consultez et validez vos documents financiers
            </p>
            <ClientInvoiceManager spaceId={spaceId || ''} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// Composants client standalone qui chargent directement les données
const ClientSpaceStatistics = ({ spaceId }: { spaceId: string }) => {
  const [stats, setStats] = useState({
    tasks: { total: 0, completed: 0, completionRate: 0 },
    milestones: { total: 0, completed: 0 },
    invoices: { total: 0, paid: 0, totalAmount: 0, paidAmount: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('📊 [CLIENT] Chargement des statistiques pour spaceId:', spaceId);

        // Chargement en parallèle pour réduire le temps de chargement
        const [tasksResponse, milestonesResponse, invoicesResponse] = await Promise.all([
          nocodbService.getTasksPublic(spaceId),
          nocodbService.getMilestonesPublic(spaceId),
          nocodbService.getInvoicesPublic(spaceId)
        ]);
        console.log('✅ [CLIENT] Tâches reçues:', tasksResponse?.list?.length || 0, 'items');
        console.log('✅ [CLIENT] Jalons reçus:', milestonesResponse?.list?.length || 0, 'items');
        console.log('✅ [CLIENT] Factures reçues:', invoicesResponse?.list?.length || 0, 'items');

        const tasks = tasksResponse?.list || [];
        const milestones = milestonesResponse?.list || [];
        const invoices = invoicesResponse?.list || [];

        // Calculer les statistiques
        const taskStats = {
          total: tasks.length,
          completed: tasks.filter((t: any) => t.statut === 'fait').length,
          completionRate: tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.statut === 'fait').length / tasks.length) * 100) : 0
        };

        const milestoneStats = {
          total: milestones.length,
          completed: milestones.filter((m: any) => m.terminé === true || m.terminé === 'true').length
        };

        const invoiceStats = {
          total: invoices.length,
          paid: invoices.filter((i: any) => i.payée === true || i.payée === 'true').length,
          totalAmount: Number(invoices.reduce((sum: number, inv: any) => sum + (Number(inv.montant) || 0), 0).toFixed(2)),
          paidAmount: Number(invoices.filter((i: any) => i.payée === true || i.payée === 'true').reduce((sum: number, inv: any) => sum + (Number(inv.montant) || 0), 0).toFixed(2))
        };

        console.log('📈 [CLIENT] Statistiques calculées:', {
          tasks: taskStats,
          milestones: milestoneStats,
          invoices: invoiceStats
        });

        setStats({
          tasks: taskStats,
          milestones: milestoneStats,
          invoices: invoiceStats
        });
      } catch (error) {
        console.error('❌ [CLIENT] Erreur lors du chargement des statistiques:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (spaceId) {
      loadStats();
    }
  }, [spaceId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tâches</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.tasks.completed}/{stats.tasks.total}</div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.tasks.completionRate}% terminées
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Jalons</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.milestones.completed}/{stats.milestones.total}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Jalons atteints
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Factures</CardTitle>
          <Euro className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold truncate">
            {stats.invoices.totalAmount > 0 ? `${Number(stats.invoices.paidAmount).toFixed(2).replace(/\.?0+$/, '')}€/${Number(stats.invoices.totalAmount).toFixed(2).replace(/\.?0+$/, '')}€` : 'Aucune facture'}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.invoices.paid}/{stats.invoices.total} payées
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Component removed - using imported ClientTaskManager instead

const ClientMilestoneManager = ({ spaceId }: { spaceId: string }) => {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMilestones = async () => {
      try {
        console.log('🎯 [CLIENT] Chargement des jalons pour spaceId:', spaceId);
        const response = await nocodbService.getMilestonesPublic(spaceId);
        const milestones = response?.list || [];
        console.log('🎯 [CLIENT] Jalons reçus:', milestones.length, 'items');
        setMilestones(milestones);
      } catch (error) {
        console.error('❌ [CLIENT] Erreur lors du chargement des jalons:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (spaceId) {
      loadMilestones();
    }
  }, [spaceId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des jalons...</p>
        </CardContent>
      </Card>
    );
  }

  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun jalon défini</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {milestones.map(milestone => (
        <Card key={milestone.Id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{milestone.titre}</h4>
                {milestone.description && (
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                )}
              </div>
              <Badge variant={milestone.terminé === true || milestone.terminé === 'true' ? 'default' : 'secondary'}>
                {milestone.terminé === true || milestone.terminé === 'true' ? 'Terminé' : 'En cours'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const ClientInvoiceManager = ({ spaceId }: { spaceId: string }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        console.log('💰 [CLIENT] Chargement des factures pour spaceId:', spaceId);
        const response = await nocodbService.getInvoicesPublic(spaceId);
        const invoices = response?.list || [];
        console.log('💰 [CLIENT] Factures reçues:', invoices.length, 'items');
        setInvoices(invoices);
      } catch (error) {
        console.error('❌ [CLIENT] Erreur lors du chargement des factures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (spaceId) {
      loadInvoices();
    }
  }, [spaceId]);

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await nocodbService.updateInvoicePublic(invoiceId, {
        payée: true,
        updated_at: new Date().toISOString()
      });
      
      // Mettre à jour localement
      setInvoices(prev => prev.map(invoice => 
        invoice.Id === invoiceId ? { ...invoice, payée: true } : invoice
      ));
      
      toast({
        title: "Facture marquée comme payée",
        description: "Le statut de paiement a été mis à jour"
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la facture comme payée",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des factures...</p>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune facture disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map(invoice => (
        <Card key={invoice.Id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium">Facture {invoice.numero || invoice.Id}</h4>
                  <Badge variant={invoice.payée === true || invoice.payée === 'true' ? 'default' : 'secondary'} className="text-xs">
                    {invoice.payée === true || invoice.payée === 'true' ? 'Payée' : 'En attente'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    <span>{Number(invoice.montant || 0).toFixed(2)}€</span>
                  </div>
                  {invoice.date_echeance && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Échéance: {new Date(invoice.date_echeance).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
                
                {invoice.description && (
                  <p className="text-sm text-muted-foreground">{invoice.description}</p>
                )}
              </div>
              
              {!(invoice.payée === true || invoice.payée === 'true') && (
                <Button 
                  onClick={() => handleMarkAsPaid(invoice.Id)}
                  variant="outline"
                  size="sm"
                  className="ml-4"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Marquer comme payée
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ClientByToken;