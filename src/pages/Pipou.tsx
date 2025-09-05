import { useState, useEffect, useCallback } from 'react';
import { Users, MessageCircle, FileText, Share2, ExternalLink, Edit, Trash2, Mail, Phone, Target, Euro } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import nocodbService from '@/services/nocodbService';
import ClientShareDialog from '@/components/client/ClientShareDialog';
import ProspectKanban from '@/components/prospection/ProspectKanban';
import { Prospect } from '@/types/prospect';
import { mapProspectStatus, mapProspectStatusToNoco } from '@/lib/prospectStatus';
import MilestoneManager from '@/components/milestones/MilestoneManager';
import NocoInvoiceManager from '@/components/invoices/NocoInvoiceManager';

type NocoRecord = Record<string, unknown>;

const PROSPECT_COMPANY_COLUMN = 'cxi03jrd1enf3n2';
const PROSPECT_PHONE_COLUMN = 'ch2fw3p077t9y6w';
const PROSPECT_SITE_COLUMN = 'coo7e2wbo6zvvux';

const normalizeKey = (key: string) =>
  key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const FIELD_KEYS = {
  company: [PROSPECT_COMPANY_COLUMN, 'entreprise', 'Entreprise', 'company'],
  phone: [PROSPECT_PHONE_COLUMN, 'telephone', 'Téléphone', 'numero', 'phone'],
  website: [
    PROSPECT_SITE_COLUMN,
    'site',
    'site_web',
    'Réseaux / Site',
    'reseaux',
    'reseaux_site',
    'website',
    'lien',
    'liens',
    'link',
    'links',
    'url'
    'website'
  ]
} as const;

const getFieldValue = (
  record: Record<string, unknown>,
  keys: readonly string[]
) => {
  const normalized = Object.keys(record).reduce<Record<string, string>>((acc, k) => {
    acc[normalizeKey(k)] = k;
    return acc;
  }, {});
  for (const key of keys) {
    const nk = normalizeKey(key);
    if (normalized[nk]) {
      const value = record[normalized[nk]];
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) {
        const first = value[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object' && 'url' in first) {
          const url = (first as { url?: unknown }).url;
          if (typeof url === 'string') return url;
        }
      }
      if (value && typeof value === 'object' && 'url' in value) {
        const url = (value as { url?: unknown }).url;
        if (typeof url === 'string') return url;
      }
    if (normalized[nk] && typeof record[normalized[nk]] === 'string') {
      return record[normalized[nk]] as string;
    }
  }
  return '';
};

const buildProspectPayload = (p: {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  status: string;
  lastContact: string;
}) => {
  const payload: Record<string, string> = {
    name: p.name,
    email: p.email,
    status: mapProspectStatusToNoco(p.status),
    dernier_contact: p.lastContact
  };
  FIELD_KEYS.company.forEach(key => (payload[key] = p.company));
  FIELD_KEYS.phone.forEach(key => (payload[key] = p.phone));
  FIELD_KEYS.website.forEach(key => (payload[key] = p.website));
  return payload;
};

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

  // Vérifier l'accès aux assistants IA
  useEffect(() => {
    if (!loading && !hasFeatureAccess('hasAIAssistants')) {
      upgradeRequired();
      navigate('/dashboard');
    }
  }, [hasFeatureAccess, upgradeRequired, navigate, loading]);
  // Projets chargés depuis NocoDB
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestonesProject, setMilestonesProject] = useState<Project | null>(null);
  const [invoicesProject, setInvoicesProject] = useState<Project | null>(null);

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
  const [newProspect, setNewProspect] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    website: ''
  });
  const [isCreateProspectDialogOpen, setIsCreateProspectDialogOpen] = useState(false);
  const [isEditProspectDialogOpen, setIsEditProspectDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [activeTab, setActiveTab] = useState('clients');

  const loadProspects = useCallback(async () => {
    setIsLoadingProspects(true);
    try {
      const response = await nocodbService.getProspects(
        PROSPECTS_PAGE_SIZE,
        prospectOffset
      );
      const list = (response.list || []).map((p: Record<string, unknown>) => ({
        id: ((p as { Id?: unknown; id?: unknown }).Id || (p as { Id?: unknown; id?: unknown }).id || '').toString(),
        name: (p as { name?: string }).name || '',
        company: getFieldValue(p, FIELD_KEYS.company),
        email: (p as { email?: string }).email || '',
        phone: getFieldValue(p, FIELD_KEYS.phone),
        website: getFieldValue(p, FIELD_KEYS.website),
        status: mapProspectStatus((p as { status?: string }).status || 'nouveau'),
        lastContact:
          getFieldValue(p, ['lastContact', 'dernier_contact']) || ''
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

  const addProspect = async () => {
    if (!newProspect.name || !newProspect.company) return;
    try {
      const payload = buildProspectPayload({
        ...newProspect,
        status: 'Nouveau',
        lastContact: new Date().toISOString().split('T')[0]
      });
      const response = (await nocodbService.createProspect(payload)) as Record<string, unknown>;
      const created: Prospect = {
        id: ((response as { Id?: unknown; id?: unknown }).Id || (response as { Id?: unknown; id?: unknown }).id || '').toString(),
        name: (response as { name?: string }).name || newProspect.name,
        company: getFieldValue(response, FIELD_KEYS.company) || newProspect.company,
        email: (response as { email?: string }).email || newProspect.email,
        phone: getFieldValue(response, FIELD_KEYS.phone) || newProspect.phone,
        website: getFieldValue(response, FIELD_KEYS.website) || newProspect.website,
        status: mapProspectStatus((response as { status?: string }).status || 'nouveau'),
        lastContact:
          getFieldValue(response, ['lastContact', 'dernier_contact']) || payload.dernier_contact
      };
      setProspects(prev => [...prev, created]);
      setProspectOffset(prev => prev + 1);
      setNewProspect({ name: '', company: '', email: '', phone: '', website: '' });
      setIsCreateProspectDialogOpen(false);
    } catch (error) {
      console.error('Erreur création prospect:', error);
    }
  };

  const handleEditProspect = async () => {
    if (!editingProspect || !editingProspect.id) return;
    const id = editingProspect.id;
    const previous = prospects.find(p => p.id === id);

    // Mise à jour optimiste
    setProspects(prev => prev.map(p => (p.id === id ? editingProspect : p)));
    setIsEditProspectDialogOpen(false);
    setEditingProspect(null);

    try {
      await nocodbService.updateProspect(
        id,
        buildProspectPayload(editingProspect)
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
                          <div className="flex gap-2 pt-2 flex-wrap">
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  )}
                </TabsContent>

        <TabsContent value="prospection" className="space-y-4">
          <Tabs defaultValue="list" className="space-y-4">
                    <TabsList className="w-fit">
                      <TabsTrigger value="list">Liste</TabsTrigger>
                      <TabsTrigger value="kanban">Kanban</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="grid gap-4">
                      {prospects.map((prospect) => (
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
                      ))}
                      {hasMoreProspects && (
                        <div className="flex justify-center">
                          <Button onClick={loadProspects} disabled={isLoadingProspects}>
                            {isLoadingProspects ? 'Chargement...' : 'Charger plus'}
                          </Button>
                        </div>
                      )}
                    </TabsContent>

            <TabsContent value="kanban">
              <ProspectKanban
                prospects={prospects}
                setProspects={setProspects}
                onEdit={(prospect) => {
                  setEditingProspect(prospect);
                  setIsEditProspectDialogOpen(true);
                }}
                onDelete={(id) => {
                  if (confirm('Supprimer ce prospect ?')) {
                    handleDeleteProspect(id);
                  }
                }}
              />
              {hasMoreProspects && (
                <div className="flex justify-center mt-4">
                  <Button onClick={loadProspects} disabled={isLoadingProspects}>
                    {isLoadingProspects ? 'Chargement...' : 'Charger plus'}
                  </Button>
                </div>
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
          <div className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="new-prospect-name">Nom</Label>
              <Input
                id="new-prospect-name"
                value={newProspect.name}
                onChange={(e) => setNewProspect({ ...newProspect, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-prospect-company">Entreprise</Label>
              <Input
                id="new-prospect-company"
                value={newProspect.company}
                onChange={(e) => setNewProspect({ ...newProspect, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-prospect-email">Email</Label>
              <Input
                id="new-prospect-email"
                type="email"
                value={newProspect.email}
                onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-prospect-phone">Téléphone</Label>
              <Input
                id="new-prospect-phone"
                value={newProspect.phone}
                onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-prospect-website">Réseaux / Site</Label>
              <Input
                id="new-prospect-website"
                value={newProspect.website}
                onChange={(e) => setNewProspect({ ...newProspect, website: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsCreateProspectDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={addProspect}>Créer</Button>
          </div>
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
            <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="edit-prospect-name">Nom</Label>
                <Input
                  id="edit-prospect-name"
                  value={editingProspect.name}
                  onChange={(e) => setEditingProspect({ ...editingProspect, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prospect-company">Entreprise</Label>
                <Input
                  id="edit-prospect-company"
                  value={editingProspect.company}
                  onChange={(e) => setEditingProspect({ ...editingProspect, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prospect-email">Email</Label>
                <Input
                  id="edit-prospect-email"
                  type="email"
                  value={editingProspect.email}
                  onChange={(e) => setEditingProspect({ ...editingProspect, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prospect-phone">Téléphone</Label>
                <Input
                  id="edit-prospect-phone"
                  value={editingProspect.phone}
                  onChange={(e) => setEditingProspect({ ...editingProspect, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prospect-website">Réseaux / Site</Label>
                <Input
                  id="edit-prospect-website"
                  value={editingProspect.website}
                  onChange={(e) => setEditingProspect({ ...editingProspect, website: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsEditProspectDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditProspect}>Mettre à jour</Button>
            </div>
          </DialogContent>
        </Dialog>
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
