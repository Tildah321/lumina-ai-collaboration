import { useState, useEffect, useCallback } from 'react';
import { Users, MessageCircle, FileText, Share2, ExternalLink, Edit, Trash2, Mail, Phone, Target, Euro, Plus } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import nocodbService from '@/services/nocodbService';
import ClientShareDialog from '@/components/client/ClientShareDialog';
import ProspectKanban from '@/components/prospection/ProspectKanban';
import ProspectForm, { ProspectFormData } from '@/components/prospection/ProspectForm';
import { Prospect } from '@/types/prospect';
import { mapProspectStatus, mapProspectStatusToNoco } from '@/lib/prospectStatus';
import MilestoneManager from '@/components/milestones/MilestoneManager';
import NocoInvoiceManager from '@/components/invoices/NocoInvoiceManager';
import ProspectCreateSpaceDialog from '@/components/prospection/ProspectCreateSpaceDialog';

type NocoRecord = Record<string, unknown>;

const PROSPECT_COMPANY_COLUMN = 'cxi03jrd1enf3n2';
const PROSPECT_PHONE_COLUMN = 'ch2fw3p077t9y6w';
const PROSPECT_SITE_COLUMN = 'coo7e2wbo6zvvux';

interface Project {
  id: string; // Client space ID
  projectId: string; // NocoDB project ID
  client: string;
  spaceName: string;
  status: string;
  deadline: string;
  progress: number;
  description: string;
  driveLink: string;
  price: number;
}

const PROSPECTS_PAGE_SIZE = 20;

// Fonction utilitaire supprimée : les appels réseau sont limités

const Pipou = () => {
  const { hasFeatureAccess, upgradeRequired, loading } = usePlan();
  const navigate = useNavigate();

  // Accès autorisé pour tous les utilisateurs
  
  // Projets chargés depuis NocoDB
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestonesProject, setMilestonesProject] = useState<Project | null>(null);
  const [invoicesProject, setInvoicesProject] = useState<Project | null>(null);

  // Backfill des anciens prospects vers le compte courant
  useEffect(() => {
    const runBackfill = async () => {
      try {
        await nocodbService.backfillProspectsForCurrentUser();
      } catch (e) {
        console.warn('Backfill prospects échoué:', e);
      }
    };
    runBackfill();
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const clientsRes = await nocodbService.getClients();
        const clients = (clientsRes.list || []) as NocoRecord[];

        const projectsData = clients.map(c => {
          const clientId = ((c as { Id?: unknown; id?: unknown }).Id || (c as { Id?: unknown; id?: unknown }).id)?.toString() || '';
          const record = c as Record<string, unknown>;
          const name = (record.nom as string) || (record.name as string) || 'Client';
          const desc = (record.description as string) || '';
          const spaceName = desc || name;
          const status = (record.statut as string) || 'En cours';
          const rawDeadline = (record.deadline as string) || '';
          const deadline = rawDeadline ? new Date(rawDeadline).toLocaleDateString() : 'Aucune';
          const driveLink = (record['lien_portail'] as string) || '';
          const price = (record['prix_payement'] as number) || 0;

          return {
            id: clientId,
            projectId: clientId,
            client: name,
            spaceName,
            status,
            deadline,
            progress: 0,
            description: desc,
            driveLink,
            price
          } as Project;
        });

        setProjects(projectsData);
        setIsLoadingProjects(false);
      } catch (error) {
        console.error('Erreur chargement projets:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  // Données mockées de prospection CRM
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(true);
  const [prospectOffset, setProspectOffset] = useState(0);
  const [hasMoreProspects, setHasMoreProspects] = useState(true);
  const [isCreateProspectDialogOpen, setIsCreateProspectDialogOpen] = useState(false);
  const [isEditProspectDialogOpen, setIsEditProspectDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [activeTab, setActiveTab] = useState('clients');
  const [spaceProspect, setSpaceProspect] = useState<Prospect | null>(null);

  const buildProspectPayload = (
    data: ProspectFormData & { status: string; lastContact?: string }
  ) => ({
    name: data.name,
    [PROSPECT_COMPANY_COLUMN]: data.company,
    entreprise: data.company,
    Entreprise: data.company,
    email: data.email,
    [PROSPECT_PHONE_COLUMN]: data.phone,
    telephone: data.phone,
    Telephone: data.phone,
    Téléphone: data.phone,
    phone: data.phone,
    [PROSPECT_SITE_COLUMN]: data.website,
    site: data.website,
    reseaux: data.website,
    website: data.website,
    'Réseaux / Site': data.website,
    status: mapProspectStatusToNoco(data.status),
    dernier_contact:
      data.lastContact || new Date().toISOString().split('T')[0]
  });

  const loadProspects = useCallback(async () => {
    setIsLoadingProspects(true);
    try {
      await nocodbService.backfillTasksForCurrentUser();
      const anyService = nocodbService as any;
      if (typeof anyService.backfillProspectsForCurrentUser === 'function') {
        await anyService.backfillProspectsForCurrentUser();
      }

      const response = await nocodbService.getProspects(
        PROSPECTS_PAGE_SIZE,
        prospectOffset,
        false,
        { onlyCurrentUser: true }
      );
      const list = (response.list || []).map((p: Record<string, unknown>) => ({
        id: ((p as { Id?: unknown; id?: unknown }).Id || (p as { Id?: unknown; id?: unknown }).id || '').toString(),
        name: (p as { name?: string }).name || '',
        company:
          (p as Record<string, unknown>)[PROSPECT_COMPANY_COLUMN] as string ||
          (p as { entreprise?: string }).entreprise ||
          (p as { company?: string }).company ||
          (p as Record<string, string>)['Entreprise'] ||
          '',
        email: (p as { email?: string }).email || '',
        phone:
          (p as Record<string, unknown>)[PROSPECT_PHONE_COLUMN] as string ||
          (p as { telephone?: string }).telephone ||
          (p as { numero?: string }).numero ||
          (p as { phone?: string }).phone ||
          (p as Record<string, string>)['t_l_phone'] ||
          (p as Record<string, string>)['téléphone'] ||
          (p as Record<string, string>)['Téléphone'] ||
          (p as Record<string, string>)['Telephone'] ||
          '',
        website:
          (p as Record<string, unknown>)[PROSPECT_SITE_COLUMN] as string ||
          (p as { site?: string }).site ||
          (p as { reseaux?: string }).reseaux ||
          (p as { website?: string }).website ||
          (p as Record<string, string>)['reseaux_site'] ||
          (p as Record<string, string>)['site_web'] ||
          (p as Record<string, string>)['Réseaux / Site'] ||
          '',
        status: mapProspectStatus((p as { status?: string }).status || 'nouveau'),
        lastContact:
          (p as { lastContact?: string; dernier_contact?: string }).lastContact ||
          (p as { dernier_contact?: string }).dernier_contact ||
          ''
      }));
      setProspects(prev => [...prev, ...list]);
      setProspectOffset(prev => prev + list.length);
      setHasMoreProspects(list.length === PROSPECTS_PAGE_SIZE);
    } catch (error) {
      console.error('Erreur chargement prospects:', error);
    } finally {
      setIsLoadingProspects(false);
    }
  }, [prospectOffset]);

  useEffect(() => {
    if (activeTab !== 'prospection' || prospects.length > 0) return;
    loadProspects();
  }, [activeTab, prospects.length, loadProspects]);

  const addProspect = async (data: ProspectFormData) => {
    if (!data.name || !data.company) return;
    try {
      const payload = buildProspectPayload({ ...data, status: 'Nouveau' });
      const response = (await nocodbService.createProspect(payload)) as Record<string, unknown>;
      const created: Prospect = {
        id: ((response as { Id?: unknown; id?: unknown }).Id || (response as { Id?: unknown; id?: unknown }).id || '').toString(),
        name: (response as { name?: string }).name || data.name,
        company:
          (response as Record<string, unknown>)[PROSPECT_COMPANY_COLUMN] as string ||
          (response as { entreprise?: string }).entreprise ||
          (response as { company?: string }).company ||
          (response as Record<string, string>)['Entreprise'] ||
          data.company,
        email: (response as { email?: string }).email || data.email,
        phone:
          (response as Record<string, unknown>)[PROSPECT_PHONE_COLUMN] as string ||
          (response as { telephone?: string }).telephone ||
          (response as { numero?: string }).numero ||
          (response as { phone?: string }).phone ||
          (response as Record<string, string>)['t_l_phone'] ||
          (response as Record<string, string>)['téléphone'] ||
          (response as Record<string, string>)['Téléphone'] ||
          (response as Record<string, string>)['Telephone'] ||
          data.phone,
        website:
          (response as Record<string, unknown>)[PROSPECT_SITE_COLUMN] as string ||
          (response as { site?: string }).site ||
          (response as { reseaux?: string }).reseaux ||
          (response as { website?: string }).website ||
          (response as Record<string, string>)['reseaux_site'] ||
          (response as Record<string, string>)['site_web'] ||
          (response as Record<string, string>)['Réseaux / Site'] ||
          data.website,
        status: mapProspectStatus((response as { status?: string }).status || 'nouveau'),
        lastContact:
          (response as { lastContact?: string; dernier_contact?: string }).lastContact ||
          (response as { dernier_contact?: string }).dernier_contact ||
          payload.dernier_contact
      };
      setProspects(prev => [...prev, created]);
      setProspectOffset(prev => prev + 1);
      setIsCreateProspectDialogOpen(false);
    } catch (error) {
      console.error('Erreur création prospect:', error);
    }
  };

  const handleEditProspect = async (data: Prospect) => {
    if (!data.id) return;
    const id = data.id;
    const previous = prospects.find(p => p.id === id);

    // Mise à jour optimiste
    setProspects(prev => prev.map(p => (p.id === id ? data : p)));
    setIsEditProspectDialogOpen(false);
    setEditingProspect(null);

    try {
      await nocodbService.updateProspect(
        id,
        buildProspectPayload({
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          website: data.website,
          status: data.status,
          lastContact: data.lastContact
        })
      );
    } catch (error) {
      console.error('Erreur mise à jour prospect:', error);
      if (previous) {
        setProspects(prev => prev.map(p => (p.id === id ? previous : p)));
      }
    }
  };

  const handleDeleteProspect = async (id: string) => {
    if (!id) return;
    const previousProspects = [...prospects];

    // Mise à jour optimiste
    setProspects(prev => prev.filter(p => p.id !== id));
    setProspectOffset(prev => Math.max(0, prev - 1));

    try {
      await nocodbService.deleteProspect(id);
    } catch (error) {
      console.error('Erreur suppression prospect:', error);
      // Revenir à l'état précédent
      setProspects(previousProspects);
    }
  };

  const handleProjectSummary = (project: Project) => {
    alert(`📊 Résumé du projet "${project.spaceName}":\n\n✅ Avancement : ${project.progress}%\n⏰ Deadline : ${project.deadline}\n📋 Statut : ${project.status}\n\nLe projet avance bien ! Prochaines étapes recommandées : finaliser les tests utilisateurs et préparer la mise en production.`);
  };

  const handleClientMessage = (project: Project) => {
    alert(`✉️ Message automatique pour ${project.client}:\n\n"Bonjour ! Voici un point sur l'avancement de votre projet '${project.spaceName}'.\n\nNous avons bien progressé avec ${project.progress}% de réalisation. L'équipe travaille actuellement sur les derniers ajustements pour respecter votre deadline du ${project.deadline}.\n\nN'hésite pas si tu as des questions !\nL'équipe Lumina 🚀"`);
  };

  const refreshProjectData = async (_projectId: string) => {
    // Les statistiques de projet ne sont plus chargées
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-2xl">🐶</span>
            Pipou - Assistant relationnel
          </h1>
          <p className="text-muted-foreground mt-2">
            Suivi de vos projets et communication client optimisée
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="prospection" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Prospection
            </TabsTrigger>
          </TabsList>
          {activeTab === 'prospection' && (
            <Button onClick={() => setIsCreateProspectDialogOpen(true)}>
              Créer un prospect
            </Button>
          )}
        </div>

        <TabsContent value="clients" className="space-y-4">
                  {isLoadingProjects ? (
                    <div>Chargement des espaces clients...</div>
                  ) : projects.length === 0 ? (
                    <div>Aucun espace client</div>
                  ) : (
                    <div className="grid gap-4">
                    {projects.map((project) => (
                      <Card key={project.id} className="glass-glow hover:shadow-glow transition-all duration-300">
                        <CardHeader>
                          <CardTitle className="text-lg">{project.spaceName}</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            {project.description}
                          </p>
                          <div className="flex items-center justify-between pt-2 gap-2">
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                onClick={() => navigate(`/client-space/${project.id}`)}
                                className="gap-2"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Ouvrir l’espace
                              </Button>
                              {project.driveLink && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  asChild
                                >
                                  <a href={project.driveLink} target="_blank" rel="noopener noreferrer">
                                    <FileText className="w-4 h-4" />
                                    Fichiers
                                  </a>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setMilestonesProject(project)}
                                className="gap-2"
                              >
                                <Target className="w-4 h-4" />
                                Jalons
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setInvoicesProject(project)}
                                className="gap-2"
                              >
                                <Euro className="w-4 h-4" />
                                Factures
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProject(project);
                                  setShareDialogOpen(true);
                                }}
                                className="gap-2"
                              >
                                <Share2 className="w-4 h-4" />
                                Partager
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleProjectSummary(project)}
                                className="gap-2"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Analyse IA
                              </Button>
                            </div>
                            {project.price > 0 && (
                              <div className="text-lg font-bold whitespace-nowrap ml-auto">
                                {project.price}€
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  )}
                </TabsContent>

        <TabsContent value="prospection" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
            </div>
            <Button onClick={() => setIsCreateProspectDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau prospect
            </Button>
          </div>
          <Tabs defaultValue="list" className="space-y-4">
                    <TabsList className="w-fit">
                      <TabsTrigger value="list">Liste</TabsTrigger>
                      <TabsTrigger value="kanban">Kanban</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="grid gap-4">
                      {prospects.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground">
                          Aucun prospect trouvé.
                        </p>
                      ) : (
                        prospects.map((prospect) => (
                          <Card key={prospect.id} className="glass-glow hover:shadow-glow transition-all duration-300">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-lg">{prospect.name}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                  {prospect.status && (
                                    <span className="text-sm text-muted-foreground">
                                      {prospect.status}
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingProspect(prospect);
                                      setIsEditProspectDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (confirm('Supprimer ce prospect ?')) {
                                        handleDeleteProspect(prospect.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4 text-sm">
                              <div className="flex justify-between">
                                <span>Email</span>
                                <span className="font-medium">{prospect.email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Téléphone</span>
                                <span className="font-medium">{prospect.phone}</span>
                              </div>
                              <div className="flex gap-2 pt-2 flex-wrap">
                                {prospect.email && (
                                  <Button size="sm" className="gap-2" asChild>
                                    <a href={`mailto:${prospect.email}`}>
                                      <Mail className="w-4 h-4" />
                                      Contacter
                                    </a>
                                  </Button>
                                )}
                                {prospect.phone && (
                                  <Button size="sm" variant="secondary" className="gap-2" asChild>
                                    <a href={`tel:${prospect.phone}`}>
                                      <Phone className="w-4 h-4" />
                                      Appeler
                                    </a>
                                  </Button>
                                )}
                              </div>

                            </CardContent>
                          </Card>
                        ))
                      )}
                      {hasMoreProspects && (
                        <div className="flex justify-center">
                          <Button onClick={loadProspects} disabled={isLoadingProspects}>
                            {isLoadingProspects ? 'Chargement...' : 'Charger plus'}
                          </Button>
                        </div>
                      )}
                    </TabsContent>

            <TabsContent value="kanban">
              {prospects.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Aucun prospect trouvé.
                </p>
              ) : (
                <>
                  <ProspectKanban
                    prospects={prospects}
                    setProspects={setProspects}
                    onCreateSpace={(prospect) => setSpaceProspect(prospect)}
                  />
                  {hasMoreProspects && (
                    <div className="flex justify-center mt-4">
                      <Button onClick={loadProspects} disabled={isLoadingProspects}>
                        {isLoadingProspects ? 'Chargement...' : 'Charger plus'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      <Dialog open={isCreateProspectDialogOpen} onOpenChange={setIsCreateProspectDialogOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Créer un prospect</DialogTitle>
          </DialogHeader>
          <ProspectForm
            onCancel={() => setIsCreateProspectDialogOpen(false)}
            onSubmit={addProspect}
            submitLabel="Créer"
          />
        </DialogContent>
      </Dialog>
      {editingProspect && (
        <Dialog
          open={isEditProspectDialogOpen}
          onOpenChange={(open) => {
            setIsEditProspectDialogOpen(open);
            if (!open) setEditingProspect(null);
          }}
        >
          <DialogContent className="sm:max-w-[340px]">
            <DialogHeader>
              <DialogTitle>Modifier le prospect</DialogTitle>
            </DialogHeader>
            <ProspectForm
              initialData={editingProspect}
              onCancel={() => setIsEditProspectDialogOpen(false)}
              onSubmit={(data) => handleEditProspect({ ...editingProspect, ...data })}
              submitLabel="Mettre à jour"
            />
          </DialogContent>
        </Dialog>
      )}
      {spaceProspect && (
        <ProspectCreateSpaceDialog
          prospect={spaceProspect}
          open={true}
          onOpenChange={open => {
            if (!open) setSpaceProspect(null);
          }}
          onCreated={() => setSpaceProspect(null)}
        />
      )}
      {selectedProject && (
        <ClientShareDialog
          isOpen={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          spaceId={selectedProject.id}
          spaceName={selectedProject.spaceName}
        />
      )}
      {milestonesProject && (
        <Dialog open={true} onOpenChange={(open) => !open && setMilestonesProject(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Jalons - {milestonesProject.spaceName}</DialogTitle>
            </DialogHeader>
            <MilestoneManager
              projetId={milestonesProject.id}
              onDataChange={() => refreshProjectData(milestonesProject.id)}
            />
          </DialogContent>
        </Dialog>
      )}
      {invoicesProject && (
        <Dialog open={true} onOpenChange={(open) => !open && setInvoicesProject(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Factures - {invoicesProject.spaceName}</DialogTitle>
            </DialogHeader>
            <NocoInvoiceManager
              projetId={invoicesProject.id}
              onDataChange={() => refreshProjectData(invoicesProject.id)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Pipou;
