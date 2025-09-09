import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';
import nocodbService from '@/services/nocodbService';

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<FormState>;
  onCreated?: (space: Record<string, unknown>) => void;
}

interface FormState {
  name: string;
  googleDriveLink: string;
  paymentAmount: string;
  paymentLink: string;
  messageLink: string;
  meetingLink: string;
}

const CreateSpaceDialog = ({ open, onOpenChange, initialValues, onCreated }: CreateSpaceDialogProps) => {
  const { toast } = useToast();
  const { canCreateSpace, upgradeRequired } = usePlan();

  const [form, setForm] = useState<FormState>({
    name: '',
    googleDriveLink: '',
    paymentAmount: '',
    paymentLink: '',
    messageLink: '',
    meetingLink: ''
  });

  useEffect(() => {
    if (open) {
      const savedLinks = JSON.parse(localStorage.getItem('defaultLinks') || '{}');
      setForm({
        name: initialValues?.name || '',
        googleDriveLink: initialValues?.googleDriveLink || '',
        paymentAmount: initialValues?.paymentAmount || '',
        paymentLink: initialValues?.paymentLink || savedLinks.paymentLink || '',
        messageLink: initialValues?.messageLink || savedLinks.messageLink || '',
        meetingLink: initialValues?.meetingLink || savedLinks.meetingLink || ''
      });
    }
  }, [open, initialValues]);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;

    if (!canCreateSpace) {
      upgradeRequired();
      return;
    }

    try {
      const spaceData = {
        description: form.name,
        statut: 'Nouveau',
        lien_portail: form.googleDriveLink || null,
        prix_payement: form.paymentAmount ? parseFloat(form.paymentAmount) : null,
        lien_payement: form.paymentLink || null,
        lien_whatsapp: form.messageLink || null,
        cc9tztuoagcmq8l: form.meetingLink || null,
        lien_rdv: form.meetingLink || null,
        client_access_enabled: false,
        client_link_token: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await nocodbService.createClient(spaceData);
      const newSpace = {
        ...response,
        id: response.Id || response.id,
        name: response.description || '',
        googleDriveLink: response.lien_portail || '',
        paymentLink: response.lien_payement || '',
        messageLink: response.lien_whatsapp || '',
        meetingLink: response.cc9tztuoagcmq8l || response.lien_rdv || '',
        paymentAmount: (response.prix_payement ?? 0).toString(),
        status: response.statut || 'Nouveau',
        projectsCount: 0,
        tasksCount: 0,
        lastActivity: 'Maintenant'
      };

      onCreated?.(newSpace);
      toast({ title: 'Espace créé', description: "L'espace client a été créé avec succès" });
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({ title: 'Erreur', description: "Impossible de créer l'espace client", variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer un nouvel espace client</DialogTitle>
          <DialogDescription>
            Configurez un portail collaboratif personnalisé pour votre client
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="spaceName">Nom de l'espace *</Label>
            <Input
              id="spaceName"
              placeholder="Ex: Projet Site Web StartupTech"
              value={form.name}
              onChange={handleChange('name')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="googleDrive">Lien Portail / Drive (optionnel)</Label>
            <Input
              id="googleDrive"
              placeholder="https://drive.google.com/..."
              value={form.googleDriveLink}
              onChange={handleChange('googleDriveLink')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Montant (€)</Label>
              <Input
                id="paymentAmount"
                type="number"
                placeholder="1500"
                value={form.paymentAmount}
                onChange={handleChange('paymentAmount')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentLink">Lien de paiement</Label>
              <Input
                id="paymentLink"
                placeholder="https://stripe.com/payment/..."
                value={form.paymentLink}
                onChange={handleChange('paymentLink')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="messageLink">Lien Messages (optionnel)</Label>
            <Input
              id="messageLink"
              placeholder="https://slack.com/... ou https://discord.gg/..."
              value={form.messageLink}
              onChange={handleChange('messageLink')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meetingLink">Lien RDV (optionnel)</Label>
            <Input
              id="meetingLink"
              placeholder="https://calendly.com/..."
              value={form.meetingLink}
              onChange={handleChange('meetingLink')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!form.name.trim()}>
            Créer l'espace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSpaceDialog;
