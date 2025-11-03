import { ReactNode } from 'react';
import Navigation from './Navigation';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Navigation />
      
      <main className={`flex-1 overflow-auto transition-all duration-300 ${isMobile ? 'pt-14' : ''}`}>
        <div className="container mx-auto py-6 px-4 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;