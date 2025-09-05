import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Euro, Settings, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface ProjectInvestmentManagerProps {
  spaceId: string;
}

const ProjectInvestmentManager = ({ spaceId }: ProjectInvestmentManagerProps) => {
  const { toast } = useToast();
  const [currentInvestment, setCurrentInvestment] = useState(0);
  const [newInvestment, setNewInvestment] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, unknown>>({});

  // Charger l'investissement actuel du projet
  useEffect(() => {
    const loadProjectInvestment = async () => {
      try {
        console.log('🔍 Loading investment for space:', spaceId);
        const client = await nocodbService.getClientByIdPublic(spaceId, true);
        console.log('📊 Client data received:', client);

        const parsedNotes: Record<string, unknown> =
          typeof client?.notes === 'string'
            ? JSON.parse(client.notes)
            : (client?.notes || {});
        setNotes(parsedNotes);

        const rawInvestment =
          (parsedNotes.projectInvestment as unknown) ??
          (parsedNotes.investissement_projet as unknown) ??
          client?.coqh9knygkxr52k;

        const investment = Number(
          typeof rawInvestment === 'string'
            ? rawInvestment.replace(',', '.')
            : rawInvestment
        ) || 0;

        console.log('✅ Parsed investment amount:', investment);
        setCurrentInvestment(investment);
        setNewInvestment(investment.toString());
      } catch (error) {
        console.error('❌ Erreur chargement investissement projet:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (spaceId) {
      loadProjectInvestment();
    }
  }, [spaceId]);

  // Sauvegarder l'investissement
  const handleSaveInvestment = async () => {
    try {
      const amount = Math.max(
        0,
        Number((newInvestment || '0').toString().replace(',', '.')) || 0
      );

      const updatedNotes = {
        ...notes,
        projectInvestment: amount,
        investissement_projet: amount
      } as Record<string, unknown>;

      await nocodbService.updateClient(spaceId, {
        coqh9knygkxr52k: amount,
        notes: JSON.stringify(updatedNotes)
      });

      setCurrentInvestment(amount);
      setNotes(updatedNotes);
      setIsDialogOpen(false);
      
      toast({
        title: "Investissement mis à jour",
        description: `Montant défini à ${amount.toFixed(2)}€`
      });
    } catch (error) {
      console.error('Erreur sauvegarde investissement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'investissement",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-glow">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-glow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Euro className="w-4 h-4" />
          Investissement projet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Montant investi</p>
            <p className="text-xl font-bold text-primary">
              {currentInvestment.toFixed(2)}€
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="w-3 h-3" />
                Modifier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier l'investissement projet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="investment">Montant investi (€)</Label>
                  <Input
                    id="investment"
                    type="number"
                    value={newInvestment}
                    onChange={(e) => setNewInvestment(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Montant total investi pour ce projet spécifique
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveInvestment} className="flex-1 gap-2">
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          Pris en compte dans le calcul des marges globales
        </p>
      </CardContent>
    </Card>
  );
};

export default ProjectInvestmentManager;