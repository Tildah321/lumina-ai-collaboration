import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Prospect } from '@/types/prospect';
import { useToast } from '@/hooks/use-toast';
import nocodbService from '@/services/nocodbService';

interface ProspectCreateSpaceDialogProps {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const ProspectCreateSpaceDialog = ({ prospect, open, onOpenChange, onCreated }: ProspectCreateSpaceDialogProps) => {
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    googleDriveLink: '',
    paymentAmount: '',
    paymentLink: '',
    messageLink: '',
    meetingLink: '',
  });

  // Prefill like Dashboard + use prospect data
  useEffect(() => {
    const savedLinks = JSON.parse(localStorage.getItem('defaultLinks') || '{}');
    setForm(f => ({
      ...f,
      paymentLink: savedLinks.paymentLink || '',
      messageLink: savedLinks.messageLink || '',
      meetingLink: savedLinks.meetingLink || ''
    }));
  }, [open]);

  useEffect(() => {
    if (prospect) {
      setForm(prev => ({
        ...prev,
        name: prospect.company || prospect.name || ''
      }));
    }
  }, [prospect]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;

    try {
      const payload: any = {
        description: form.name.trim(),
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

      // If we have the prospect email, add it too
      if (prospect?.email) {
        payload.email = prospect.email;
      }

      const response = await nocodbService.createClient(payload);

      toast({ title: 'Espace créé', description: "L'espace client a été créé avec succès" });
      onOpenChange(false);
      onCreated?.();
      return response;
    } catch (error) {
      console.error('Erreur création espace depuis prospect:', error);
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
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="googleDrive">Lien Portail / Drive (optionnel)</Label>
            <Input
              id="googleDrive"
              placeholder="https://drive.google.com/..."
              value={form.googleDriveLink}
              onChange={(e) => setForm({ ...form, googleDriveLink: e.target.value })}
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
                onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentLink">Lien de paiement</Label>
              <Input
                id="paymentLink"
                placeholder="https://stripe.com/payment/..."
                value={form.paymentLink}
                onChange={(e) => setForm({ ...form, paymentLink: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="messageLink">Lien Messages (optionnel)</Label>
            <Input
              id="messageLink"
              placeholder="https://slack.com/... ou https://discord.gg/..."
              value={form.messageLink}
              onChange={(e) => setForm({ ...form, messageLink: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meetingLink">Lien RDV (optionnel)</Label>
            <Input
              id="meetingLink"
              placeholder="https://calendly.com/..."
              value={form.meetingLink}
              onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleCreate} disabled={!form.name.trim()}>Créer l'espace</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProspectCreateSpaceDialog;
