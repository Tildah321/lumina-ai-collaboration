import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CollaboratorManager from '@/components/collaboration/CollaboratorManager';
import { Users, UserPlus, Share2 } from 'lucide-react';

const Collaboration = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Collaboration</h1>
        <p className="text-muted-foreground">
          Gérez vos collaborateurs et partagez l'accès à vos espaces clients
        </p>
      </div>

      <Tabs defaultValue="collaborators" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="collaborators" className="gap-2">
            <Users className="w-4 h-4" />
            Collaborateurs
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <Share2 className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collaborators" className="space-y-6">
          <CollaboratorManager />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Collaborateurs actifs
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Collaborateurs ayant accepté l'invitation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Invitations en attente
                </CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Invitations non encore acceptées
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Espaces partagés
                </CardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Espaces clients avec accès partagé
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Comment fonctionne la collaboration ?</CardTitle>
              <CardDescription>
                Découvrez les fonctionnalités de collaboration disponibles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <UserPlus className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Inviter des collaborateurs</h4>
                    <p className="text-sm text-muted-foreground">
                      Invitez vos collègues par email pour qu'ils puissent vous aider à gérer vos projets clients.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Share2 className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Partager l'accès aux espaces</h4>
                    <p className="text-sm text-muted-foreground">
                      Accordez des permissions spécifiques (lecture, écriture, administration) pour chaque espace client.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Travail en équipe</h4>
                    <p className="text-sm text-muted-foreground">
                      Vos collaborateurs peuvent voir et gérer les tâches, jalons et factures selon leurs permissions.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Collaboration;