import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseClasses = 'px-8 py-3 rounded-full font-bold text-lg shadow-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50';

  const variantClasses = {
    primary: 'bg-red-600 text-white hover:bg-red-700 hover:scale-105 focus:ring-red-300',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-gray-200',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;