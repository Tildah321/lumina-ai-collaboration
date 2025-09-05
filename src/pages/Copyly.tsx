import { useState, useEffect } from 'react';
import { Instagram, Mail, Globe, Wand2, Copy, Check } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TONE_OPTIONS = [
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'amical', label: 'Amical' },
  { value: 'humoristique', label: 'Humoristique' },
  { value: 'inspirant', label: 'Inspirant' },
  { value: 'persuasif', label: 'Persuasif' },
  { value: 'informel', label: 'Informel' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'motivant', label: 'Motivant' },
  { value: 'neutre', label: 'Neutre' },
  { value: 'educatif', label: 'Éducatif' },
  { value: 'formel', label: 'Formel' },
  { value: 'creatif', label: 'Créatif' }
];

const Copyly = () => {
  const { hasFeatureAccess, upgradeRequired, loading } = usePlan();
  const navigate = useNavigate();

  // Vérifier l'accès aux assistants IA
  useEffect(() => {
    if (!loading && !hasFeatureAccess('hasAIAssistants')) {
      upgradeRequired();
      navigate('/dashboard');
    }
  }, [hasFeatureAccess, upgradeRequired, navigate, loading]);
  const [aiMessage, setAiMessage] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [socialForm, setSocialForm] = useState({
    topic: '',
    tone: 'professionnel',
    platform: 'instagram'
  });

  const [salesForm, setSalesForm] = useState({
    product: '',
    target: '',
    benefit: '',
    price: ''
  });

  const [emailForm, setEmailForm] = useState({
    subject: '',
    goal: '',
    audience: '',
    tone: 'professionnel'
  });

  const handleSocialGeneration = async () => {
    setIsGenerating(true);
    setAiMessage('🦉 Je réfléchis à du contenu engageant...');
    
    // Simulation génération IA
    setTimeout(() => {
      const content = `${socialForm.platform.toUpperCase()} - Ton ${socialForm.tone}\n\n🚀 ${socialForm.topic} : L'innovation au service de votre réussite !\n\n✨ Découvrez comment transformer vos idées en réalité avec nos solutions sur-mesure.\n\n💡 3 raisons de nous faire confiance :\n• Expertise technique reconnue\n• Accompagnement personnalisé\n• Résultats mesurables\n\nPrêt(e) à passer au niveau supérieur ?\n👉 DM pour en discuter !\n\n#innovation #digital #transformation #${socialForm.topic.toLowerCase()}`;

      setGeneratedContent(content);
      setAiMessage(`✅ Caption ${socialForm.platform} générée en style ${socialForm.tone}.`);
      setIsGenerating(false);
    }, 2000);
  };

  const handleSalesGeneration = async () => {
    setIsGenerating(true);
    setAiMessage('🦉 Création d\'une page de vente persuasive...');
    
    setTimeout(() => {
      const content = `# Transformez votre ${salesForm.product} en Succès Garanti !\n\n## 🎯 Pour ${salesForm.target} qui veulent ${salesForm.benefit}\n\n### Le Problème\nVous perdez du temps et de l'énergie avec des solutions inadaptées...\n\n### Notre Solution\n**${salesForm.product}** - La solution tout-en-un qui va révolutionner votre approche !\n\n### Les Bénéfices\n✅ ${salesForm.benefit} en quelques clics\n✅ Gain de temps immédiat\n✅ Résultats mesurables dès J+1\n✅ Support expert inclus\n\n### Témoignages\n"Grâce à cette solution, j'ai économisé 10h/semaine !" - Client satisfait\n\n### Offre Limitée\n🔥 **Prix spécial: ${salesForm.price || '99€'}**\n⏰ Plus que quelques places disponibles\n\n[**COMMANDER MAINTENANT**]\n\n*Garantie 30 jours satisfait ou remboursé*`;

      setGeneratedContent(content);
      setAiMessage('🎯 Page de vente créée ! Optimisée pour la conversion avec techniques de persuasion.');
      setIsGenerating(false);
    }, 2500);
  };

  const handleEmailGeneration = async () => {
    setIsGenerating(true);
    setAiMessage('🦉 Rédaction d\'une séquence email captivante...');
    
    setTimeout(() => {
      const content = `**Email 1 - Ouverture (${emailForm.tone})** 📧
Objet: ${emailForm.subject}

Bonjour [Prénom],

J'espère que vous allez bien ! Je me permets de vous contacter concernant ${emailForm.goal}.

[Contenu personnalisé selon votre audience...]

Cordialement,
[Signature]

---

**Email 2 - Relance (${emailForm.tone})** 📨
Objet: Re: ${emailForm.subject} - Information importante

Bonjour [Prénom],

Je reviens vers vous suite à mon email précédent...

[Séquence de relance...]

---

**Email 3 - Dernière chance (${emailForm.tone})** ⚡
Objet: [URGENT] ${emailForm.subject} - Dernière chance

Bonjour [Prénom],

C'est votre dernière chance de...

[Call-to-action final]`;
      
      setGeneratedContent(content);
      setAiMessage(`📧 Séquence email en style ${emailForm.tone} générée !`);
      setIsGenerating(false);
    }, 3000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-2xl">🦉</span>
            Copyly - Générateur de contenu IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Création de contenu marketing optimisé par intelligence artificielle
          </p>
        </div>
      </div>

      {aiMessage && (
        <div className="rounded-md bg-muted p-4 text-sm" data-testid="ai-message">
          {aiMessage}
        </div>
      )}

      <Tabs defaultValue="social" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="social" className="gap-2">
            <Instagram className="w-4 h-4" />
            Réseaux sociaux
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <Globe className="w-4 h-4" />
            Page de vente
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            Séquence email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="space-y-6">
          <Card className="glass-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-500" />
                Générateur de captions sociales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="topic">Sujet / Thème</Label>
                  <Input
                    id="topic"
                    value={socialForm.topic}
                    onChange={(e) => setSocialForm({ ...socialForm, topic: e.target.value })}
                    placeholder="Ex: Innovation digitale"
                  />
                </div>
                <div>
                  <Label htmlFor="platform">Plateforme</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={socialForm.platform}
                    onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="tone">Ton</Label>
                  <select
                    id="tone"
                    className="w-full p-2 border rounded-md bg-background"
                    value={socialForm.tone}
                    onChange={(e) => setSocialForm({ ...socialForm, tone: e.target.value })}
                  >
                    {TONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                onClick={handleSocialGeneration}
                disabled={isGenerating || !socialForm.topic}
                className="gap-2"
              >
                <Wand2 className="w-4 h-4" />
                {isGenerating ? 'Génération...' : 'Générer la caption'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

            <TabsContent value="sales" className="space-y-6">
              <Card className="glass-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    Générateur de page de vente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="product">Produit / Service</Label>
                    <Input
                      id="product"
                      value={salesForm.product}
                      onChange={(e) => setSalesForm({...salesForm, product: e.target.value})}
                      placeholder="Ex: Formation en ligne"
                    />
                  </div>
                  <div>
                    <Label htmlFor="target">Cible</Label>
                    <Input
                      id="target"
                      value={salesForm.target}
                      onChange={(e) => setSalesForm({...salesForm, target: e.target.value})}
                      placeholder="Ex: Entrepreneurs débutants"
                    />
                  </div>
                  <div>
                    <Label htmlFor="benefit">Bénéfice principal</Label>
                    <Input
                      id="benefit"
                      value={salesForm.benefit}
                      onChange={(e) => setSalesForm({...salesForm, benefit: e.target.value})}
                      placeholder="Ex: Doubler leur chiffre d'affaires"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Prix</Label>
                    <Input
                      id="price"
                      value={salesForm.price}
                      onChange={(e) => setSalesForm({ ...salesForm, price: e.target.value })}
                      placeholder="Ex: 99€"
                    />
                  </div>
                  <Button
                    onClick={handleSalesGeneration}
                    disabled={isGenerating || !salesForm.product}
                    className="gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    {isGenerating ? 'Génération...' : 'Générer la page'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-6">
              <Card className="glass-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-500" />
                    Générateur de séquence email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Sujet principal</Label>
                    <Input
                      id="subject"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                      placeholder="Ex: Votre projet digital"
                    />
                  </div>
                  <div>
                    <Label htmlFor="toneEmail">Ton</Label>
                    <select
                      id="toneEmail"
                      className="w-full p-2 border rounded-md bg-background"
                      value={emailForm.tone}
                      onChange={(e) => setEmailForm({ ...emailForm, tone: e.target.value })}
                    >
                      {TONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="goal">Objectif</Label>
                    <Input
                      id="goal"
                      value={emailForm.goal}
                      onChange={(e) => setEmailForm({...emailForm, goal: e.target.value})}
                      placeholder="Ex: Obtenir un rendez-vous"
                    />
                  </div>
                  <div>
                    <Label htmlFor="audience">Audience</Label>
                    <Input
                      id="audience"
                      value={emailForm.audience}
                      onChange={(e) => setEmailForm({...emailForm, audience: e.target.value})}
                      placeholder="Ex: Dirigeants de PME"
                    />
                  </div>
                  <Button 
                    onClick={handleEmailGeneration}
                    disabled={isGenerating || !emailForm.subject}
                    className="gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    {isGenerating ? 'Génération...' : 'Générer la séquence'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

      {generatedContent && (
        <Card className="glass-glow mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Contenu généré</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generatedContent}
              readOnly
              className="min-h-[400px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Copyly;