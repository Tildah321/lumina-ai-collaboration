import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ColdEmailLauncherProps {
  content: string;
}

const ColdEmailLauncher = ({ content }: ColdEmailLauncherProps) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [recipients, setRecipients] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');

  const handleSend = async () => {
    setSending(true);
    setStatus('Envoi en cours...');
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients
            .split(',')
            .map((email) => email.trim())
            .filter(Boolean),
          content,
        }),
      });
      setStatus('Séquence envoyée avec succès !');
    } catch (err) {
      setStatus("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="glass-glow mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-green-500" />
          Envoyer la séquence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="webhook">Webhook ActivePiece</Label>
          <Input
            id="webhook"
            placeholder="https://example.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="recipients">Destinataires (séparés par des virgules)</Label>
          <Input
            id="recipients"
            placeholder="email1@example.com, email2@example.com"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="content">Contenu</Label>
          <Textarea id="content" value={content} readOnly className="min-h-[200px]" />
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || !webhookUrl || !recipients}
          className="gap-2"
        >
          {sending ? 'Envoi...' : 'Envoyer'}
        </Button>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </CardContent>
    </Card>
  );
};

export default ColdEmailLauncher;

