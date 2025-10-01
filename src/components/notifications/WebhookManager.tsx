import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Webhook, Edit, Trash2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WebhookData {
  id?: string;
  name: string;
  description: string;
  endpoint_key: string;
  secret_token: string;
  is_active: boolean;
}

export const WebhookManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  const [newWebhook, setNewWebhook] = useState<WebhookData>({
    name: '',
    description: '',
    endpoint_key: '',
    secret_token: '',
    is_active: true
  });

  const generateEndpointKey = () => {
    return `wh_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const generateSecretToken = () => {
    return `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  useEffect(() => {
    loadWebhooks();
  }, [user]);

  const loadWebhooks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des webhooks:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les webhooks",
        variant: "destructive"
      });
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhook.name || !user) return;
    
    try {
      const webhookData = {
        ...newWebhook,
        user_id: user.id,
        endpoint_key: newWebhook.endpoint_key || generateEndpointKey(),
        secret_token: newWebhook.secret_token || generateSecretToken()
      };

      const { data, error } = await supabase
        .from('webhooks')
        .insert(webhookData)
        .select()
        .single();

      if (error) throw error;

      setWebhooks([data, ...webhooks]);
      setNewWebhook({
        name: '',
        description: '',
        endpoint_key: '',
        secret_token: '',
        is_active: true
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Webhook créé",
        description: "Le webhook a été créé avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la création du webhook:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le webhook",
        variant: "destructive"
      });
    }
  };

  const handleEditWebhook = async () => {
    if (!editingWebhook || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .update({
          name: editingWebhook.name,
          description: editingWebhook.description,
          secret_token: editingWebhook.secret_token,
          is_active: editingWebhook.is_active
        })
        .eq('id', editingWebhook.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setWebhooks(webhooks.map(wh => wh.id === editingWebhook.id ? data : wh));
      setEditingWebhook(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Webhook modifié",
        description: "Le webhook a été modifié avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la modification du webhook:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le webhook",
        variant: "destructive"
      });
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId)
        .eq('user_id', user.id);

      if (error) throw error;

      setWebhooks(webhooks.filter(wh => wh.id !== webhookId));
      toast({
        title: "Webhook supprimé",
        description: "Le webhook a été supprimé"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du webhook:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le webhook",
        variant: "destructive"
      });
    }
  };

  const getWebhookUrl = (endpointKey: string) => {
    return `https://fmowxizbfmfrcyyomzew.supabase.co/functions/v1/webhook-receiver?endpoint_key=${endpointKey}`;
  };

  const copyWebhookUrl = async (webhook: WebhookData) => {
    const url = getWebhookUrl(webhook.endpoint_key);
    const fullPayload = {
      url: url,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        endpoint_key: webhook.endpoint_key,
        secret_token: webhook.secret_token,
        title: "Exemple de notification",
        message: "Ceci est un message de test",
        data: {
          // Ajoutez ici les données personnalisées selon vos besoins
          event_type: "booking",
          timestamp: new Date().toISOString()
        }
      }
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(fullPayload, null, 2));
      setCopiedUrl(webhook.id!);
      setTimeout(() => setCopiedUrl(null), 2000);
      toast({
        title: "Configuration copiée",
        description: "La configuration complète du webhook a été copiée dans le presse-papiers"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier la configuration",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (webhook: WebhookData) => {
    setEditingWebhook({...webhook});
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            Configurez des webhooks pour recevoir des notifications depuis vos outils externes
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Créer un nouveau webhook</DialogTitle>
              <DialogDescription>
                Configurez un webhook pour recevoir des notifications depuis vos applications externes
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du webhook *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Calendly Bookings"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Notifications de réservation depuis Calendly"
                  value={newWebhook.description}
                  onChange={(e) => setNewWebhook({...newWebhook, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint_key">Clé d'endpoint (optionnel)</Label>
                <div className="flex gap-2">
                  <Input
                    id="endpoint_key"
                    placeholder="Généré automatiquement si vide"
                    value={newWebhook.endpoint_key}
                    onChange={(e) => setNewWebhook({...newWebhook, endpoint_key: e.target.value})}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewWebhook({...newWebhook, endpoint_key: generateEndpointKey()})}
                  >
                    Générer
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret_token">Token secret (optionnel)</Label>
                <div className="flex gap-2">
                  <Input
                    id="secret_token"
                    placeholder="Généré automatiquement si vide"
                    value={newWebhook.secret_token}
                    onChange={(e) => setNewWebhook({...newWebhook, secret_token: e.target.value})}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewWebhook({...newWebhook, secret_token: generateSecretToken()})}
                  >
                    Générer
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={newWebhook.is_active}
                  onCheckedChange={(checked) => setNewWebhook({...newWebhook, is_active: checked})}
                />
                <Label htmlFor="is_active">Webhook actif</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreateWebhook}
                disabled={!newWebhook.name}
              >
                Créer le webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {webhooks.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted/50 flex items-center justify-center">
            <Webhook className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucun webhook configuré</h3>
          <p className="text-muted-foreground mb-4">
            Créez votre premier webhook pour recevoir des notifications depuis vos outils externes
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Créer mon premier webhook
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{webhook.name}</CardTitle>
                      <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                        {webhook.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {webhook.description && (
                      <CardDescription>{webhook.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = getWebhookUrl(webhook.endpoint_key);
                        navigator.clipboard.writeText(url);
                        setCopiedUrl(webhook.id!);
                        setTimeout(() => setCopiedUrl(null), 2000);
                        toast({
                          title: "URL copiée",
                          description: "L'URL du webhook a été copiée dans le presse-papier"
                        });
                      }}
                      className="gap-2"
                    >
                      {copiedUrl === webhook.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      Copier URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(webhook)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le webhook</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer le webhook "{webhook.name}" ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteWebhook(webhook.id!)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endpoint Key:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{webhook.endpoint_key}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">URL:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{getWebhookUrl(webhook.endpoint_key)}</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le webhook</DialogTitle>
            <DialogDescription>
              Modifiez la configuration de votre webhook
            </DialogDescription>
          </DialogHeader>
          {editingWebhook && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nom du webhook *</Label>
                <Input
                  id="edit-name"
                  value={editingWebhook.name}
                  onChange={(e) => setEditingWebhook({...editingWebhook, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingWebhook.description}
                  onChange={(e) => setEditingWebhook({...editingWebhook, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-secret">Token secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-secret"
                    value={editingWebhook.secret_token}
                    onChange={(e) => setEditingWebhook({...editingWebhook, secret_token: e.target.value})}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingWebhook({...editingWebhook, secret_token: generateSecretToken()})}
                  >
                    Générer
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={editingWebhook.is_active}
                  onCheckedChange={(checked) => setEditingWebhook({...editingWebhook, is_active: checked})}
                />
                <Label htmlFor="edit-active">Webhook actif</Label>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditWebhook}>
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};