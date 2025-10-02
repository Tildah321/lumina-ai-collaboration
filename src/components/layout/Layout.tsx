import { ReactNode } from 'react';
import Navigation from './Navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Navigation />
      
      {/* Cloche de notification fixe en haut à droite */}
      <div className="fixed top-6 right-10 z-50">
        <NotificationBell />
      </div>
      
      <main className={`flex-1 overflow-auto transition-all duration-300 ${isMobile ? 'pt-14 p-4' : 'p-8'}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;