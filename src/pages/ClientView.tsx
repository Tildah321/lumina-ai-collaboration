import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Lock,
  ExternalLink,
  CreditCard,
  MessageSquare,
  Eye,
  Calendar,
  Home,
  CheckSquare,
  Users,
  Folder,
  Target,
  Mail,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StatisticsOverview from '@/components/overview/StatisticsOverview';
import TaskManager from '@/components/tasks/TaskManager';
import MilestoneManager from '@/components/milestones/MilestoneManager';
import InvoiceManager from '@/components/invoices/InvoiceManager';
import nocodbService from '@/services/nocodbService';
import clientAuthService from '@/services/clientAuthService';
import { loadBranding, applyBranding } from '@/lib/branding';

const navItems = [
  { value: 'home', icon: Home, label: 'Accueil' },
  { value: 'project', icon: Folder, label: 'Projet' },
  { value: 'collaborator', icon: Users, label: 'Collaborateur' }
];


const ClientView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [space, setSpace] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const branding = loadBranding();
  useEffect(() => {
    applyBranding(branding);
  }, []);
  const providerInfo = {
    name: branding.brandName || 'Lumina',
    website: 'https://lumina.app',
    email: 'contact@lumina.app'
  };

  useEffect(() => {
    const loadSpace = async () => {
      try {
        const foundSpace = await nocodbService.getClientByIdPublic(id!);
        if (!foundSpace) {
          navigate('/dashboard');
          return;
        }

        let notes: any = {};
        try {
          notes = typeof foundSpace.notes === 'string' ? JSON.parse(foundSpace.notes) : (foundSpace.notes || {});
        } catch {}

        const mappedSpace = {
          id: foundSpace.Id || foundSpace.id,
          name: foundSpace.entreprise || 'Projet',
          clientName: foundSpace.name || '',
          clientEmail: foundSpace.email || '',
          status: foundSpace.statut || 'En cours',
          googleDriveLink: foundSpace.lien_portail || '',
          paymentLink: foundSpace.lien_payement || '',
          paymentAmount: foundSpace.prix_payement || notes.prix_payement,
          messageLink: foundSpace.lien_whatsapp || '',
          meetingLink:
            notes.meetingLink ||
            notes.lien_rdv ||
            (foundSpace as any).cc9tztuoagcmq8l ||
            (foundSpace as any).lien_rdv ||
            '',
          onboardingLink:
            notes.onboardingLink ||
            notes.lien_onboarding ||
            foundSpace.cz787nu83e9bvlu ||
            foundSpace.lien_onboarding ||
            '',
          recapLink:
            notes.recapLink ||
            notes.lien_recap ||
            notes.lien_recapitulatif ||
            foundSpace.lien_recap ||
            (foundSpace as any).lien_recapitulatif ||
            ''
        } as any;

        setSpace(mappedSpace);

        const requiresPassword = await clientAuthService.hasPassword(id!);
        setNeedsPassword(requiresPassword);
        if (!requiresPassword) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'espace:", error);
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadSpace();
    }
  }, [id, navigate]);

  const handlePasswordSubmit = async () => {
    if (!id) return;
    const isValid = await clientAuthService.verifyClientPassword(id, passwordInput);
    if (isValid) {
      setIsAuthenticated(true);
      toast({
        title: 'Accès autorisé',
        description: 'Bienvenue dans votre espace client'
      });
    } else {
      toast({
        title: 'Mot de passe incorrect',
        description: 'Vérifiez le mot de passe et réessayez',
        variant: 'destructive'
      });
    }
  };

  const openLink = (link?: string) => {
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const projectNavItems = [
    { value: 'tasks', label: 'Tâches', icon: CheckSquare },
    { value: 'milestones', label: 'Jalons', icon: Target },
    { value: 'invoices', label: 'Factures', icon: CreditCard }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Chargement...</h3>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Espace client non trouvé</h3>
          <p className="text-muted-foreground">L'espace que vous recherchez n'existe pas ou a été supprimé.</p>
        </div>
      </div>
    );
  }

  if (needsPassword && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>Accès protégé</CardTitle>
            <CardDescription>
              Entrez le mot de passe pour accéder à l'espace client de {space.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Entrez le mot de passe"
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
            </div>
            <Button onClick={handlePasswordSubmit} className="w-full">
              Accéder à l'espace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quickActions = (
    [
      space.googleDriveLink && {
        icon: ExternalLink,
        label: 'Fichiers partagés',
        sub: 'Accéder à Google Drive',
        onClick: () => openLink(space.googleDriveLink)
      },
      space.paymentLink && {
        icon: CreditCard,
        label: `Paiement - ${space.paymentAmount ?? ''}€`,
        sub: 'Effectuer le paiement',
        onClick: () => openLink(space.paymentLink)
      },
      space.messageLink && {
        icon: MessageSquare,
        label: 'Messages',
        sub: 'Communication',
        onClick: () => openLink(space.messageLink)
      },
      space.meetingLink && {
        icon: Calendar,
        label: 'Rendez-vous',
        sub: 'Planifier un RDV',
        onClick: () => openLink(space.meetingLink)
      }
    ].filter(Boolean) as {
      icon: any;
      label: string;
      sub: string;
      onClick: () => void;
    }[]
  );

  return (
    <Tabs
      defaultValue="home"
      className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5"
    >
      {/* Desktop navigation */}
      <TabsList className="hidden md:flex justify-center gap-6 border-b bg-background sticky top-0 z-50">
        {navItems.map((item) => (
          <TabsTrigger key={item.value} value={item.value} className="flex items-center gap-2 py-4">
            <item.icon className="w-4 h-4" />
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <TabsContent value="home" className="container mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="text-center mb-6 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-bold">{space.name}</h1>
              <Badge variant={space.status === 'Actif' ? 'default' : 'secondary'}>{space.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Espace client - {space.clientName}
            </p>
          </div>

          {space.recapLink && (
            <Card className="border-l-4 border-primary bg-primary/10">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="font-medium">Récapitulatif du projet</span>
                </div>
                <Button variant="secondary" onClick={() => openLink(space.recapLink)}>
                  Ouvrir
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions rapides */}
          {quickActions.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {quickActions.map((action, idx) => (
                <Card
                  key={idx}
                  className="cursor-pointer hover:shadow-glow transition-all duration-300"
                  onClick={action.onClick}
                >
                  <CardContent className="flex items-center p-4">
                    <action.icon className="w-6 h-6 text-primary mr-3" />
                    <div>
                      <h3 className="text-sm font-semibold">{action.label}</h3>
                      <p className="text-xs text-muted-foreground">{action.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <StatisticsOverview spaceId={id || ''} isPublic />

          {space.onboardingLink && space.onboardingLink.trim() && (
            <Card>
              <CardHeader>
                <CardTitle>Formulaire de démarrage</CardTitle>
                <CardDescription>
                  Cliquez pour remplir le formulaire de démarrage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => openLink(space.onboardingLink)}
                  className="w-full"
                >
                  Commencer
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="project" className="container mx-auto px-4 py-6 space-y-6">
          <StatisticsOverview spaceId={id || ''} isPublic />
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="justify-start mb-4">
              {projectNavItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex items-center gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="tasks" className="space-y-4">
              <TaskManager projetId={id || ''} isClient={true} />
            </TabsContent>
            <TabsContent value="milestones" className="space-y-4">
              <MilestoneManager projetId={id || ''} isClient={true} />
            </TabsContent>
            <TabsContent value="invoices" className="space-y-4">
              <InvoiceManager
                spaceId={id || ''}
                clientName={space.clientName}
                clientEmail={space.clientEmail}
                isClient={true}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="collaborator" className="container mx-auto px-4 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Votre prestataire</CardTitle>
              <CardDescription>Informations de contact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>
                  <strong>Nom :</strong> {providerInfo.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>
                  <strong>Site :</strong>{' '}
                  <a
                    href={providerInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {providerInfo.website}
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>
                  <strong>Email :</strong>{' '}
                  <a
                    href={`mailto:${providerInfo.email}`}
                    className="text-primary hover:underline"
                  >
                    {providerInfo.email}
                  </a>
                </span>
              </div>
            </CardContent>
          </Card>

          {(space.messageLink || space.paymentLink || space.meetingLink) && (
            <Card>
              <CardHeader>
                <CardTitle>Liens utiles</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {space.messageLink && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => openLink(space.messageLink)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contacter
                  </Button>
                )}
                {space.paymentLink && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => openLink(space.paymentLink)}
                  >
                    <CreditCard className="w-4 h-4" />
                    Paiement
                  </Button>
                )}
                {space.meetingLink && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => openLink(space.meetingLink)}
                  >
                    <Calendar className="w-4 h-4" />
                    Rendez-vous
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Opportunités d'upsell</CardTitle>
              <CardDescription>Services complémentaires à découvrir</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => openLink('https://lumina.app')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Découvrir Lumina
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </div>

      {/* Mobile navigation */}
      <TabsList className="md:hidden fixed bottom-0 left-0 right-0 grid grid-cols-3 border-t bg-background z-50">
        {navItems.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="flex flex-col items-center gap-1 py-2"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default ClientView;
