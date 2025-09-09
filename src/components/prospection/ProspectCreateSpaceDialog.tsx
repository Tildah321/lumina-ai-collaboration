import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Prospect } from '@/types/prospect';
import nocodbService from '@/services/nocodbService';
import { useToast } from '@/hooks/use-toast';

interface ProspectCreateSpaceDialogProps {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const ProspectCreateSpaceDialog = ({ prospect, open, onOpenChange, onCreated }: ProspectCreateSpaceDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    email: '',
    description: '',
    statut: 'Nouveau',
  });

  useEffect(() => {
    if (prospect) {
      setForm({
        email: prospect.email || '',
        description: prospect.company || prospect.name || '',
        statut: 'Nouveau',
      });
    }
  }, [prospect]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleCreate = async () => {
    if (!form.email.trim()) return;
    try {
      const payload = {
        email: form.email.trim(),
        statut: form.statut,
        description: form.description.trim() || null,
        lien_portail: null,
        prix_payement: null,
        lien_payement: null,
        lien_whatsapp: null,
        cz787nu83e9bvlu: null,
        client_access_enabled: false,
        client_link_token: null,
        notes: JSON.stringify({
          created_by: 'admin',
          creation_date: new Date().toISOString(),
        }),
      };
      await nocodbService.createClient(payload);
      toast({ title: 'Espace créé', description: "L'espace client a été créé avec succès" });
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      console.error('Erreur création espace:', error);
      toast({ title: 'Erreur', description: "Impossible de créer l'espace client", variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Créer un espace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="space-email">Email du client *</Label>
            <Input
              id="space-email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="space-description">Description du projet</Label>
            <Textarea
              id="space-description"
              value={form.description}
              onChange={handleChange('description')}
            />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={form.statut} onValueChange={value => setForm({ ...form, statut: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nouveau">Nouveau</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Terminé">Terminé</SelectItem>
                <SelectItem value="En attente">En attente</SelectItem>
                <SelectItem value="Annulé">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!form.email.trim()}>
            Créer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProspectCreateSpaceDialog;
