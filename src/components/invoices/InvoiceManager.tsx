import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, FileText, Download, Eye, Euro, Calendar, Send, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  date: string;
  dueDate: string;
  status: 'Brouillon' | 'Envoyée' | 'Payée' | 'En retard';
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  espace_id: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceManagerProps {
  spaceId: string;
  clientName?: string;
  clientEmail?: string;
  isClient?: boolean;
}

const InvoiceManager = ({ spaceId, clientName = '', clientEmail = '', isClient = false }: InvoiceManagerProps) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    clientName: clientName,
    clientEmail: clientEmail,
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    taxRate: 20,
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }] as Omit<InvoiceItem, 'id' | 'total'>[]
  });

  // Charger les factures depuis NocoDB
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const response = await nocodbService.getInvoices(spaceId);
        setInvoices(response.list || []);
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
  }, [spaceId, toast]);

  // Mettre à jour les données client
  useEffect(() => {
    setNewInvoice(prev => ({
      ...prev,
      clientName: clientName,
      clientEmail: clientEmail
    }));
  }, [clientName, clientEmail]);


  // Générer le numéro de facture
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const existingNumbers = invoices
      .map(inv => inv.number)
      .filter(num => num.startsWith(`${year}-`))
      .map(num => parseInt(num.split('-')[1]))
      .sort((a, b) => b - a);
    
    const nextNumber = existingNumbers.length > 0 ? existingNumbers[0] + 1 : 1;
    return `${year}-${nextNumber.toString().padStart(3, '0')}`;
  };

  // Calculer les totaux d'une ligne
  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  // Calculer les totaux de la facture
  const calculateInvoiceTotals = (items: Omit<InvoiceItem, 'id' | 'total'>[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item.quantity, item.unitPrice), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  // Ajouter une ligne
  const addInvoiceItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, unitPrice: 0 }]
    });
  };

  // Supprimer une ligne
  const removeInvoiceItem = (index: number) => {
    if (newInvoice.items.length > 1) {
      setNewInvoice({
        ...newInvoice,
        items: newInvoice.items.filter((_, i) => i !== index)
      });
    }
  };

  // Mettre à jour une ligne
  const updateInvoiceItem = (index: number, field: keyof Omit<InvoiceItem, 'id' | 'total'>, value: string | number) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  // Créer une facture
  const handleCreateInvoice = async () => {
    if (!newInvoice.clientName.trim() || !newInvoice.dueDate || newInvoice.items.length === 0) return;

    try {
      const { subtotal, taxAmount, total } = calculateInvoiceTotals(newInvoice.items, newInvoice.taxRate);
      
      const items: InvoiceItem[] = newInvoice.items.map((item, index) => ({
        id: `${Date.now()}-${index}`,
        ...item,
        total: calculateItemTotal(item.quantity, item.unitPrice)
      }));

      const invoiceData = {
        number: generateInvoiceNumber(),
        clientName: newInvoice.clientName,
        clientEmail: newInvoice.clientEmail,
        clientAddress: newInvoice.clientAddress,
        date: newInvoice.date,
        dueDate: newInvoice.dueDate,
        status: 'Brouillon',
        items: JSON.stringify(items),
        subtotal,
        taxRate: newInvoice.taxRate,
        taxAmount,
        total,
        notes: newInvoice.notes,
        espace_id: spaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await nocodbService.createInvoice(invoiceData);
      const newInvoiceWithItems = {
        ...response,
        items: typeof response.items === 'string' ? JSON.parse(response.items) : response.items
      };
      
      const updatedInvoices = [...invoices, newInvoiceWithItems];
      setInvoices(updatedInvoices);
      
      setNewInvoice({
        clientName: clientName,
        clientEmail: clientEmail,
        clientAddress: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        taxRate: 20,
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }]
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Facture créée",
        description: `Facture ${response.number} créée avec succès`
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

  // Supprimer une facture
  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await nocodbService.deleteInvoice(invoiceId);
      
      const updatedInvoices = invoices.filter(invoice => invoice.id !== invoiceId);
      setInvoices(updatedInvoices);
      
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

  // Changer le statut d'une facture
  const handleStatusChange = async (invoiceId: string, status: Invoice['status']) => {
    try {
      const invoiceToUpdate = invoices.find(invoice => invoice.id === invoiceId);
      if (!invoiceToUpdate) return;

      const updatedInvoiceData = {
        ...invoiceToUpdate,
        status,
        updatedAt: new Date().toISOString()
      };

      await nocodbService.updateInvoice(invoiceId, updatedInvoiceData);
      
      const updatedInvoices = invoices.map(invoice =>
        invoice.id === invoiceId ? updatedInvoiceData : invoice
      );
      setInvoices(updatedInvoices);
      
      toast({
        title: "Statut mis à jour",
        description: `La facture est maintenant "${status}"`
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  // Générer PDF (simulation)
  const handleGeneratePDF = (invoice: Invoice) => {
    toast({
      title: "PDF généré",
      description: `Facture ${invoice.number} exportée en PDF`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Brouillon': return 'outline';
      case 'Envoyée': return 'secondary';
      case 'Payée': return 'default';
      case 'En retard': return 'destructive';
      default: return 'outline';
    }
  };

  // Calculer les statistiques
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidAmount = invoices.filter(inv => inv.status === 'Payée').reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'Envoyée').reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalAmount.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground">Total facturé</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Euro className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{paidAmount.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground">Encaissé</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingAmount.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des factures */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Factures
            </CardTitle>
            {!isClient && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nouvelle facture
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer une nouvelle facture</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Informations client */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Nom du client *</Label>
                        <Input
                          id="clientName"
                          value={newInvoice.clientName}
                          onChange={(e) => setNewInvoice({ ...newInvoice, clientName: e.target.value })}
                          placeholder="Nom du client"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Email du client</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          value={newInvoice.clientEmail}
                          onChange={(e) => setNewInvoice({ ...newInvoice, clientEmail: e.target.value })}
                          placeholder="client@email.com"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="clientAddress">Adresse du client</Label>
                      <Textarea
                        id="clientAddress"
                        value={newInvoice.clientAddress}
                        onChange={(e) => setNewInvoice({ ...newInvoice, clientAddress: e.target.value })}
                        placeholder="Adresse complète du client"
                      />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date de la facture</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newInvoice.date}
                          onChange={(e) => setNewInvoice({ ...newInvoice, date: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Date d'échéance *</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={newInvoice.dueDate}
                          onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Lignes de facturation */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>Lignes de facturation</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem}>
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter une ligne
                        </Button>
                      </div>
                      
                      {newInvoice.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <Input
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              placeholder="Qté"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(index, 'quantity', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              placeholder="Prix unitaire"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateInvoiceItem(index, 'unitPrice', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium p-2 text-right">
                              {calculateItemTotal(item.quantity, item.unitPrice).toFixed(2)}€
                            </div>
                          </div>
                          <div className="col-span-1">
                            {newInvoice.items.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeInvoiceItem(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Calculs */}
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex justify-between">
                        <span>Sous-total:</span>
                        <span>{calculateInvoiceTotals(newInvoice.items, newInvoice.taxRate).subtotal.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span>TVA:</span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={newInvoice.taxRate}
                            onChange={(e) => setNewInvoice({ ...newInvoice, taxRate: Number(e.target.value) })}
                            className="w-20 h-8"
                          />
                          <span>%</span>
                        </div>
                        <span>{calculateInvoiceTotals(newInvoice.items, newInvoice.taxRate).taxAmount.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{calculateInvoiceTotals(newInvoice.items, newInvoice.taxRate).total.toFixed(2)}€</span>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newInvoice.notes}
                        onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                        placeholder="Notes ou conditions de paiement"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleCreateInvoice} 
                      disabled={!newInvoice.clientName.trim() || !newInvoice.dueDate}
                    >
                      Créer la facture
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune facture créée pour le moment</p>
              {!isClient && (
                <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  Créer la première facture
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">Facture {invoice.number}</h4>
                          <Badge variant={getStatusColor(invoice.status)} className="text-xs">
                            {invoice.status}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Client: {invoice.clientName}</p>
                          <p>Date: {new Date(invoice.date).toLocaleDateString('fr-FR')} • 
                             Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold">{invoice.total.toFixed(2)}€</p>
                        <p className="text-sm text-muted-foreground">{invoice.items.length} ligne(s)</p>
                      </div>
                      
                      {!isClient && (
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              const savedSpaces = localStorage.getItem('lumina_client_spaces');
                              if (savedSpaces) {
                                type Space = {
                                  id?: string | number;
                                  Id?: string | number;
                                  paymentLink?: string;
                                };
                                const spaces: Space[] = JSON.parse(savedSpaces);
                                const space = spaces.find(
                                  s => (s.id ?? s.Id)?.toString() === spaceId
                                );
                                if (space?.paymentLink) {
                                  window.open(space.paymentLink, '_blank');
                                } else {
                                  toast({
                                    title: "Lien de paiement manquant",
                                    description: "Configurez un lien de paiement dans les paramètres de l'espace",
                                    variant: "destructive"
                                  });
                                }
                              }
                            }}
                          >
                            <CreditCard className="w-3 h-3" />
                          </Button>
                          
                          <Select value={invoice.status} onValueChange={(value: Invoice['status']) => handleStatusChange(invoice.id, value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Brouillon">Brouillon</SelectItem>
                              <SelectItem value="Envoyée">Envoyée</SelectItem>
                              <SelectItem value="Payée">Payée</SelectItem>
                              <SelectItem value="En retard">En retard</SelectItem>
                            </SelectContent>
                          </Select>
                          
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
                                  Êtes-vous sûr de vouloir supprimer la facture {invoice.number} ? Cette action est irréversible.
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
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceManager;