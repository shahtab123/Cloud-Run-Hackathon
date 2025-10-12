import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick, disabled = false, style }) => {
  const baseClasses = `
    bg-white border border-gray-200/80 rounded-2xl shadow-lg 
    transition-all duration-300 ease-in-out relative
  `;

  const interactiveClasses = disabled 
    ? 'opacity-60 cursor-not-allowed bg-gray-100'
    : 'hover:border-red-400/80 hover:shadow-xl hover:-translate-y-1 cursor-pointer';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default Card;