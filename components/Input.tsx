import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  const baseClasses = `
    w-full px-4 py-3 bg-white border border-gray-300 rounded-lg 
    text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 
    focus:ring-red-500 focus:border-transparent transition-all duration-300
  `;

  return (
    <input className={`${baseClasses} ${className}`} {...props} />
  );
};

export default Input;