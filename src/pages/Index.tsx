import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import { Bot, ArrowRight, CheckCircle, Sparkles, Users, BarChart3, MessageCircle, 
         Clock, Shield, Zap, Target, Calendar, FileText, PieChart, Monitor, 
         X, AlertTriangle, Smartphone, Mail, Instagram, FolderOpen,
         Layout, Kanban, Eye, Palette, Star, Lock, CreditCard, Heart,
         MapPin, Globe, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const [isHovered, setIsHovered] = useState(false);

  const problemPoints = [
    { icon: <Smartphone className="w-6 h-6" />, text: "Clients qui t'écrivent partout (WhatsApp, mails, insta DM...)" },
    { icon: <AlertTriangle className="w-6 h-6" />, text: "Deadlines perdues, documents introuvables" },
    { icon: <X className="w-6 h-6" />, text: "Tu passes pour amateur alors que tu bosses dur" }
  ];

  const assistants = [{
    name: "Tasky",
    role: "Chef de projet IA",
    description: "Organise tes tâches et deadlines",
    capabilities: [
      "Création automatique de tâches",
      "Estimation des délais",
      "Détection des blocages",
      "Suggestions d'optimisation"
    ],
    color: "from-blue-500/20 to-blue-600/30"
  }, {
    name: "Pipou",
    role: "Suivi pipeline",
    description: "Suit ton pipeline ventes/projets",
    capabilities: [
      "Analyse des retours clients",
      "Suggestions de communication",
      "Suivi de satisfaction",
      "Détection des opportunités"
    ],
    color: "from-green-500/20 to-green-600/30"
  }, {
    name: "Copyly",
    role: "Création contenu",
    description: "Rédige posts, mails, captions",
    capabilities: [
      "Rédaction de propositions",
      "Création d'emails",
      "Génération de rapports",
      "Adaptation du ton"
    ],
    color: "from-purple-500/20 to-purple-600/30"
  }];

  const tools = [
    { icon: <Kanban className="w-8 h-8" />, title: "Gestion de tâches", description: "Kanban, liste, calendrier" },
    { icon: <Bot className="w-8 h-8" />, title: "Chat IA intégré", description: "À chaque projet" },
    { icon: <Users className="w-8 h-8" />, title: "Portail collaboratif", description: "Prestataire + client" },
    { icon: <Palette className="w-8 h-8" />, title: "Branding simple", description: "Logo + couleurs" }
  ];

  const targetBenefits = [
    { title: "Freelances", benefit: "Paraître pro + fidéliser", icon: <Users className="w-6 h-6" /> },
    { title: "Agences", benefit: "Centraliser projets multi-clients", icon: <Layout className="w-6 h-6" /> },
    { title: "Consultants/coaches", benefit: "Délivrer sans perdre de temps", icon: <Clock className="w-6 h-6" /> }
  ];

  const pricing = [{
    name: "Gratuit",
    price: "0€",
    period: "/mois",
    description: "Parfait pour débuter",
    features: [
      "1 espace client",
      "10 tokens/jour",
      "Tasky uniquement"
    ]
  }, {
    name: "Starter",
    price: "9€",
    period: "/mois",
    description: "Pour se développer",
    features: [
      "10 espaces clients",
      "50 tokens/jour",
      "Tous les assistants IA"
    ]
  }, {
    name: "Pro",
    price: "29€",
    period: "/mois",
    description: "Pour les pros",
    features: [
      "Espaces illimités",
      "150 tokens/jour",
      "Tous les assistants IA"
    ],
    popular: true
  }];

  const testimonials = [
    { text: "Depuis Lumina, mes clients sont rassurés, tout est clair.", author: "Marie, Freelance Design" },
    { text: "Enfin un outil qui centralise tout sans complexité.", author: "Thomas, Agence Web" },
    { text: "Les assistants IA me font gagner 2h par jour.", author: "Sophie, Consultante" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-40 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
      <div className="absolute bottom-40 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-2xl animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-20 right-1/3 w-80 h-80 bg-purple-400/5 rounded-full blur-3xl animate-pulse animation-delay-3000"></div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="md" showText={true} />
          <div className="flex gap-2">
            <Link to="/client-access">
              <Button variant="outline" size="sm">
                Accès client
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero" size="sm">
                Se connecter <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in">
          Le portail client <span className="bg-gradient-primary bg-clip-text text-transparent">simple et intelligent</span><br />
          pour freelances & agences
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in animation-delay-200">
          Centralise tes projets, rassure tes clients et gagne du temps grâce à tes agents IA intégrés.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fade-in animation-delay-400">
          <Link to="/auth">
            <Button variant="hero" size="lg" className="w-full sm:w-auto hover-scale" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
              Créer mon portail gratuit
              <ArrowRight className={`w-5 h-5 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
            </Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mb-16 animate-fade-in animation-delay-500">
          Déjà testé par des freelances & agences en France
        </p>

        {/* Hero Visual */}
        <div className="relative max-w-4xl mx-auto animate-fade-in animation-delay-600">
          <Card className="glass-glow overflow-hidden hover:shadow-glow transition-all duration-500">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/20 border border-blue-500/20 hover-scale group cursor-pointer">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-pulse group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">Tasky</h3>
                  <p className="text-sm text-muted-foreground mb-2">Chef de projet IA</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/20 border border-green-500/20 hover-scale group cursor-pointer">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-green-500 animate-pulse group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">Pipou</h3>
                  <p className="text-sm text-muted-foreground mb-2">Suivi pipeline</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/20 border border-purple-500/20 hover-scale group cursor-pointer">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-purple-500 animate-pulse group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">Copyly</h3>
                  <p className="text-sm text-muted-foreground mb-2">Création contenu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2. Problème → Tension */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Gérer ses clients ne devrait pas ressembler à ça...
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Bordel à gauche */}
          <Card className="glass-glow p-8 border-destructive/20 animate-fade-in">
            <h3 className="text-xl font-semibold mb-6 text-destructive">Avant Lumina</h3>
            <div className="space-y-4">
              {problemPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="text-destructive mt-1">{point.icon}</div>
                  <p className="text-muted-foreground">{point.text}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Lumina clean à droite */}
          <Card className="glass-glow p-8 border-primary/20 animate-fade-in animation-delay-200">
            <h3 className="text-xl font-semibold mb-6 text-primary">Avec Lumina</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <CheckCircle className="w-6 h-6 text-primary mt-1" />
                <p>Tout centralisé dans un espace unique et professionnel</p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <CheckCircle className="w-6 h-6 text-primary mt-1" />
                <p>Suivi automatique et notifications intelligentes</p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <CheckCircle className="w-6 h-6 text-primary mt-1" />
                <p>Image professionnelle qui rassure et fidélise</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. Solution → Présentation Lumina */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Un espace simple, clair et boosté par l'IA
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Créez en quelques minutes un portail collaboratif qui impressionne vos clients
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="glass-glow p-6 text-center hover-scale animate-fade-in group">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 mx-auto text-white group-hover:scale-110 transition-transform">
              <Layout className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">1 espace par client</h3>
            <p className="text-sm text-muted-foreground">Organisation claire et professionnelle</p>
          </Card>
          
          <Card className="glass-glow p-6 text-center hover-scale animate-fade-in animation-delay-200 group">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 mx-auto text-white group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">Dashboard partagé</h3>
            <p className="text-sm text-muted-foreground">Tâches, livrables, deadlines</p>
          </Card>
          
          <Card className="glass-glow p-6 text-center hover-scale animate-fade-in animation-delay-400 group">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 mx-auto text-white group-hover:scale-110 transition-transform">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">Tout au même endroit</h3>
            <p className="text-sm text-muted-foreground">Factures, Drive, Loom intégrés</p>
          </Card>
          
          <Card className="glass-glow p-6 text-center hover-scale animate-fade-in animation-delay-600 group">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 mx-auto text-white group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">Agents IA intégrés</h3>
            <p className="text-sm text-muted-foreground">Tasky, Pipou, Copyly</p>
          </Card>
        </div>

        <div className="text-center mt-12 animate-fade-in animation-delay-800">
          <Link to="/auth">
            <Button variant="outline" size="lg" className="hover-scale">
              Tester gratuitement Lumina
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. Assistant IA principal - Tasky */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="mb-4 glass">
            <Sparkles className="w-4 h-4 mr-2" />
            Intelligence Artificielle
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            Ton assistant IA <span className="bg-gradient-primary bg-clip-text text-transparent">Tasky</span> qui t'aide au quotidien
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Un seul robot intelligent qui optimise ton travail quotidien
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="glass-glow hover:shadow-glow transition-all duration-300 hover-scale animate-fade-in overflow-hidden group">
            <div className="h-2 bg-gradient-to-r from-blue-500/20 to-blue-600/30"></div>
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/30 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                <Bot className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">Tasky</h3>
              <p className="text-lg text-muted-foreground mb-8">Ton assistant IA pour organiser tes tâches et deadlines</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">Planification automatique</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">Rappels personnalisés</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">Priorisation intelligente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5. Fonctionnalités clés */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Tout ce dont tu as besoin, rien de plus
          </h2>
          <p className="text-xl text-muted-foreground">
            Les fonctionnalités essentielles pour gérer tes projets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {tools.map((tool, index) => (
            <Card key={index} className={`glass-glow p-6 hover:shadow-glow transition-all duration-300 hover-scale animate-fade-in group`}
                  style={{animationDelay: `${index * 200}ms`}}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center text-white mb-4 mx-auto group-hover:scale-110 transition-transform">
                  {tool.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{tool.title}</h3>
                <p className="text-muted-foreground text-sm">{tool.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 animate-fade-in animation-delay-800">
          <Link to="/auth">
            <Button variant="hero" size="lg" className="hover-scale">
              Créer mon portail maintenant
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 6. Cible & bénéfices */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Pensé pour les freelances, consultants et <span className="bg-gradient-primary bg-clip-text text-transparent">petites agences</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {targetBenefits.map((target, index) => (
            <Card key={index} className={`glass-glow p-8 text-center hover:shadow-glow transition-all duration-300 hover-scale animate-fade-in group`}
                  style={{animationDelay: `${index * 200}ms`}}>
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white mb-6 mx-auto group-hover:scale-110 transition-transform">
                {target.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{target.title}</h3>
              <p className="text-muted-foreground">{target.benefit}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 7. Pricing simple & clair */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">Un prix qui s'adapte à ton business</h2>
          <p className="text-xl text-muted-foreground">Commence gratuit, évolue selon tes besoins</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {pricing.map((plan, index) => (
            <Card key={index} className={`glass-glow p-6 relative hover-scale transition-all duration-300 animate-fade-in ${plan.popular ? 'ring-2 ring-primary shadow-glow' : ''}`}
                  style={{animationDelay: `${index * 200}ms`}}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-primary animate-pulse">
                  Le plus populaire
                </Badge>
              )}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">{plan.description}</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button variant={plan.popular ? "hero" : "outline"} className="w-full hover-scale" size="sm">
                  Commencer
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* 8. Social Proof */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Ils ont testé <span className="bg-gradient-primary bg-clip-text text-transparent">Lumina</span> avant vous
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className={`glass-glow p-6 hover:shadow-glow transition-all duration-300 hover-scale animate-fade-in`}
                  style={{animationDelay: `${index * 200}ms`}}>
              <div className="flex items-start gap-3 mb-4">
                <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
              <p className="font-semibold text-sm">{testimonial.author}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 9. Garantie & sécurité */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Un SaaS pensé pour <span className="bg-gradient-primary bg-clip-text text-transparent">durer</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="glass-glow p-6 text-center hover-scale animate-fade-in">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Auth sécurisée</h3>
            <p className="text-sm text-muted-foreground">Powered by Supabase</p>
          </Card>
          
          <Card className="glass-glow p-6 text-center hover-scale animate-fade-in animation-delay-200">
            <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Données en Europe</h3>
            <p className="text-sm text-muted-foreground">Conformité RGPD</p>
          </Card>
          
          <Card className="glass-glow p-6 text-center hover-scale animate-fade-in animation-delay-400">
            <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Freemium sans CB</h3>
            <p className="text-sm text-muted-foreground">Teste sans engagement</p>
          </Card>
        </div>
      </section>

      {/* 10. Appel à l'action final */}
      <section className="container mx-auto px-4 py-20">
        <Card className="glass-glow p-12 text-center hover:shadow-glow transition-all duration-500 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Il est temps de gérer tes clients <span className="bg-gradient-primary bg-clip-text text-transparent">autrement</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Rejoins les freelances et agences qui impressionnent leurs clients avec Lumina
          </p>
          <Link to="/auth">
            <Button variant="hero" size="lg" className="hover-scale mb-6">
              Créer mon portail gratuit maintenant
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Aucun engagement</p>
            <p>✓ Pas besoin de carte bancaire</p>
            <p>✓ Tu peux upgrader si tu veux plus tard</p>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Lumina. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;