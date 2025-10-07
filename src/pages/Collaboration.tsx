import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CollaboratorManager from '@/components/collaboration/CollaboratorManager';
import Overview from '../components/collaboration/Overview';
import { Users, UserPlus, BarChart } from 'lucide-react';

const Collaboration = () => {
  return (
    <>
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
            <BarChart className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collaborators" className="space-y-6">
          <CollaboratorManager />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <Overview />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Collaboration;