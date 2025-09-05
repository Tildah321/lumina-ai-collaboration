import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Crown,
  Zap,
  Users,
  Settings,
  Shield,
  ArrowRight,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Link as LinkIcon
} from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, changePassword } = useAuth();
  const { userPlan, planLimits, canCreateSpace, canUseAIToken, upgradeRequired } = usePlan();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || '',
    emailUpdates: true,
    darkMode: false,
    paymentLink: '',
    messageLink: '',
    meetingLink: ''
  });

  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const savedLinks = JSON.parse(localStorage.getItem('defaultLinks') || '{}');
    setFormData(prev => ({
      ...prev,
      paymentLink: savedLinks.paymentLink || '',
      messageLink: savedLinks.messageLink || '',
      meetingLink: savedLinks.meetingLink || ''
    }));
  }, []);

  const handleSave = () => {
    // TODO: Implement user profile update
    localStorage.setItem('defaultLinks', JSON.stringify({
      paymentLink: formData.paymentLink,
      messageLink: formData.messageLink,
      meetingLink: formData.meetingLink
    }));
    toast({
      title: "Profil mis à jour",
      description: "Vos modifications ont été enregistrées avec succès."
    });
    setIsEditing(false);
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Les mots de passe ne correspondent pas",
        description: "Veuillez confirmer votre nouveau mot de passe",
        variant: "destructive",
      });
      return;
    }
    const { error } = await changePassword(passwordData.newPassword);
    if (!error) {
      setIsPasswordEditing(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    }
  };

  const planUsage = [
    {
      label: 'Espaces clients actifs',
      current: userPlan?.active_spaces_count || 0,
      max: planLimits.maxActiveSpaces,
      icon: <Users className="w-4 h-4" />,
      color: 'text-blue-500'
    },
    {
      label: 'Tokens IA utilisés aujourd\'hui',
      current: userPlan?.ai_tokens_used_today || 0,
      max: planLimits.maxAITokensPerDay,
      icon: <Zap className="w-4 h-4" />,
      color: 'text-yellow-500'
    }
  ];

  const getUsageColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xl font-bold">
          {formData.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
        <div className="ml-auto">
          <Badge variant={userPlan?.plan_type === 'pro' ? 'default' : 'secondary'} className="gap-2">
            {userPlan?.plan_type === 'pro' && <Crown className="w-4 h-4" />}
            Plan {userPlan?.plan_type === 'free' ? 'Gratuit' : 'Pro'}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <CardTitle>Informations personnelles</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isEditing ? handleSave : () => setIsEditing(true)}
                  className="gap-2"
                >
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nom d'affichage</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Membre depuis</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(user?.created_at || '').toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
        </Card>

        {/* Liens par défaut */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              <CardTitle>Liens par défaut</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultMessageLink">Lien de contact</Label>
              <Input
                id="defaultMessageLink"
                placeholder="https://..."
                value={formData.messageLink}
                onChange={(e) => setFormData(prev => ({ ...prev, messageLink: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPaymentLink">Lien de paiement</Label>
              <Input
                id="defaultPaymentLink"
                placeholder="https://..."
                value={formData.paymentLink}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentLink: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultMeetingLink">Lien de rendez-vous</Label>
              <Input
                id="defaultMeetingLink"
                placeholder="https://..."
                value={formData.meetingLink}
                onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Préférences */}
        <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <CardTitle>Préférences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Emails de mise à jour</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir les newsletters et mises à jour produit
                  </p>
                </div>
                <Switch
                  checked={formData.emailUpdates}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emailUpdates: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sécurité */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <CardTitle>Sécurité</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPasswordEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handlePasswordUpdate}>Enregistrer</Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsPasswordEditing(false)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mot de passe</Label>
                    <p className="text-sm text-muted-foreground">
                      Dernière modification il y a plus de 30 jours
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsPasswordEditing(true)}>
                    Modifier
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Usage et Upgrade */}
        <div className="space-y-6">
          {/* Utilisation du plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Utilisation du plan</CardTitle>
              <CardDescription>
                Votre usage actuel du plan {userPlan?.plan_type === 'free' ? 'Gratuit' : 'Pro'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {planUsage.map((usage, index) => {
                const percentage = (usage.current / usage.max) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={usage.color}>{usage.icon}</span>
                        <span>{usage.label}</span>
                      </div>
                      <span className={getUsageColor(usage.current, usage.max)}>
                        {usage.current}/{usage.max}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    {percentage >= 90 && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        Limite presque atteinte
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Upgrade CTA */}
          {userPlan?.plan_type === 'free' && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Passez au Pro</CardTitle>
                </div>
                <CardDescription>
                  Débloquez toutes les fonctionnalités avancées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>15 espaces clients</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>150 éléments par espace</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>50 tokens IA / jour</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Assistants IA avancés</span>
                  </div>
                </div>
                <Button 
                  className="w-full gap-2" 
                  onClick={() => navigate('/upgrade')}
                >
                  <Crown className="w-4 h-4" />
                  Passer au Pro - 9€/mois
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Limitations actuelles */}
          {userPlan?.plan_type === 'free' && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Limitations actuelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {!canCreateSpace && (
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" />
                    <span>Limite d'espaces atteinte</span>
                  </div>
                )}
                {!canUseAIToken && (
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" />
                    <span>Tokens IA épuisés aujourd'hui</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500" />
                  <span>Assistants IA non disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500" />
                  <span>Dashboard de base uniquement</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="font-medium">Temps de réponse</p>
                <p className="text-muted-foreground">
                  {planLimits.supportResponseTime}
                </p>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <a
                  href="https://wa.me/33620945269"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contacter le support
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;