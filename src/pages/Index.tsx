import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Bot, ArrowRight, CheckCircle, Sparkles, Users, BarChart3, MessageCircle, 
  Clock, Shield, Zap, Target, Calendar, FileText, PieChart, Monitor, 
  X, AlertTriangle, Smartphone, Mail, Instagram, FolderOpen,
  Globe, Star, Crown, Gift, Timer, UserCheck
} from 'lucide-react';

export default function Index() {
  const [isVisible, setIsVisible] = useState(false);
  const [shakeButton, setShakeButton] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // Shake animation after 4 seconds
    const timer = setTimeout(() => {
      setShakeButton(true);
      setTimeout(() => setShakeButton(false), 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Floating Background Glows */}
      <div className="floating-glow floating-glow-1"></div>
      <div className="floating-glow floating-glow-2"></div>
      <div className="floating-glow floating-glow-3"></div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="md" showText={true} />
          <div className="flex gap-2">
            <Link to="/client-access">
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Accès Client
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="glass" size="sm">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center">
        <div className={`container mx-auto max-w-4xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Badge className="mb-6 bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-medium">
            🚀 Beta Ouverte - Accès Anticipé
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent leading-tight">
            Le premier portail client vivant, assisté par l'IA
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
            Centralise toutes tes tâches, documents et suivis de projet. Tes agents IA (Tasky, Pipou & Copyly) t'aident à rester pro et à mieux collaborer avec tes clients.
          </p>
          
          <div className="space-y-4">
            <Link to="/auth">
              <Button 
                size="lg" 
                className={`pulse-glow glow-hover text-lg px-8 py-4 h-auto ${shakeButton ? 'shake' : ''}`}
              >
                🚀 Rejoins la Beta (-50% à vie)
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Gratuit pendant 14 jours • Sans engagement
            </p>
          </div>
        </div>
      </section>

      {/* Section Agents - Bento Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tes 3 agents IA toujours à tes côtés
            </h2>
            <p className="text-xl text-muted-foreground">
              Une équipe virtuelle qui transforme ta façon de travailler
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Tasky Card */}
            <Card className={`bento-card transition-all duration-500 animation-delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center text-3xl animate-bounce">
                  🗂
                </div>
                <CardTitle className="text-xl font-bold">Tasky</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Ton chef de projet IA – organise tâches et deadlines
                </p>
              </CardContent>
            </Card>

            {/* Pipou Card */}
            <Card className={`bento-card transition-all duration-500 animation-delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center text-3xl animate-bounce animation-delay-200">
                  🐶
                </div>
                <CardTitle className="text-xl font-bold">Pipou</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Ton assistant relationnel – factures, jalons, CRM simplifié
                </p>
              </CardContent>
            </Card>

            {/* Copyly Card */}
            <Card className={`bento-card transition-all duration-500 animation-delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center text-3xl animate-bounce animation-delay-400">
                  🦉
                </div>
                <CardTitle className="text-xl font-bold">Copyly</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Ton copywriter IA – mails, posts, scripts en un clic
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/auth">
              <Button variant="outline" size="lg" className="glow-hover">
                Découvre Lumina avec tes 3 agents IA
                <Sparkles className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section Beta Test */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/5 to-indigo/5">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-6 bg-gradient-primary text-primary-foreground px-4 py-2 text-lg font-medium pulse-glow">
            <Crown className="w-4 h-4 mr-2" />
            Early Adopter
          </Badge>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Deviens Early Adopter Lumina 🚀
          </h2>
          
          <div className="bento-card max-w-2xl mx-auto mb-8">
            <p className="text-lg mb-6">
              Rejoins les 15 premiers testeurs et profite de :
            </p>
            
            <div className="space-y-3 text-left mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full shimmer"></div>
                <span><strong className="text-primary">-50% à vie</strong> sur Starter ou Pro</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Accès gratuit à <strong>Lumina Insider</strong> (communauté + workshops)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Ton feedback influence le développement</span>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Starter Beta</h4>
                <div className="text-2xl font-bold text-primary">4,50€/mois</div>
                <div className="text-sm text-muted-foreground line-through">au lieu de 9€</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Pro Beta</h4>
                <div className="text-2xl font-bold text-primary">14,50€/mois</div>
                <div className="text-sm text-muted-foreground line-through">au lieu de 29€</div>
              </div>
            </div>
          </div>
          
          <Link to="/auth">
            <Button size="lg" className="glow-hover text-lg px-8 py-4 h-auto">
              👉 Je veux ma place Early Adopter
              <Gift className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tout ce dont tu as besoin, en un seul endroit
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Monitor, title: "Dashboard clair", desc: "Tâches, jalons, factures, revenus en un clin d'œil", delay: "200" },
              { icon: FolderOpen, title: "Espaces clients", desc: "Docs, paiements, RDV, messages centralisés", delay: "400" },
              { icon: Target, title: "Tasky", desc: "Organise et décompose tes projets en Kanban", delay: "600" },
              { icon: BarChart3, title: "Pipou", desc: "Suis tes clients et ton pipeline commercial", delay: "800" },
              { icon: FileText, title: "Copyly", desc: "Crée ton contenu marketing avec l'IA", delay: "1000" },
              { icon: Shield, title: "Sécurisé", desc: "Données chiffrées et conformes RGPD", delay: "1200" }
            ].map((feature, index) => (
              <Card key={index} className={`bento-card transition-all duration-500 animation-delay-${feature.delay} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <CardHeader className="text-center pb-4">
                  <feature.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section Proof (Avant/Après) */}
      <section className="py-16 px-4 bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Avant */}
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-6 text-destructive">Avant = chaos dispersé</h3>
              <div className="space-y-4 opacity-60 blur-sm transition-all duration-500 hover:blur-none hover:opacity-100">
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-destructive" />
                  <span>WhatsApp messages perdus</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <FolderOpen className="w-6 h-6 text-destructive" />
                  <span>Fichiers éparpillés</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                  <span>Deadlines oubliées</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <X className="w-6 h-6 text-destructive" />
                  <span>Suivi client approximatif</span>
                </div>
              </div>
            </div>

            {/* Après */}
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-6 text-primary">Après = 1 portail clair avec IA</h3>
              <div className="space-y-4 glow-primary">
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <span>Communication centralisée</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <span>Documents organisés</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <span>Rappels automatiques IA</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <span>Suivi client professionnel</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link to="/auth">
              <Button size="lg" className="glow-hover text-lg px-8 py-4 h-auto">
                🚀 Essaye Lumina en Beta (-50% à vie)
                <Sparkles className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section FAQ */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Questions fréquentes
            </h2>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bento-card">
              <AccordionTrigger className="text-left text-lg font-semibold">
                Mes clients doivent-ils payer ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Non, l'accès client est entièrement gratuit. Tes clients peuvent consulter leurs projets, documents et communiquer avec toi sans aucun frais.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bento-card">
              <AccordionTrigger className="text-left text-lg font-semibold">
                C'est compliqué à utiliser ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Pas du tout ! Lumina est conçu pour être intuitif. Tu peux commencer à travailler en moins de 5 minutes, et tes agents IA t'accompagnent à chaque étape.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="bento-card">
              <AccordionTrigger className="text-left text-lg font-semibold">
                Puis-je arrêter à tout moment ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Oui, absolument. Aucun engagement, tu peux annuler ton abonnement à tout moment. Tes données restent exportables pendant 30 jours après l'annulation.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex justify-center items-center gap-4 mb-8">
            <Logo size="sm" showText={true} />
            <div className="text-4xl animate-bounce">
              🐶
            </div>
          </div>
          
          <div className="mb-8">
            <Link to="/auth">
              <Button size="lg" className="glow-hover text-lg px-8 py-4 h-auto">
                🚀 Rejoins les 15 early adopters maintenant
                <Crown className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/auth" className="hover:text-primary transition-colors">
              Connexion
            </Link>
            <Link to="/client-access" className="hover:text-primary transition-colors">
              Accès Client
            </Link>
            <span>•</span>
            <span>© 2024 Lumina</span>
          </div>
        </div>
      </footer>
    </div>
  );
}