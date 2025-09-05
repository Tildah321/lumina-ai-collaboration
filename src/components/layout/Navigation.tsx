import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bot, CheckSquare, Users, Edit3, Moon, Sun, LogOut, ChevronLeft, ChevronRight, Menu, Crown, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { useIsMobile } from '@/hooks/use-mobile';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { userPlan, hasFeatureAccess, upgradeRequired, loading } = usePlan();
  const isMobile = useIsMobile();
  const [isDark, setIsDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Bot,
      description: 'Vue d\'ensemble'
    },
    {
      name: 'Tasky',
      href: '/tasky',
      icon: CheckSquare,
      description: 'Chef de projet IA',
      color: 'text-blue-500',
      requiresPro: true
    },
    {
      name: 'Pipou',
      href: '/pipou',
      icon: Users,
      description: 'Suivi client & projets',
      color: 'text-green-500',
      requiresPro: true
    },
    {
      name: 'Copyly',
      href: '/copyly',
      icon: Edit3,
      description: 'Générateur de contenu',
      color: 'text-purple-500',
      requiresPro: true
    }
  ];

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Header */}
      <div className={cn('flex-shrink-0', collapsed && !isMobile ? 'p-3' : 'p-6')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          {(!collapsed || isMobile) && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Lumina</h1>
              <p className="text-sm text-muted-foreground">Portail collaboratif IA</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn('space-y-2 pb-4', collapsed && !isMobile ? 'px-2' : 'px-6')}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            const isLocked = item.requiresPro && !hasFeatureAccess('hasAIAssistants');

            const handleClick = (e: React.MouseEvent) => {
              if (loading) {
                e.preventDefault();
                return;
              }
              if (isLocked) {
                e.preventDefault();
                upgradeRequired();
              } else if (isMobile) {
                setMobileOpen(false);
              }
            };
            
            return (
              <Link 
                key={item.href} 
                to={isLocked ? '#' : item.href} 
                onClick={handleClick}
                className={cn(isLocked && 'cursor-not-allowed')}
              >
                <div className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all duration-200 relative',
                  'hover:bg-accent/50 group',
                  isActive && 'bg-primary/10 border border-primary/20',
                  isLocked && 'opacity-50 hover:opacity-75'
                )}>
                  <div className="relative">
                    <Icon className={cn(
                      'w-5 h-5 transition-colors flex-shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                      item.color
                    )} />
                    {isLocked && (
                      <Lock className="w-3 h-3 absolute -top-1 -right-1 text-muted-foreground" />
                    )}
                  </div>
                  {(!collapsed || isMobile) && (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'font-medium text-sm transition-colors',
                          isActive ? 'text-primary' : 'text-foreground'
                        )}>
                          {item.name}
                        </div>
                        {isLocked && (
                          <Badge variant="secondary" className="text-xs">Pro</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
          
          {/* Bouton Upgrade si plan gratuit */}
          {userPlan?.plan_type === 'free' && (!collapsed || isMobile) && (
            <Link to="/upgrade" onClick={() => isMobile && setMobileOpen(false)}>
              <div className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:from-primary/20 hover:to-secondary/20 group">
                <Crown className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm text-primary">
                    Passer au Pro
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Débloquer toutes les fonctionnalités
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background">
        <div className={cn('space-y-2', collapsed && !isMobile ? 'p-2' : 'p-6 pt-4')}>
          {/* Bouton rétracter - uniquement sur desktop */}
          {!isMobile && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCollapsed(!collapsed)}
              className={cn('w-full justify-start gap-3 text-muted-foreground mb-2', collapsed && 'justify-center')}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!collapsed && 'Réduire'}
            </Button>
          )}

          {user && (!collapsed || isMobile) && (
            <div className="text-xs text-muted-foreground mb-2 px-3">
              Connecté en tant que:<br />
              <span className="font-medium">{user.email}</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className={cn('w-full justify-start gap-3 text-muted-foreground', collapsed && !isMobile && 'justify-center')}
          >
            <User className="w-4 h-4" />
            {(!collapsed || isMobile) && 'Mon profil'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={cn('w-full justify-start gap-3 text-muted-foreground', collapsed && !isMobile && 'justify-center')}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {(!collapsed || isMobile) && (isDark ? 'Mode clair' : 'Mode sombre')}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className={cn('w-full justify-start gap-3 text-muted-foreground hover:text-destructive', collapsed && !isMobile && 'justify-center')}
          >
            <LogOut className="w-4 h-4" />
            {(!collapsed || isMobile) && 'Se déconnecter'}
          </Button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">Lumina</h1>
          </div>
          
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <div className="flex flex-col h-full">
                <SidebarContent isMobile={true} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </>
    );
  }

  return (
    <nav className={cn(
      'glass-glow border-r border-border/50 h-full flex flex-col',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <SidebarContent />
    </nav>
  );
};

export default Navigation;