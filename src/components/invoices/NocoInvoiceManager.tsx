import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ExternalLink, Calendar, Euro } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface NocoInvoice {
  Id1?: number;
  id: string;
  projet_id: string;
  lien_facture: string;
  montant: number;
  date_emission: string;
  payée: boolean;
  date_paiement?: string;
}

interface NocoInvoiceManagerProps {
  projetId: string;
  isClient?: boolean;
  onDataChange?: () => void; // Callback pour notifier les changements
}

const NocoInvoiceManager = ({ projetId, isClient = false, onDataChange }: NocoInvoiceManagerProps) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<NocoInvoice[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<NocoInvoice | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    lien_facture: '',
    montant: 0,
    date_emission: new Date().toISOString().split('T')[0],
    payée: false,
    date_paiement: ''
  });

  // Charger les factures depuis NocoDB
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const response = await nocodbService.getInvoices(projetId);
        const invoicesWithIds = (response.list || []).map((invoice: any) => ({
          ...invoice,
          id: invoice.Id || invoice.id,
          payée: invoice.payée === 'true' || invoice.payée === true
        }));
        setInvoices(invoicesWithIds);
      } catch (error) {
        console.error('Erreur lors du chargement des factures:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les factures",
          variant: "destructive"
        });
      }
    };

    loadInvoices();
  }, [projetId, toast]);

  // Créer une facture
  const handleCreateInvoice = async () => {
    if (!newInvoice.lien_facture.trim() || newInvoice.montant <= 0) return;

    try {
      const invoiceData = {
        projet_id: projetId,
        lien_facture: newInvoice.lien_facture,
        montant: newInvoice.montant,
        date_emission: newInvoice.date_emission,
        payée: newInvoice.payée,
        ...(newInvoice.date_paiement && { date_paiement: newInvoice.date_paiement })
      };

      const response = await nocodbService.createInvoice(invoiceData);
      const newInvoiceWithId = { ...response, id: response.Id || response.id };
      const updatedInvoices = [...invoices, newInvoiceWithId];
      setInvoices(updatedInvoices);
      
      // Seulement notifier le changement, pas de refresh auto
      if (onDataChange) {
        onDataChange();
      }
      setNewInvoice({
        lien_facture: '',
        montant: 0,
        date_emission: '',
        payée: false,
        date_paiement: ''
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Facture créée",
        description: "La facture a été ajoutée avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la facture",
        variant: "destructive"
      });
    }
  };

  // Modifier une facture
  const handleEditInvoice = async () => {
    if (!editingInvoice) return;

    try {
      const payload = {
        lien_facture: editingInvoice.lien_facture,
        montant: editingInvoice.montant,
        date_emission: editingInvoice.date_emission,
        payée: editingInvoice.payée,
        ...(editingInvoice.date_paiement ? { date_paiement: editingInvoice.date_paiement } : {})
      };

      await nocodbService.updateInvoice(editingInvoice.id, payload);
      
      const updatedInvoices = invoices.map(invoice =>
        invoice.id === editingInvoice.id ? { ...invoice, ...payload } : invoice
      );
      setInvoices(updatedInvoices);
      
      setEditingInvoice(null);
      setIsEditDialogOpen(false);
      
      // Notifier le changement si callback fourni
      if (onDataChange) {
        onDataChange();
      }
      
      toast({
        title: "Facture modifiée",
        description: "La facture a été mise à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification de la facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la facture",
        variant: "destructive"
      });
    }
  };

  // Supprimer une facture
  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await nocodbService.deleteInvoice(invoiceId);
      
      const updatedInvoices = invoices.filter(invoice => invoice.id !== invoiceId);
      setInvoices(updatedInvoices);
      
      // Notifier le changement si callback fourni
      if (onDataChange) {
        onDataChange();
      }
      toast({
        title: "Facture supprimée",
        description: "La facture a été supprimée avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la facture",
        variant: "destructive"
      });
    }
  };

  // Marquer comme payée
  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const invoiceToUpdate = invoices.find(invoice => invoice.id === invoiceId);
      if (!invoiceToUpdate) return;

      const payload = {
        payée: true,
        date_paiement: new Date().toISOString().split('T')[0]
      };

      await nocodbService.updateInvoice(invoiceId, payload);
      
      const updatedInvoices = invoices.map(invoice =>
        invoice.id === invoiceId ? { ...invoice, ...payload } : invoice
      );
      setInvoices(updatedInvoices);
      
      // Notifier le changement si callback fourni
      if (onDataChange) {
        onDataChange();
      }
      toast({
        title: "Facture payée",
        description: "La facture a été marquée comme payée"
      });
    } catch (error) {
      console.error('Erreur lors du marquage de la facture comme payée:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la facture comme payée",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (invoice: NocoInvoice) => {
    setEditingInvoice({ ...invoice });
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (paid: boolean) => {
    return paid ? 'default' : 'destructive';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-4">
      {!isClient && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Gestion des factures</h3>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle facture
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle facture</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="lien">Lien vers la facture *</Label>
                  <Input
                    id="lien"
                    value={newInvoice.lien_facture}
                    onChange={(e) => setNewInvoice({ ...newInvoice, lien_facture: e.target.value })}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="montant">Montant (€) *</Label>
                    <Input
                      id="montant"
                      type="number"
                      value={newInvoice.montant}
                      onChange={(e) => setNewInvoice({ ...newInvoice, montant: Number(e.target.value) })}
                      placeholder="750"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_emission">Date d'émission</Label>
                    <Input
                      id="date_emission"
                      type="date"
                      value={newInvoice.date_emission}
                      onChange={(e) => setNewInvoice({ ...newInvoice, date_emission: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={newInvoice.payée.toString()} onValueChange={(value) => setNewInvoice({ ...newInvoice, payée: value === 'true' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Non payée</SelectItem>
                        <SelectItem value="true">Payée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_paiement">Date de paiement</Label>
                    <Input
                      id="date_paiement"
                      type="date"
                      value={newInvoice.date_paiement}
                      onChange={(e) => setNewInvoice({ ...newInvoice, date_paiement: e.target.value })}
                      disabled={!newInvoice.payée}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateInvoice} disabled={!newInvoice.lien_facture.trim() || newInvoice.montant <= 0}>
                  Créer la facture
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="space-y-3">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Euro className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune facture pour le moment</p>
              {!isClient && (
                <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  Créer la première facture
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{Number(invoice.montant).toFixed(2).replace(/\.?0+$/, '')}€</h4>
                      <Badge variant={getStatusColor(invoice.payée)} className="text-xs">
                        {invoice.payée ? 'Payée' : 'Non payée'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                      {invoice.date_emission && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Émise le {formatDate(invoice.date_emission)}
                        </div>
                      )}
                      {invoice.payée && invoice.date_paiement && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Payée le {formatDate(invoice.date_paiement)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.open(invoice.lien_facture, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    
                    {!isClient && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(invoice)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer la facture</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    
                    {/* Bouton marquer payée pour les clients et admins si la facture n'est pas payée */}
                    {!invoice.payée && (
                      <Button size="sm" variant="default" onClick={() => handleMarkPaid(invoice.id)}>
                        Marquer payée
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de modification */}
      {editingInvoice && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifier la facture</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lien">Lien vers la facture *</Label>
                <Input
                  id="edit-lien"
                  value={editingInvoice.lien_facture}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, lien_facture: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-montant">Montant (€) *</Label>
                  <Input
                    id="edit-montant"
                    type="number"
                    value={editingInvoice.montant}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, montant: Number(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-date_emission">Date d'émission</Label>
                  <Input
                    id="edit-date_emission"
                    type="date"
                    value={editingInvoice.date_emission}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, date_emission: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editingInvoice.payée.toString()} onValueChange={(value) => setEditingInvoice({ ...editingInvoice, payée: value === 'true' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non payée</SelectItem>
                      <SelectItem value="true">Payée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-date_paiement">Date de paiement</Label>
                  <Input
                    id="edit-date_paiement"
                    type="date"
                    value={editingInvoice.date_paiement || ''}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, date_paiement: e.target.value })}
                    disabled={!editingInvoice.payée}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditInvoice}>
                Sauvegarder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default NocoInvoiceManager;