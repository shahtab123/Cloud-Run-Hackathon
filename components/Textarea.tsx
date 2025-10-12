import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

const Textarea: React.FC<TextareaProps> = ({ className = '', ...props }) => {
  const baseClasses = `
    w-full px-4 py-3 bg-white border border-gray-300 rounded-lg 
    text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 
    focus:ring-red-500 focus:border-transparent transition-all duration-300
  `;

  return (
    <textarea className={`${baseClasses} ${className}`} {...props} />
  );
};

export default Textarea;
