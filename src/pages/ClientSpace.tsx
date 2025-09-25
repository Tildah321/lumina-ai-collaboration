
import { useState, useEffect, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ExternalLink, CreditCard, FileText, MessageSquare, Settings, Users, Calendar, Plus, Target, Clock, Menu, Share2, CheckCircle2, Euro, Lock, Clipboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TaskManager from '@/components/tasks/TaskManager';
import MilestoneManager from '@/components/milestones/MilestoneManager';
import NocoInvoiceManager from '@/components/invoices/NocoInvoiceManager';
import ClientShareDialog from '@/components/client/ClientShareDialog';
import { ClientSpaceProvider, useClientSpace } from '@/contexts/ClientSpaceContext';
import { usePlan } from '@/contexts/PlanContext';
import nocodbService from '@/services/nocodbService';
import ProjectInvestmentManager from '@/components/finances/ProjectInvestmentManager';

const ClientSpace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [space, setSpace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [onboardingLinkInput, setOnboardingLinkInput] = useState('');
  const [recapLinkInput, setRecapLinkInput] = useState('');
  const [checklistLinkInput, setChecklistLinkInput] = useState('');
  const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = useState(false);
  const [isRecapDialogOpen, setIsRecapDialogOpen] = useState(false);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);

  useEffect(() => {
    const loadSpace = async () => {
      setIsLoading(true);
      try {
        const foundSpace = await nocodbService.getClientById(id || '', true);
        if (foundSpace) {
          // Normaliser via les notes JSON
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
            meetingLink:
              notes.meetingLink ||
              notes.lien_rdv ||
              (foundSpace as any).cc9tztuoagcmq8l ||
              (foundSpace as any).lien_rdv ||
              '',
            onboardingLink: notes.onboardingLink || notes.lien_onboarding || foundSpace.cz787nu83e9bvlu || foundSpace.lien_onboarding || '',
            recapLink: notes.recapLink || notes.lien_recap ||
              notes.lien_recapitulatif || foundSpace.lien_recap ||
              (foundSpace as any).lien_recapitulatif || '',
            checklistLink: foundSpace.cidgucz93l1vyxd || '',
            notes
          } as any;

          setSpace(mappedSpace);
          setOnboardingLinkInput(mappedSpace.onboardingLink || '');
          setRecapLinkInput(mappedSpace.recapLink || '');
          setChecklistLinkInput(mappedSpace.checklistLink || '');
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'espace:', error);
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadSpace();
    }
  }, [id, navigate]);

  const openPaymentLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!space?.paymentLink?.trim()) {
      console.log('❌ No payment link available');
      return;
    }
    console.log('💳 Opening payment link:', space.paymentLink);
    window.open(space.paymentLink, '_blank', 'noopener,noreferrer');
  };

  const openMessageLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!space?.messageLink?.trim()) {
      console.log('❌ No message link available');
      return;
    }
    console.log('💬 Opening message link:', space.messageLink);
    window.open(space.messageLink, '_blank', 'noopener,noreferrer');
  };

  const openDriveLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!space?.driveLink?.trim()) {
      console.log('❌ No drive link available');
      return;
    }
    console.log('📁 Opening drive link:', space.driveLink);
    window.open(space.driveLink, '_blank', 'noopener,noreferrer');
  };

  const openMeetingLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!space?.meetingLink?.trim()) {
      console.log('❌ No meeting link available');
      return;
    }
    console.log('📅 Opening meeting link:', space.meetingLink);
    window.open(space.meetingLink, '_blank', 'noopener,noreferrer');
  };

  const openOnboardingLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = (space as any)?.onboardingLink;
    if (!link || !link.trim()) {
      console.log('❌ No onboarding link available');
      return;
    }
    console.log('🚀 Opening onboarding link:', link);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const openRecapLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = (space as any)?.recapLink;
    if (!link || !link.trim()) {
      console.log('❌ No recap link available');
      return;
    }
    console.log('📄 Opening recap link:', link);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const openChecklistLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = (space as any)?.checklistLink;
    if (!link || !link.trim()) {
      console.log('❌ No checklist link available');
      return;
    }
    console.log('📋 Opening checklist link:', link);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const saveOnboardingLink = async () => {
    if (!space) return;
    try {
      const value = onboardingLinkInput.trim() || null;
      const updatedNotes = { ...((space as any).notes || {}) } as any;
      if (value) {
        updatedNotes.onboardingLink = value;
        updatedNotes.lien_onboarding = value;
      } else {
        delete updatedNotes.onboardingLink;
        delete updatedNotes.lien_onboarding;
      }
      await nocodbService.updateClient((space as any).id, {
        cz787nu83e9bvlu: value,
        lien_onboarding: value,
        notes: JSON.stringify(updatedNotes)
      });
      setSpace({ ...(space as any), onboardingLink: value || '', notes: updatedNotes });
      setOnboardingLinkInput(value || '');
      toast({ title: 'Lien enregistré', description: "Le lien d'onboarding a été mis à jour." });
    } catch (error) {
      console.error('Erreur enregistrement onboarding link:', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer le lien d'onboarding", variant: 'destructive' });
    }
  };

  const saveRecapLink = async () => {
    if (!space) return;
    try {
      const value = recapLinkInput.trim() || null;
      const updatedNotes = { ...((space as any).notes || {}) } as any;
      if (value) {
        updatedNotes.recapLink = value;
        updatedNotes.lien_recap = value;
        updatedNotes.lien_recapitulatif = value;
      } else {
        delete updatedNotes.recapLink;
        delete updatedNotes.lien_recap;
        delete updatedNotes.lien_recapitulatif;
      }
      await nocodbService.updateClient((space as any).id, {
        lien_recap: value,
        lien_recapitulatif: value,
        notes: JSON.stringify(updatedNotes)
      });
      setSpace({ ...(space as any), recapLink: value || '', notes: updatedNotes });
      setRecapLinkInput(value || '');
      toast({ title: 'Lien enregistré', description: "Le lien du récapitulatif a été mis à jour." });
    } catch (error) {
      console.error('Erreur enregistrement recap link:', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer le lien du récapitulatif", variant: 'destructive' });
    }
  };

  const saveChecklistLink = async () => {
    if (!space) return;
    try {
      const value = checklistLinkInput.trim() || null;
      await nocodbService.updateClient((space as any).id, {
        cidgucz93l1vyxd: value
      });
      setSpace({ ...(space as any), checklistLink: value || '' });
      setChecklistLinkInput(value || '');
      toast({ title: 'Lien enregistré', description: "Le lien de checklist de production a été mis à jour." });
    } catch (error) {
      console.error('Erreur enregistrement checklist link:', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer le lien de checklist", variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement de l'espace...</p>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Espace non trouvé</h3>
          <Button onClick={() => navigate('/dashboard')}>Retour au dashboard</Button>
        </div>
      </div>
    );
  }

  const isClient = window.location.pathname.startsWith('/client/');

  const quickActions = [] as JSX.Element[];

  if (space.driveLink && space.driveLink.trim()) {
    quickActions.push(
      <Card
        key="drive"
        className="glass-glow cursor-pointer hover:shadow-glow transition-all duration-300 hover:scale-105"
        onClick={openDriveLink}
        role="button"
        tabIndex={0}
      >
        <CardContent className="flex items-center p-6">
          <ExternalLink className="w-8 h-8 text-primary mr-4" />
          <div>
            <h3 className="font-semibold">Google Drive</h3>
            <p className="text-sm text-muted-foreground">Accéder aux fichiers partagés</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (space.paymentLink && space.paymentLink.trim()) {
    quickActions.push(
      <Card
        key="payment"
        className="glass-glow cursor-pointer hover:shadow-glow transition-all duration-300 hover:scale-105"
        onClick={openPaymentLink}
        role="button"
        tabIndex={0}
      >
        <CardContent className="flex items-center p-6">
          <CreditCard className="w-8 h-8 text-primary mr-4" />
          <div>
            <h3 className="font-semibold">Paiement</h3>
            <p className="text-sm text-muted-foreground">Cliquez pour payer</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (space.messageLink && space.messageLink.trim()) {
    quickActions.push(
      <Card
        key="messages"
        className="glass-glow cursor-pointer hover:shadow-glow transition-all duration-300 hover:scale-105"
        onClick={openMessageLink}
        role="button"
        tabIndex={0}
      >
        <CardContent className="flex items-center p-6">
          <MessageSquare className="w-8 h-8 text-primary mr-4" />
          <div>
            <h3 className="font-semibold">Messages</h3>
            <p className="text-sm text-muted-foreground">Communication client</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (space.meetingLink && space.meetingLink.trim()) {
    quickActions.push(
      <Card
        key="meeting"
        className="glass-glow cursor-pointer hover:shadow-glow transition-all duration-300 hover:scale-105"
        onClick={openMeetingLink}
        role="button"
        tabIndex={0}
      >
        <CardContent className="flex items-center p-6">
          <Calendar className="w-8 h-8 text-primary mr-4" />
          <div>
            <h3 className="font-semibold">Rendez-vous</h3>
            <p className="text-sm text-muted-foreground">Planifier un RDV</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gridColsClass =
    quickActions.length === 1
      ? 'md:grid-cols-1'
      : quickActions.length === 2
      ? 'md:grid-cols-2'
      : quickActions.length === 3
      ? 'md:grid-cols-3'
      : 'md:grid-cols-4';

  return (
    <ClientSpaceProvider spaceId={id || ''} isClient={isClient}>
      <div className="p-6 space-y-6">
        {/* Animated Background Glows */}
        <div className="floating-glow floating-glow-1"></div>
        <div className="floating-glow floating-glow-2"></div>
        <div className="floating-glow floating-glow-3"></div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour Dashboard
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{space.description || 'Espace Client'}</h1>
              <Badge variant={space.statut === 'Terminé' ? 'default' : 'secondary'}>
                {space.statut}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {space.description && `${space.description} • `}
              {space.prix_payement > 0 && `Prix: ${space.prix_payement}€`}
            </p>
          </div>
          <Button 
            onClick={() => setIsShareDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Partager avec le client
          </Button>
        </div>

        {/* Statistiques optimisées */}
        <ClientSpaceStatistics />
        <SpaceUsageBar />


        {/* Actions rapides */}
        <div className={`grid grid-cols-1 gap-4 ${gridColsClass}`}>
          {quickActions}
        </div>

        {/* Interface de gestion */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">Tâches</TabsTrigger>
            <TabsTrigger value="project-tracking">Suivi de projet</TabsTrigger>
            <TabsTrigger value="invoices">Factures</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {isClient ? <OptimizedTaskManager isClient={isClient} /> : <AdminTaskManager />}
          </TabsContent>

          <TabsContent value="project-tracking" className="space-y-4">
            {isClient ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <h3 className="text-lg font-medium mb-2">Suivi de projet</h3>
                  <p className="text-muted-foreground">Le suivi des jalons est géré par l'équipe projet. Vous recevrez des notifications lors des mises à jour importantes.</p>
                </CardContent>
              </Card>
          ) : (
            <AdminMilestoneManager />
          )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            {isClient ? <OptimizedInvoiceManager isClient={isClient} /> : <AdminInvoiceManager />}
          </TabsContent>
        </Tabs>

        {/* Investment Manager & Client Home - Admin only */}
        {!isClient && (
          <div className="mt-6 space-y-6">
            {/* Checklist de production - Bloc séparé */}
            <Card className="glass-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clipboard className="w-5 h-5" />
                  Checklist de production
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Lien de suivi interne pour l'équipe de production (invisible pour le client).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(space as any).checklistLink && (space as any).checklistLink.trim() ? (
                  <div className="flex items-center gap-3">
                    <Button 
                      size="sm" 
                      onClick={(e) => openChecklistLink(e)}
                      className="flex items-center gap-2"
                    >
                      <Clipboard className="w-4 h-4" />
                      Ouvrir la checklist
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => { 
                        setChecklistLinkInput((space as any).checklistLink || ''); 
                        setIsChecklistDialogOpen(true); 
                      }}
                    >
                      Modifier
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => { 
                      setChecklistLinkInput(''); 
                      setIsChecklistDialogOpen(true); 
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une checklist
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Investment Manager & Client Home */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <ProjectInvestmentManager spaceId={id || ''} />
            <Card className="glass-glow h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Accueil client</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Gérez le formulaire de démarrage et le récapitulatif de projet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Formulaire de démarrage</h4>
                      {(space as any).onboardingLink && (space as any).onboardingLink.trim() ? (
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={(e) => openOnboardingLink(e)}>Voir</Button>
                            <Button size="sm" variant="outline" onClick={() => { setOnboardingLinkInput((space as any).onboardingLink || ''); setIsOnboardingDialogOpen(true); }}>Modifier</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                          <Button size="sm" onClick={() => { setOnboardingLinkInput(''); setIsOnboardingDialogOpen(true); }}>Ajouter</Button>
                        </div>
                      )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Récapitulatif du projet</h4>
                      {(space as any).recapLink && (space as any).recapLink.trim() ? (
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={(e) => openRecapLink(e)}>Voir</Button>
                            <Button size="sm" variant="outline" onClick={() => { setRecapLinkInput((space as any).recapLink || ''); setIsRecapDialogOpen(true); }}>Modifier</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                          <Button size="sm" onClick={() => { setRecapLinkInput(''); setIsRecapDialogOpen(true); }}>Ajouter</Button>
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Dialog modification du formulaire de démarrage */}

        {/* Dialog modification du formulaire de démarrage */}
        <Dialog open={isOnboardingDialogOpen} onOpenChange={setIsOnboardingDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Formulaire de démarrage</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Input
                value={onboardingLinkInput}
                onChange={(e) => setOnboardingLinkInput(e.target.value)}
                placeholder="https://exemple.com/formulaire-de-demarrage"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsOnboardingDialogOpen(false); setOnboardingLinkInput((space as any)?.onboardingLink || ''); }}>Annuler</Button>
                <Button onClick={async () => { await saveOnboardingLink(); setIsOnboardingDialogOpen(false); }}>Enregistrer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog modification du récapitulatif du projet */}
        <Dialog open={isRecapDialogOpen} onOpenChange={setIsRecapDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Récapitulatif du projet</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Input
                value={recapLinkInput}
                onChange={(e) => setRecapLinkInput(e.target.value)}
                placeholder="https://exemple.com/recap.pdf"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsRecapDialogOpen(false); setRecapLinkInput((space as any)?.recapLink || ''); }}>Annuler</Button>
                <Button onClick={async () => { await saveRecapLink(); setIsRecapDialogOpen(false); }}>Enregistrer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog modification checklist de production */}
        <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Checklist de production</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Input
                value={checklistLinkInput}
                onChange={(e) => setChecklistLinkInput(e.target.value)}
                placeholder="https://notion.so/checklist ou https://trello.com/board"
              />
              <p className="text-sm text-muted-foreground">
                Ce lien ne sera visible que par vous et vos collaborateurs, jamais par le client.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsChecklistDialogOpen(false); setChecklistLinkInput((space as any)?.checklistLink || ''); }}>Annuler</Button>
                <Button onClick={async () => { await saveChecklistLink(); setIsChecklistDialogOpen(false); }}>Enregistrer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de partage client */}
        <ClientShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          spaceId={id || ''}
          spaceName={space?.description || ''}
        />
      </div>
    </ClientSpaceProvider>
  );
};

// Composants optimisés qui utilisent le contexte
const ClientSpaceStatistics = memo(() => {
  const { tasks, milestones, invoices, isLoading } = useClientSpace();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
            Chargement des statistiques...
          </div>
        </CardContent>
      </Card>
    );
  }

  const taskStats = useMemo(() => {
    const completed = tasks.filter(t => t.statut === 'fait').length;
    const total = tasks.length;
    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks]);

  const milestoneStats = useMemo(() => {
    const completed = milestones.filter(m => m.terminé === true || m.terminé === 'true').length;
    const total = milestones.length;
    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [milestones]);

  const invoiceStats = useMemo(() => {
    let totalAmount = 0;
    let paidAmount = 0;
    let paid = 0;
    invoices.forEach(inv => {
      const amount = Number(inv.montant) || 0;
      totalAmount += amount;
      if (inv.payée === true || inv.payée === 'true') {
        paid += 1;
        paidAmount += amount;
      }
    });
    return {
      total: invoices.length,
      paid,
      totalAmount,
      paidAmount,
    };
  }, [invoices]);

  const paidPct = invoiceStats.totalAmount > 0
    ? Math.round((invoiceStats.paidAmount / invoiceStats.totalAmount) * 100)
    : 0;

  const formatEUR = (n: number) => {
    if (n >= 1000) {
      const k = n / 1000;
      return `${k.toFixed(2).replace(/\.?0+$/, '')}k €`;
    }
    return `${Math.round(n)} €`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium">Tâches</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-xl font-semibold">{taskStats.completed}/{taskStats.total}</div>
          <Progress value={taskStats.completionRate} className="mt-1 h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {taskStats.completionRate}% terminées
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium">Jalons</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-xl font-semibold">{milestoneStats.completed}/{milestoneStats.total}</div>
          <Progress value={milestoneStats.completionRate} className="mt-1 h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {milestoneStats.completionRate}% atteints
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium">Factures</CardTitle>
          <Euro className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4">
          {invoiceStats.totalAmount > 0 ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xl font-semibold truncate">
                  {formatEUR(invoiceStats.paidAmount)}
                  <span className="mx-1 text-muted-foreground text-sm">/</span>
                  {formatEUR(invoiceStats.totalAmount)}
                </div>
                <Badge variant={paidPct === 100 ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                  {paidPct}%
                </Badge>
              </div>
              <Progress value={paidPct} className="mt-1 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {invoiceStats.paid}/{invoiceStats.total} payées
              </p>
            </>
          ) : (
            <div className="text-xl font-semibold text-muted-foreground">Aucune facture</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
ClientSpaceStatistics.displayName = 'ClientSpaceStatistics';

// Barre d'utilisation de l'espace (items par rapport à la limite du plan)
const SpaceUsageBar = memo(() => {
  const { tasks, milestones, invoices, isLoading } = useClientSpace();
  const { planLimits } = usePlan();

  if (isLoading) return null;

  const { total, max, pct } = useMemo(() => {
    const totalItems = tasks.length + milestones.length + invoices.length;
    const maxItems = planLimits.maxItemsPerSpace;
    const percent = Math.min(100, Math.round((totalItems / Math.max(1, maxItems)) * 100));
    return { total: totalItems, max: maxItems, pct: percent };
  }, [tasks, milestones, invoices, planLimits]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-sm font-medium">Utilisation de l'espace</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {total}/{max} éléments
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">Tâches: {tasks.length}</Badge>
            <Badge variant="secondary">Jalons: {milestones.length}</Badge>
            <Badge variant="secondary">Factures: {invoices.length}</Badge>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">{pct}% de la capacité utilisée</p>
      </CardContent>
    </Card>
  );
});
SpaceUsageBar.displayName = 'SpaceUsageBar';

const OptimizedTaskManager = ({ isClient }: { isClient: boolean }) => {
  const { tasks, isLoading } = useClientSpace();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des tâches...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isClient) {
    // Vue admin normale
    return (
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune tâche pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.Id} task={task} isClient={false} />
          ))
        )}
      </div>
    );
  }

  // Vue client avec séparation des tâches
  console.log('🔍 All tasks:', tasks);
  console.log('🔍 Sample task structure:', tasks[0]);
  
  const clientTasks = tasks.filter(task => {
    const assignedTo = task['assigne_a'] || task['assigné_a'];
    console.log('Client task filter - assigné_a:', assignedTo);
    return assignedTo === 'client';
  });

  const adminTasks = tasks.filter(task => {
    const assignedTo = task['assigne_a'] || task['assigné_a'];
    console.log('Admin task filter - assigné_a:', assignedTo);
    return assignedTo !== 'client';
  });

  return (
    <div className="space-y-6">
      {/* Vos tâches (assignées au client) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Vos tâches
          </CardTitle>
          <CardDescription>
            Tâches qui vous sont assignées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientTasks.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune tâche assignée pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientTasks.map(task => (
                <TaskCard key={task.Id} task={task} isClient={true} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tâches de l'équipe (assignées à l'admin) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Tâches de l'équipe ({adminTasks.length})
          </CardTitle>
          <CardDescription>
            Tâches gérées par l'équipe projet (lecture seule)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {adminTasks.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune tâche équipe pour le moment</p>
              <p className="text-xs text-muted-foreground mt-2">
                Debug: Total tasks = {tasks.length}, Client tasks = {clientTasks.length}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {adminTasks.map(task => (
                <TaskCard key={task.Id} task={task} isClient={true} isAdminTask={true} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Composant TaskCard séparé pour la réutilisation
const TaskCard = ({ task, isClient, isAdminTask = false }: { 
  task: any; 
  isClient: boolean; 
  isAdminTask?: boolean;
}) => {
  const canEdit = !isClient || !isAdminTask;
  
  return (
    <div className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${!canEdit ? 'bg-muted/20' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium">{task.titre}</h4>
            <Badge variant={(task.assigne_a || task.assigné_a) === 'moi' ? 'default' : 'secondary'} className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {(task.assigne_a || task.assigné_a) === 'moi' ? 'Équipe' : 'Vous'}
            </Badge>
            {isClient && isAdminTask && (
              <Badge variant="outline" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Lecture seule
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={task.statut === 'fait' ? 'default' : task.statut === 'en cours' ? 'secondary' : 'outline'} className="text-xs">
              {task.statut}
            </Badge>
            
            {task.deadline && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(task.deadline).toLocaleDateString('fr-FR')}
              </Badge>
            )}
              
            {task.time_spent && Number(task.time_spent) > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {typeof task.time_spent === 'string' 
                  ? `${task.time_spent}h` 
                  : `${Math.floor(Number(task.time_spent) / 60)}h ${Number(task.time_spent) % 60}m`
                }
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Message pour les tâches admin en vue client */}
      {isClient && isAdminTask && (
        <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
          <Lock className="w-3 h-3 inline mr-1" />
          Cette tâche est gérée par l'équipe projet. Vous recevrez des notifications lors des mises à jour.
        </div>
      )}
    </div>
  );
};

const OptimizedMilestoneManager = ({ isClient }: { isClient: boolean }) => {
  const { milestones, isLoading } = useClientSpace();
  
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

  return (
    <div className="space-y-4">
      {milestones.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun jalon défini</p>
          </CardContent>
        </Card>
      ) : (
        milestones.map(milestone => (
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
        ))
      )}
    </div>
  );
};

const OptimizedInvoiceManager = ({ isClient }: { isClient: boolean }) => {
  const { invoices, isLoading } = useClientSpace();
  
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

  return (
    <div className="space-y-4">
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune facture disponible</p>
          </CardContent>
        </Card>
      ) : (
        invoices.map(invoice => (
          <Card key={invoice.Id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{Number(invoice.montant).toFixed(2).replace(/\.?0+$/, '')}€</div>
                  <p className="text-sm text-muted-foreground">
                    Émise le {new Date(invoice.date_emission).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Badge variant={invoice.payée === true || invoice.payée === 'true' ? 'default' : 'destructive'}>
                  {invoice.payée === true || invoice.payée === 'true' ? 'Payée' : 'En attente'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

// Composants admin avec fonctionnalité complète
const AdminTaskManager = () => {
  const { isLoading, refetch } = useClientSpace();
  const { id } = useParams();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des tâches...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Hook personnalisé pour synchroniser avec le contexte
  const handleDataChange = () => {
    refetch();
  };
  
  return <TaskManager projetId={id || ''} isClient={false} />;
};

const AdminMilestoneManager = () => {
  const { isLoading, refetch } = useClientSpace();
  const { id } = useParams();
  
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
  
  return <MilestoneManager projetId={id || ''} isClient={false} />;
};

const AdminInvoiceManager = () => {
  const { isLoading, refetch } = useClientSpace();
  const { id } = useParams();
  
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
  
  return <NocoInvoiceManager projetId={id || ''} isClient={false} />;
};

export default ClientSpace;
