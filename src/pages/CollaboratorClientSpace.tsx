import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ExternalLink, FileText, MessageSquare, Calendar, Target, Clock, Lock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TaskManager from '@/components/tasks/TaskManager';
import MilestoneManager from '@/components/milestones/MilestoneManager';
import NocoInvoiceManager from '@/components/invoices/NocoInvoiceManager';
import StatisticsOverview from '@/components/overview/StatisticsOverview';
import ProjectInvestmentManager from '@/components/finances/ProjectInvestmentManager';
import nocodbService from '@/services/nocodbService';
import { supabase } from '@/integrations/supabase/client';

const CollaboratorClientSpace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [space, setSpace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [collaboratorInfo, setCollaboratorInfo] = useState<any>(null);

  // Normalise les valeurs de lien potentiellement au format objet renvoyé par NocoDB
  const normalizeLink = (v: any): string => {
    if (v === null || v === undefined || v === 'undefined') return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      const val = (v as any).value ?? (v as any).url ?? (v as any).href;
      return typeof val === 'string' ? val : '';
    }
    return '';
  };

  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      try {
        // Vérifier la session collaborateur
        const sessionData = localStorage.getItem('collaborator_session');
        if (!sessionData) {
          toast({
            title: "Accès refusé",
            description: "Vous devez être connecté en tant que collaborateur pour accéder à cet espace",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        const collaborator = JSON.parse(sessionData);
        setCollaboratorInfo(collaborator);

        // Vérifier l'accès à cet espace spécifique via RPC sécurisée
        const invitationToken = collaborator.invitation_token || collaborator.token;
        const { data: accessData, error: accessError } = await supabase.rpc('get_spaces_for_collaborator_by_token', {
          p_invitation_token: invitationToken
        });

        if (accessError || !accessData || !accessData.find((access: any) => access.space_id === id)) {
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas l'autorisation d'accéder à cet espace",
            variant: "destructive"
          });
          navigate('/collaboration-dashboard');
          return;
        }

        setHasAccess(true);

        // Charger les informations de l'espace
        const foundSpace = await nocodbService.getClientByIdPublic(id || '');
        if (foundSpace) {
          let notes: any = {};
          try {
            notes = typeof foundSpace.notes === 'string' ? JSON.parse(foundSpace.notes) : (foundSpace.notes || {});
          } catch {}

          const mappedSpace = {
            id: foundSpace.Id || foundSpace.id,
            email: foundSpace.email || '',
            statut: foundSpace.statut || 'En cours',
            description: foundSpace.description || '',
            prix_payement: foundSpace.prix_payement || 0,
            driveLink: foundSpace.lien_portail || '',
            paymentLink: foundSpace.lien_payement || '',
            messageLink: foundSpace.lien_whatsapp || '',
            meetingLink: normalizeLink(
              notes.meetingLink ||
              notes.lien_rdv ||
              (foundSpace as any).cc9tztuoagcmq8l ||
              (foundSpace as any).lien_rdv
            ),
            onboardingLink: normalizeLink(
              notes.onboardingLink || notes.lien_onboarding || (foundSpace as any).cz787nu83e9bvlu || (foundSpace as any).lien_onboarding
            ),
            recapLink: normalizeLink(
              notes.recapLink || notes.lien_recap ||
              notes.lien_recapitulatif || (foundSpace as any).lien_recap ||
              (foundSpace as any).lien_recapitulatif
            ),
            checklistLink: normalizeLink(
              notes.checklistLink || (notes as any).lien_checklist ||
              (foundSpace as any).cidgucz93l1vyxd || (foundSpace as any).lien_checklist
            ),
            notes
          };

          setSpace(mappedSpace);
        } else {
          navigate('/collaboration-dashboard');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des accès:', error);
        toast({
          title: "Erreur",
          description: "Impossible de vérifier vos accès",
          variant: "destructive"
        });
        navigate('/collaboration-dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [id, navigate, toast]);

  const handleLogout = () => {
    localStorage.removeItem('collaborator_session');
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt !"
    });
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess || !space) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas l'autorisation d'accéder à cet espace.
            </p>
            <Button onClick={() => navigate('/collaboration-dashboard')}>
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = space.statut === 'Terminé' ? 100 : 
                  space.statut === 'En cours' ? 50 : 25;

  return (
    <div className="min-h-screen bg-background">
      {/* Header simplifié pour collaborateur */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/collaboration-dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{space.description}</h1>
                <p className="text-sm text-muted-foreground">
                  Vue collaborateur - {collaboratorInfo?.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant={space.statut === 'Terminé' ? 'default' : 'secondary'}>
                {space.statut}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <Users className="w-4 h-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Statut du projet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                État du projet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Progression</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Statut: {space.statut}</span>
                  {space.prix_payement > 0 && (
                    <span>Budget: {space.prix_payement}€</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liens utiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {space.driveLink && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <h3 className="font-medium">Portail Drive</h3>
                      <p className="text-sm text-muted-foreground">Accès aux fichiers</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => window.open(space.driveLink, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvrir
                  </Button>
                </CardContent>
              </Card>
            )}

            {space.messageLink && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <h3 className="font-medium">Messages</h3>
                      <p className="text-sm text-muted-foreground">Chat WhatsApp</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => window.open(space.messageLink, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvrir
                  </Button>
                </CardContent>
              </Card>
            )}

            {space.meetingLink && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <h3 className="font-medium">Rendez-vous</h3>
                      <p className="text-sm text-muted-foreground">Planifier une réunion</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => window.open(space.meetingLink, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Planifier
                  </Button>
                </CardContent>
              </Card>
            )}

            {space.checklistLink && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <h3 className="font-medium">Checklist</h3>
                      <p className="text-sm text-muted-foreground">Suivi production</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => window.open(space.checklistLink, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Liens de récapitulatif projet */}
          {(space.recapLink || space.onboardingLink) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {space.recapLink && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="flex-1">
                        <h3 className="font-medium">Récapitulatif du projet</h3>
                        <p className="text-sm text-muted-foreground">Document de synthèse</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => window.open(space.recapLink, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Voir le récapitulatif
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {space.onboardingLink && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="flex-1">
                        <h3 className="font-medium">Guide d'onboarding</h3>
                        <p className="text-sm text-muted-foreground">Documentation projet</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => window.open(space.onboardingLink, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Consulter
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tabs pour collaborateur */}
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tasks">Tâches</TabsTrigger>
              <TabsTrigger value="milestones">Jalons</TabsTrigger>
              <TabsTrigger value="invoices">Factures</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tasks" className="space-y-4">
              <TaskManager projetId={space.id} isClient={false} />
            </TabsContent>
            
            <TabsContent value="milestones" className="space-y-4">
              <MilestoneManager projetId={space.id} isClient={false} />
            </TabsContent>
            
            <TabsContent value="invoices" className="space-y-4">
              <NocoInvoiceManager projetId={space.id} isClient={false} />
            </TabsContent>
          </Tabs>

          {/* Investissement projet toujours visible */}
          <Card>
            <CardHeader>
              <CardTitle>Investissement par projet</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectInvestmentManager spaceId={space.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CollaboratorClientSpace;