import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, LayoutList, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import nocodbService from '@/services/nocodbService';
import ProspectList from '@/components/prospection/ProspectList';
import ProspectKanban from '@/components/prospection/ProspectKanban';
import { ProspectDialog } from '@/components/prospection/ProspectDialog';
import ProspectCreateSpaceDialog from '@/components/prospection/ProspectCreateSpaceDialog';
import { Prospect } from '@/types/prospect';
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

const CollaboratorCRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<CollaboratorSession | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'kanban'>('list');
  const [branding, setBranding] = useState<BrandingSettings>({});
  const [inviterUserId, setInviterUserId] = useState<string | null>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('collaborator_session');
    if (!sessionData) {
      navigate('/');
      return;
    }

    const loadCollaboratorData = async () => {
      try {
        const parsedSession = JSON.parse(sessionData);
        
        const { data: collaboratorData, error } = await supabase
          .from('collaborators')
          .select('*')
          .eq('invitation_token', parsedSession.invitation_token)
          .single();
        
        if (!error && collaboratorData) {
          if (!collaboratorData.has_crm_access) {
            toast({
              title: "Accès refusé",
              description: "Vous n'avez pas accès au CRM",
              variant: "destructive"
            });
            navigate('/collaboration-dashboard');
            return;
          }

          const fullSession = {
            ...parsedSession,
            has_crm_access: collaboratorData.has_crm_access
          };
          setSession(fullSession);
          setInviterUserId(collaboratorData.invited_by);
          loadBrandingData(collaboratorData.invited_by);
          loadProspects(collaboratorData.invited_by);
        } else {
          navigate('/collaboration-dashboard');
        }
      } catch (error) {
        console.error('Erreur lors du parsing de la session:', error);
        localStorage.removeItem('collaborator_session');
        navigate('/');
      }
    };
    
    loadCollaboratorData();
  }, [navigate, toast]);

  const loadBrandingData = async (userId: string) => {
    try {
      const brandingData = await getBrandingForUser(userId);
      setBranding(brandingData);
      applyBranding(brandingData);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du branding:', error);
    }
  };

  const loadProspects = async (userId: string) => {
    setIsLoadingProspects(true);
    try {
      console.log('🔄 Chargement des prospects...');
      const response = await nocodbService.getProspects(1000, 0, true);
      console.log('📊 Réponse NocoDB:', response);
      const list = response.list || [];
      console.log('📋 Nombre de prospects:', list.length);
      
      const mappedProspects = list.map((p: any) => {
        console.log('🔍 Prospect brut:', p);
        return {
          id: p.Id?.toString() || p.id?.toString() || '',
          name: p.nom || p.name || '',
          company: p.entreprise || p.company || '',
          email: p.email || '',
          phone: p.telephone || p.phone || '',
          website: p.site_web || p.website || '',
          reseaux: p.cyr48yof0ean2dq || p.reseaux || '',
          prix: p.csfu3bqetc3s1tz || p.prix || '',
          status: p.statut || p.status || 'Nouveau',
          lastContact: p.dernier_contact || p.lastContact || null
        };
      });
      
      console.log('✅ Prospects mappés:', mappedProspects);
      setProspects(mappedProspects);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des prospects:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les prospects",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProspects(false);
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

  const handleEditProspect = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsDialogOpen(true);
  };

  const handleCreateSpace = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsCreateSpaceOpen(true);
  };

  const handleUpdateProspect = async (id: string, status: string) => {
    if (!inviterUserId) return;
    
    try {
      await nocodbService.updateProspect(id, { status });
      await loadProspects(inviterUserId);
      toast({
        title: "Statut mis à jour",
        description: "Le statut du prospect a été modifié avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProspect = async (id: string) => {
    if (!inviterUserId) return;
    
    try {
      await nocodbService.deleteProspect(id);
      await loadProspects(inviterUserId);
      toast({
        title: "Prospect supprimé",
        description: "Le prospect a été supprimé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le prospect",
        variant: "destructive"
      });
    }
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
      <header className="border-b bg-card sticky top-0 z-50">
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
                    CRM Prospection {branding.brandName ? `- ${branding.brandName}` : ''}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Connecté en tant que {session.name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/collaboration-dashboard')} className="gap-2">
                Retour au tableau de bord
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
        <Card>
          <CardHeader>
            <CardTitle>Gestion des Prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'list' | 'kanban')}>
              <TabsList className="mb-4">
                <TabsTrigger value="list" className="gap-2">
                  <LayoutList className="w-4 h-4" />
                  Vue Liste
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Vue Kanban
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="list">
                <ProspectList
                  prospects={prospects}
                  isLoading={isLoadingProspects}
                  onEdit={handleEditProspect}
                  onDelete={handleDeleteProspect}
                  onCreateSpace={handleCreateSpace}
                />
              </TabsContent>
              
              <TabsContent value="kanban">
                <ProspectKanban
                  prospects={prospects}
                  onUpdateProspect={handleUpdateProspect}
                  onCreateSpace={handleCreateSpace}
                  onEdit={handleEditProspect}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <ProspectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        prospect={selectedProspect}
        mode={selectedProspect ? 'edit' : 'create'}
        onSubmit={async (data) => {
          try {
            if (selectedProspect) {
              await nocodbService.updateProspect(selectedProspect.id, data);
            } else {
              await nocodbService.createProspect(data);
            }
            if (inviterUserId) await loadProspects(inviterUserId);
            toast({
              title: "Succès",
              description: selectedProspect ? "Prospect mis à jour" : "Prospect créé"
            });
          } catch (error) {
            toast({
              title: "Erreur",
              description: "Impossible de sauvegarder le prospect",
              variant: "destructive"
            });
            throw error;
          }
        }}
      />

      <ProspectCreateSpaceDialog
        open={isCreateSpaceOpen}
        onOpenChange={setIsCreateSpaceOpen}
        prospect={selectedProspect}
      />
    </div>
  );
};

export default CollaboratorCRM;
