import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Euro, TrendingUp, TrendingDown, Calculator, Settings, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGlobalStats } from '@/hooks/useGlobalStats';

interface Investment {
  id: string;
  type: 'monthly' | 'project';
  amount: number;
  description: string;
  projectId?: string;
  projectName?: string;
  date: string;
}

interface MarginData {
  totalRevenue: number;
  paidRevenue: number;
  monthlyInvestments: number;
  projectInvestments: number;
  totalInvestments: number;
  grossMargin: number;
  netMargin: number;
  marginPercentage: number;
}

const MarginManager = () => {
  const { toast } = useToast();
  const globalStats = useGlobalStats();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [monthlyInvestment, setMonthlyInvestment] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  
  // Formulaire pour nouveau/édition investissement
  const [formData, setFormData] = useState({
    type: 'monthly' as 'monthly' | 'project',
    amount: '',
    description: '',
    projectId: '',
    projectName: ''
  });

  // Charger les données depuis localStorage
  useEffect(() => {
    const savedInvestments = localStorage.getItem('investments');
    const savedMonthlyInvestment = localStorage.getItem('monthlyInvestment');
    
    if (savedInvestments) {
      setInvestments(JSON.parse(savedInvestments));
    }
    if (savedMonthlyInvestment) {
      setMonthlyInvestment(Number(savedMonthlyInvestment));
    }
  }, []);

  // Sauvegarder les investissements
  const saveInvestments = (newInvestments: Investment[]) => {
    setInvestments(newInvestments);
    localStorage.setItem('investments', JSON.stringify(newInvestments));
  };

  // Sauvegarder l'investissement mensuel
  const saveMonthlyInvestment = (amount: number) => {
    setMonthlyInvestment(amount);
    localStorage.setItem('monthlyInvestment', amount.toString());
  };

  // Calculer les marges
  const calculateMarginData = (): MarginData => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Investissements du mois en cours
    const currentMonthInvestments = investments.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    });

    const monthlyInvestments = monthlyInvestment;
    const projectInvestments = currentMonthInvestments
      .filter(inv => inv.type === 'project')
      .reduce((acc, inv) => acc + inv.amount, 0);
    
    const totalInvestments = monthlyInvestments + projectInvestments;
    const grossMargin = globalStats.paidRevenue - totalInvestments;
    const netMargin = grossMargin;
    const marginPercentage = globalStats.totalRevenue > 0 ? (netMargin / globalStats.totalRevenue) * 100 : 0;

    return {
      totalRevenue: globalStats.totalRevenue,
      paidRevenue: globalStats.paidRevenue,
      monthlyInvestments,
      projectInvestments,
      totalInvestments,
      grossMargin,
      netMargin,
      marginPercentage
    };
  };

  const marginData = calculateMarginData();

  // Ajouter/modifier un investissement
  const handleSubmitInvestment = () => {
    if (!formData.amount || !formData.description) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const investment: Investment = {
      id: editingInvestment?.id || Date.now().toString(),
      type: formData.type,
      amount: Number(formData.amount),
      description: formData.description,
      projectId: formData.projectId || undefined,
      projectName: formData.projectName || undefined,
      date: editingInvestment?.date || new Date().toISOString()
    };

    let newInvestments;
    if (editingInvestment) {
      newInvestments = investments.map(inv => 
        inv.id === editingInvestment.id ? investment : inv
      );
      toast({
        title: "Investissement modifié",
        description: "L'investissement a été mis à jour avec succès"
      });
    } else {
      newInvestments = [...investments, investment];
      toast({
        title: "Investissement ajouté",
        description: "Le nouvel investissement a été enregistré"
      });
    }

    saveInvestments(newInvestments);
    setIsDialogOpen(false);
    resetForm();
  };

  // Supprimer un investissement
  const handleDeleteInvestment = (id: string) => {
    const newInvestments = investments.filter(inv => inv.id !== id);
    saveInvestments(newInvestments);
    toast({
      title: "Investissement supprimé",
      description: "L'investissement a été supprimé avec succès"
    });
  };

  // Modifier un investissement
  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormData({
      type: investment.type,
      amount: investment.amount.toString(),
      description: investment.description,
      projectId: investment.projectId || '',
      projectName: investment.projectName || ''
    });
    setIsDialogOpen(true);
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setEditingInvestment(null);
    setFormData({
      type: 'monthly',
      amount: '',
      description: '',
      projectId: '',
      projectName: ''
    });
  };

  // Mettre à jour l'investissement mensuel
  const handleMonthlyInvestmentChange = (value: string) => {
    const amount = Number(value) || 0;
    saveMonthlyInvestment(amount);
  };

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble des marges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-primary">{marginData.totalRevenue.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground">Payé: {marginData.paidRevenue.toFixed(2)}€</p>
              </div>
              <Euro className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Investissements</p>
                <p className="text-2xl font-bold text-destructive">{marginData.totalInvestments.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground">Mensuel: {marginData.monthlyInvestments}€</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marge nette</p>
                <p className={`text-2xl font-bold ${marginData.netMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {marginData.netMargin.toFixed(2)}€
                </p>
                <p className="text-xs text-muted-foreground">{marginData.marginPercentage.toFixed(1)}%</p>
              </div>
              <TrendingUp className={`h-8 w-8 ${marginData.netMargin >= 0 ? 'text-success/60' : 'text-destructive/60'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance</p>
                <Badge variant={marginData.marginPercentage >= 20 ? "default" : marginData.marginPercentage >= 10 ? "secondary" : "destructive"}>
                  {marginData.marginPercentage >= 20 ? "Excellente" : marginData.marginPercentage >= 10 ? "Bonne" : "À améliorer"}
                </Badge>
              </div>
              <Calculator className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration et gestion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration investissement mensuel */}
        <Card className="glass-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Investissement mensuel fixe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="monthlyAmount">Montant mensuel (€)</Label>
              <Input
                id="monthlyAmount"
                type="number"
                value={monthlyInvestment}
                onChange={(e) => handleMonthlyInvestmentChange(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Charges fixes mensuelles (loyer, salaires, etc.)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ajouter investissement par projet */}
        <Card className="glass-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Investissements par projet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un investissement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingInvestment ? 'Modifier l\'investissement' : 'Nouvel investissement'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Tabs value={formData.type} onValueChange={(value) => setFormData({...formData, type: value as 'monthly' | 'project'})}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="monthly">Mensuel</TabsTrigger>
                      <TabsTrigger value="project">Par projet</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div>
                    <Label htmlFor="amount">Montant (€)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Description de l'investissement"
                    />
                  </div>

                  {formData.type === 'project' && (
                    <div>
                      <Label htmlFor="projectName">Nom du projet (optionnel)</Label>
                      <Input
                        id="projectName"
                        value={formData.projectName}
                        onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                        placeholder="Nom du projet associé"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleSubmitInvestment} className="flex-1">
                      {editingInvestment ? 'Modifier' : 'Ajouter'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Liste des investissements */}
      <Card className="glass-glow">
        <CardHeader>
          <CardTitle>Historique des investissements</CardTitle>
        </CardHeader>
        <CardContent>
          {investments.length > 0 ? (
            <div className="space-y-3">
              {investments.map((investment) => (
                <div key={investment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={investment.type === 'monthly' ? 'default' : 'secondary'}>
                        {investment.type === 'monthly' ? 'Mensuel' : 'Projet'}
                      </Badge>
                      <span className="font-medium">{investment.description}</span>
                    </div>
                    {investment.projectName && (
                      <p className="text-sm text-muted-foreground">Projet: {investment.projectName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(investment.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-destructive">{investment.amount.toFixed(2)}€</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditInvestment(investment)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteInvestment(investment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Aucun investissement enregistré
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarginManager;