import React from 'react';
import { useLocation } from 'react-router-dom';
import CircuitBackground from './CircuitBackground';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/';
  const isNewProjectPage = location.pathname === '/new-project';
  const isProjectPage = location.pathname.startsWith('/project/');

  if (isWelcomePage) {
    // Welcome page handles its own layout entirely
    return <main className="min-h-screen w-full font-sans overflow-x-hidden">{children}</main>;
  }

  if (isNewProjectPage || isProjectPage) {
    return (
      <CircuitBackground>
        <main className="min-h-screen w-full font-sans overflow-x-hidden text-white">
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </CircuitBackground>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-800 font-sans overflow-x-hidden">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </main>
  );
};

export default Layout;