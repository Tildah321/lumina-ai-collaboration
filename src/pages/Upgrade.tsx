import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Users, Zap, Shield, Clock, ArrowRight } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useNavigate } from 'react-router-dom';

const Upgrade = () => {
  const { userPlan, planLimits } = usePlan();
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free',
      price: '0€',
      period: '/mois',
      description: 'Parfait pour débuter',
      current: userPlan?.plan_type === 'free',
      features: [
        '1 espace client actif',
        '20 tâches / jalons / factures par espace',
        '10 tokens IA / jour',
        'Accès au dashboard de base',
        'Partage d\'espace par lien + mot de passe',
        'Support par email (48h)'
      ],
      color: 'border-gray-200',
      buttonText: 'Plan actuel',
      disabled: true
    },
    {
      name: 'Pro',
      price: '9€',
      period: '/mois',
      description: 'Pour les professionnels',
      current: userPlan?.plan_type === 'pro',
      popular: true,
      features: [
        '15 espaces clients actifs',
        '150 tâches / jalons / factures par espace',
        '50 tokens IA / jour',
        'Dashboard avancé',
        'Onboarding simple client (formulaire + accès direct)',
        'Accès aux 3 assistants IA (Tasky, Pipou, Copyly)',
        'Gestion multi-clients',
        'Historique des actions',
        'Support prioritaire (24h)'
      ],
      color: 'border-primary',
      buttonText: userPlan?.plan_type === 'pro' ? 'Plan actuel' : 'Passer au Pro',
      disabled: userPlan?.plan_type === 'pro'
    }
  ];

  const handleUpgrade = () => {
    // TODO: Intégrer Stripe ici quand les liens seront fournis
    console.log('Upgrade to Pro');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <Crown className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Choisissez votre plan</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Débloquez tout le potentiel de votre plateforme avec nos plans flexibles adaptés à vos besoins.
        </p>
      </div>

      {/* Plan actuel */}
      {userPlan && (
        <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Plan {userPlan.plan_type === 'free' ? 'Gratuit' : 'Pro'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {userPlan.active_spaces_count}/{planLimits.maxActiveSpaces} espaces utilisés • 
                    {userPlan.ai_tokens_used_today}/{planLimits.maxAITokensPerDay} tokens IA utilisés aujourd'hui
                  </p>
                </div>
              </div>
              {userPlan.plan_type === 'free' && (
                <Button onClick={handleUpgrade} className="gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Passer au Pro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grille des plans */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative ${plan.color} ${plan.popular ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Le plus populaire
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                {plan.current && (
                  <Badge variant="secondary">Actuel</Badge>
                )}
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full mt-6" 
                variant={plan.current ? 'secondary' : 'default'}
                disabled={plan.disabled}
                onClick={plan.name === 'Pro' && !plan.current ? handleUpgrade : undefined}
              >
                {plan.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fonctionnalités détaillées */}
      <div className="mt-16 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Comparaison détaillée</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Zap className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">IA Avancée</h3>
              <p className="text-sm text-muted-foreground">
                Accès aux assistants Tasky, Pipou et Copyly pour automatiser vos tâches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Multi-clients</h3>
              <p className="text-sm text-muted-foreground">
                Gérez jusqu'à 15 espaces clients simultanément avec un onboarding simplifié
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Support prioritaire</h3>
              <p className="text-sm text-muted-foreground">
                Réponse garantie sous 24h pour les utilisateurs Pro
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ ou informations supplémentaires */}
      <div className="mt-16 text-center">
        <p className="text-muted-foreground mb-4">
          Des questions ? Nous sommes là pour vous aider.
        </p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Retour au tableau de bord
        </Button>
      </div>
    </div>
  );
};

export default Upgrade;