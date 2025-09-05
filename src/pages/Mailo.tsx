import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '@/contexts/PlanContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Mail } from 'lucide-react';

const Mailo = () => {
  const { hasFeatureAccess, upgradeRequired, loading } = usePlan();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasFeatureAccess('hasAIAssistants')) {
      upgradeRequired();
      navigate('/dashboard');
    }
  }, [hasFeatureAccess, upgradeRequired, navigate, loading]);

  const [campaign, setCampaign] = useState({
    name: '',
    sender: '',
    dailyCap: '',
    startHour: '',
    endHour: ''
  });

  interface Step {
    subject: string;
    body: string;
    delay: number;
  }
  const [steps, setSteps] = useState<Step[]>([{ subject: '', body: '', delay: 0 }]);
  const [contactsText, setContactsText] = useState('');
  const [contacts, setContacts] = useState<string[][]>([]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContactsText(text);
      parseContacts(text);
    };
    reader.readAsText(file);
  };

  const parseContacts = (text: string) => {
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(','));
    setContacts(rows);
  };

  const addStep = () => setSteps([...steps, { subject: '', body: '', delay: 0 }]);
  const removeStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));
  const updateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    if (field === 'delay') {
      newSteps[index].delay = Number(value);
    } else {
      newSteps[index][field] = value;
    }
    setSteps(newSteps);
  };

  const handleLaunch = () => {
    console.log({
      campaign,
      steps,
      contacts: contacts.length ? contacts : contactsText
    });
  };

  const handleTest = () => {
    console.log('Test campaign', { campaign, steps, contacts: contacts.length ? contacts : contactsText });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Mail className="w-8 h-8 text-violet-600" />
          <h1 className="text-3xl font-bold">Mailo — Séquences cold email</h1>
        </div>
        <p className="text-muted-foreground">
          Crée, personnalise et automatise tes campagnes de prospection email.
        </p>
      </div>

      <Card>
        <CardHeader className="bg-violet-50">
          <CardTitle className="text-violet-700">Campagne</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 pt-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={campaign.name} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Expéditeur</Label>
            <Input value={campaign.sender} onChange={(e) => setCampaign({ ...campaign, sender: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Daily cap</Label>
            <Input type="number" value={campaign.dailyCap} onChange={(e) => setCampaign({ ...campaign, dailyCap: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Début</Label>
              <Input type="time" value={campaign.startHour} onChange={(e) => setCampaign({ ...campaign, startHour: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <Input type="time" value={campaign.endHour} onChange={(e) => setCampaign({ ...campaign, endHour: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-violet-50 flex justify-between items-center">
          <CardTitle className="text-violet-700">Étapes</CardTitle>
          <Button size="sm" variant="outline" onClick={addStep} className="gap-2">
            <Plus className="w-4 h-4" /> Ajouter une étape
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {steps.map((step, index) => (
            <div key={index} className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Step {index + 1}</h3>
                {steps.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => removeStep(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Sujet</Label>
                <Input value={step.subject} onChange={(e) => updateStep(index, 'subject', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Corps du mail</Label>
                <Textarea
                  value={step.body}
                  onChange={(e) => updateStep(index, 'body', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Délai (jours)</Label>
                <Input
                  type="number"
                  value={step.delay}
                  onChange={(e) => updateStep(index, 'delay', e.target.value)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-violet-50">
          <CardTitle className="text-violet-700">Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Input type="file" accept=".csv" onChange={handleFile} />
          <Textarea
            placeholder={"nom,email\\nJean Dupont,jean@example.com"}
            value={contactsText}
            onChange={(e) => {
              setContactsText(e.target.value);
              parseContacts(e.target.value);
            }}
            className="min-h-[150px]"
          />
          {contacts.length > 0 && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <tbody>
                  {contacts.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="p-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-violet-50">
          <CardTitle className="text-violet-700">Actions finales</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 pt-4">
          <Button className="gap-2" onClick={handleLaunch}>
            Armer la campagne 🚀
          </Button>
          <Button variant="secondary" onClick={handleTest}>
            Test d'envoi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Mailo;

