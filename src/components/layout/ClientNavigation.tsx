import { useState, useEffect } from 'react';
import { Bot, ChevronLeft, ChevronRight, Menu, ExternalLink, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { loadBranding, applyBranding } from '@/lib/branding';

interface ClientNavigationProps {
  spaceName?: string;
  spacePrice?: number;
  onSidebarChange?: (collapsed: boolean) => void;
}

const ClientNavigation = ({ spaceName, spacePrice, onSidebarChange }: ClientNavigationProps) => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const branding = loadBranding();

  useEffect(() => {
    applyBranding(branding);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const toggleSidebar = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onSidebarChange?.(newCollapsed);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Header */}
      <div className={cn('flex-shrink-0 border-b border-border/50', collapsed && !isMobile ? 'p-3' : 'p-6')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          {(!collapsed || isMobile) && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">{branding.brandName || 'Lumina'}</h1>
              <p className="text-sm text-muted-foreground">Espace Client</p>
            </div>
          )}
        </div>
      </div>

      {/* Projet Info */}
  {(!collapsed || isMobile) && spaceName && (
    <div className="px-6 py-4 bg-muted/30 border-b border-border/50">
      <div className="space-y-2">
        <h2 className="font-semibold text-lg truncate">{spaceName}</h2>
        {spacePrice && spacePrice > 0 && (
          <div className="text-2xl font-bold text-primary">{spacePrice}€</div>
        )}
        <p className="text-xs text-muted-foreground">Votre espace de collaboration</p>
      </div>
    </div>
  )}
  <div className="flex-1" />

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background">
        <div className={cn('space-y-2', collapsed && !isMobile ? 'p-2' : 'p-6 pt-4')}>
          {/* Découvrir */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = '/')}
            className={cn('w-full justify-start gap-3 text-muted-foreground', collapsed && !isMobile && 'justify-center px-2')}
          >
            <ExternalLink className="w-4 h-4" />
            {(!collapsed || isMobile) && `Découvrir ${branding.brandName || 'Lumina'}`}
          </Button>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={cn('w-full justify-start gap-3 text-muted-foreground', collapsed && !isMobile && 'justify-center')}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {(!collapsed || isMobile) && (isDark ? 'Mode clair' : 'Mode sombre')}
          </Button>

          {/* Bouton rétracter - uniquement sur desktop */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={cn('w-full justify-start gap-3 text-muted-foreground', collapsed && 'justify-center')}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!collapsed && 'Réduire'}
            </Button>
          )}
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
            <div>
              <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">{branding.brandName || 'Lumina'}</h1>
              {spaceName && (
                <p className="text-xs text-muted-foreground truncate max-w-32">{spaceName}</p>
              )}
            </div>
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
      'glass-glow border-r border-border/50 h-screen flex flex-col fixed left-0 top-0 z-40',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <SidebarContent />
    </nav>
  );
};

export default ClientNavigation;