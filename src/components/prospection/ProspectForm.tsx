import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [formData, setFormData] = useState<ProspectFormData>(
    initialData || { name: '', company: '', email: '', phone: '', website: '' }
  );

  const handleChange = (field: keyof ProspectFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <Label htmlFor="prospect-name">Nom</Label>
        <Input id="prospect-name" value={formData.name} onChange={handleChange('name')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-company">Entreprise</Label>
        <Input id="prospect-company" value={formData.company} onChange={handleChange('company')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-email">Email</Label>
        <Input id="prospect-email" type="email" value={formData.email} onChange={handleChange('email')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-phone">Téléphone</Label>
        <Input id="prospect-phone" value={formData.phone} onChange={handleChange('phone')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-website">Réseaux / Site</Label>
        <Input id="prospect-website" value={formData.website} onChange={handleChange('website')} />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
};

export default ProspectForm;
