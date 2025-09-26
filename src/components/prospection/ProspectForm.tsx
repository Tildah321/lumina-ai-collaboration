import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export interface ProspectFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
}

interface ProspectFormProps {
  initialData?: ProspectFormData;
  onSubmit: (data: ProspectFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const ProspectForm = ({ initialData, onSubmit, onCancel, submitLabel = 'Enregistrer' }: ProspectFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProspectFormData>(
    initialData || { name: '', company: '', email: '', phone: '', website: '' }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof ProspectFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erreur de validation',
        description: 'Le nom est requis',
        variant: 'destructive'
      });
      return false;
    }
    if (!formData.company.trim()) {
      toast({
        title: 'Erreur de validation',
        description: 'L\'entreprise est requise',
        variant: 'destructive'
      });
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: 'Erreur de validation',
        description: 'L\'email n\'est pas valide',
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast({
        title: 'Succès',
        description: 'Prospect enregistré avec succès'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'enregistrement du prospect',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prospect-name">Nom *</Label>
        <Input 
          id="prospect-name" 
          value={formData.name} 
          onChange={handleChange('name')}
          placeholder="Nom du contact" 
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-company">Entreprise *</Label>
        <Input 
          id="prospect-company" 
          value={formData.company} 
          onChange={handleChange('company')}
          placeholder="Nom de l'entreprise" 
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-email">Email</Label>
        <Input 
          id="prospect-email" 
          type="email" 
          value={formData.email} 
          onChange={handleChange('email')}
          placeholder="email@exemple.com" 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-phone">Téléphone</Label>
        <Input 
          id="prospect-phone" 
          value={formData.phone} 
          onChange={handleChange('phone')}
          placeholder="0X XX XX XX XX" 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-website">Site web / Réseaux</Label>
        <Input 
          id="prospect-website" 
          value={formData.website} 
          onChange={handleChange('website')}
          placeholder="https://exemple.com" 
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>
    </div>
  );
};

export default ProspectForm;
