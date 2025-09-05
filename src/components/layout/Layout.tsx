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
      <main className={`flex-1 overflow-auto transition-all duration-300 ${isMobile ? 'pt-14 p-4' : 'p-8'}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;