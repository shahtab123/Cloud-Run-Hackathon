import React from 'react';

interface CircuitBackgroundProps {
  children: React.ReactNode;
}

const CircuitBackground: React.FC<CircuitBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(239, 68, 68, 0.15) 19px, rgba(239, 68, 68, 0.15) 20px, transparent 20px, transparent 39px, rgba(239, 68, 68, 0.15) 39px, rgba(239, 68, 68, 0.15) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(239, 68, 68, 0.15) 19px, rgba(239, 68, 68, 0.15) 20px, transparent 20px, transparent 39px, rgba(239, 68, 68, 0.15) 39px, rgba(239, 68, 68, 0.15) 40px),
            radial-gradient(circle at 20px 20px, rgba(239, 68, 68, 0.18) 2px, transparent 2px),
            radial-gradient(circle at 40px 40px, rgba(239, 68, 68, 0.18) 2px, transparent 2px)
          `,
          backgroundSize: '40px 40px, 40px 40px, 40px 40px, 40px 40px',
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default CircuitBackground;