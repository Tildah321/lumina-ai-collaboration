import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Prospect } from '@/types/prospect';

interface ProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
  onSubmit: (data: Partial<Prospect>) => Promise<void>;
  mode: 'create' | 'edit';
}

const STATUSES = ['Nouveau', 'En contact', 'En discussion', 'Proposition', 'Converti'];

export const ProspectDialog = ({ open, onOpenChange, prospect, onSubmit, mode }: ProspectDialogProps) => {
  const [formData, setFormData] = useState<Partial<Prospect>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    status: 'Nouveau',
    lastContact: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (prospect && mode === 'edit') {
      setFormData(prospect);
    } else {
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        website: '',
        status: 'Nouveau',
        lastContact: new Date().toISOString().split('T')[0]
      });
    }
    setErrors({});
  }, [prospect, mode, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.company?.trim()) {
      newErrors.company = 'L\'entreprise est requise';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof Prospect, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nouveau prospect' : 'Modifier le prospect'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Ajoutez un nouveau prospect à votre pipeline'
              : 'Modifiez les informations du prospect'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nom du contact"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-medium">
              Entreprise <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company"
              value={formData.company || ''}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="Nom de l'entreprise"
              className={errors.company ? 'border-destructive' : ''}
            />
            {errors.company && (
              <p className="text-xs text-destructive">{errors.company}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@exemple.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="0X XX XX XX XX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium">Site web / Réseaux</Label>
            <Input
              id="website"
              value={formData.website || ''}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://exemple.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">Statut</Label>
            <Select
              value={formData.status || 'Nouveau'}
              onValueChange={(value) => updateField('status', value)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastContact" className="text-sm font-medium">Dernier contact</Label>
            <Input
              id="lastContact"
              type="date"
              value={formData.lastContact || ''}
              onChange={(e) => updateField('lastContact', e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
