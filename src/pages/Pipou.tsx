import { useState, useEffect, useCallback } from 'react';
import { Users, MessageCircle, FileText, Share2, ExternalLink, Euro, Plus } from 'lucide-react';
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
import ProspectList from '@/components/prospection/ProspectList';
import { ProspectDialog } from '@/components/prospection/ProspectDialog';
import { Prospect } from '@/types/prospect';
import MilestoneManager from '@/components/milestones/MilestoneManager';
import NocoInvoiceManager from '@/components/invoices/NocoInvoiceManager';
import ProspectCreateSpaceDialog from '@/components/prospection/ProspectCreateSpaceDialog';
import { useProspectCache } from '@/hooks/useProspectCache';
import ProspectStats from '@/components/prospection/ProspectStats';

type NocoRecord = Record<string, unknown>;

interface Project {
  id: string;
  projectId: string;
  client: string;
  spaceName: string;
  status: string;
  deadline: string;
  progress: number;
  description: string;
  driveLink: string;
  price: number;
}

const Pipou = () => {
  const { hasFeatureAccess, upgradeRequired, loading } = usePlan();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestonesProject, setMilestonesProject] = useState<Project | null>(null);
  const [invoicesProject, setInvoicesProject] = useState<Project | null>(null);

  const loadProjects = useCallback(
    async (forceRefresh = false) => {
      try {
        const clientsRes = await nocodbService.getClients(forceRefresh);
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
    },
    []
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const {
    prospects,
    isLoading: isLoadingProspects,
    hasMore: hasMoreProspects,
    loadProspects,
    createProspect,
    updateProspect,
    deleteProspect,
    updateProspectStatus
  } = useProspectCache();

  const [activeTab, setActiveTab] = useState('clients');
  const [spaceProspect, setSpaceProspect] = useState<Prospect | null>(null);
  const [prospectView, setProspectView] = useState<'kanban' | 'list'>('list');
  const [prospectDialogOpen, setProspectDialogOpen] = useState(false);
  const [prospectDialogMode, setProspectDialogMode] = useState<'create' | 'edit'>('create');
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  useEffect(() => {
    if (activeTab === 'prospection' && prospects.length === 0) {
      loadProspects();
    }
  }, [activeTab]);

  const handleOpenCreateDialog = () => {
    setEditingProspect(null);
    setProspectDialogMode('create');
    setProspectDialogOpen(true);
  };

  const handleOpenEditDialog = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setProspectDialogMode('edit');
    setProspectDialogOpen(true);
  };

  const handleProspectSubmit = async (data: Partial<Prospect>) => {
    if (prospectDialogMode === 'create') {
      await createProspect(data);
    } else if (editingProspect) {
      await updateProspect(editingProspect.id, data);
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
            <Button onClick={handleOpenCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau prospect
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
                                Ouvrir l'espace
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
                                <Euro className="w-4 h-4" />
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
          <ProspectStats prospects={prospects} />
          
          <div className="flex items-center justify-between mb-4">
            <ToggleGroup type="single" value={prospectView} onValueChange={(value) => setProspectView(value as 'kanban' | 'list')}>
              <ToggleGroupItem value="list" aria-label="Vue liste">
                Liste
              </ToggleGroupItem>
              <ToggleGroupItem value="kanban" aria-label="Vue kanban">
                Kanban
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {prospectView === 'list' ? (
            <ProspectList
              prospects={prospects}
              isLoading={isLoadingProspects}
              onEdit={handleOpenEditDialog}
              onDelete={(id) => {
                if (confirm('Supprimer ce prospect ?')) {
                  deleteProspect(id);
                }
              }}
              onCreateSpace={(prospect) => setSpaceProspect(prospect)}
              onLoadMore={() => loadProspects()}
              hasMore={hasMoreProspects}
            />
          ) : (
            <ProspectKanban
              prospects={prospects}
              onUpdateProspect={updateProspectStatus}
              onEdit={handleOpenEditDialog}
              onCreateSpace={(prospect) => setSpaceProspect(prospect)}
            />
          )}

          {hasMoreProspects && prospectView === 'kanban' && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => loadProspects()}
                disabled={isLoadingProspects}
              >
                {isLoadingProspects ? 'Chargement...' : 'Plus de prospects disponibles'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProspectDialog
        open={prospectDialogOpen}
        onOpenChange={setProspectDialogOpen}
        prospect={editingProspect}
        onSubmit={handleProspectSubmit}
        mode={prospectDialogMode}
      />

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
