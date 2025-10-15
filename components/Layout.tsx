import React from 'react';
import { useLocation } from 'react-router-dom';
import CircuitBackground from './CircuitBackground';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { pathname } = location;

  const isWelcomePage = pathname === '/';

  // The regex matches /project/some-id but not /project/some-id/anything-else
  const isProjectMainMenu = /^\/project\/[^/]+$/.test(pathname);

  if (isWelcomePage) {
    // Welcome page handles its own layout entirely
    return <main className="min-h-screen w-full font-sans overflow-x-hidden">{children}</main>;
  }

  if (pathname === '/new-project' || isProjectMainMenu) {
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

  const isSceneCreatorPage = pathname.endsWith('/scenes');

  // All other pages (editors, directory) get a simple white background.
  return (
    <main className="min-h-screen w-full bg-white text-gray-800 font-sans overflow-x-hidden">
      {isSceneCreatorPage ? (
        children // Scene creator handles its own container
      ) : (
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      )}
    </main>
  );
};

export default Layout;
