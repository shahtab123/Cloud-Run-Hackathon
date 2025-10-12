import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-800 font-sans overflow-x-hidden">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </main>
  );
};

export default Layout;