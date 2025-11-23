
import React, { ButtonHTMLAttributes } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  children, 
  isLoading = false, 
  variant = 'primary', 
  className = '', 
  disabled,
  ...props 
}) => {
  
  const baseStyles = "relative inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "border-transparent text-white bg-primary hover:bg-indigo-700 focus:ring-primary",
    secondary: "border-transparent text-white bg-secondary hover:bg-emerald-700 focus:ring-secondary",
    danger: "border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
    outline: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-primary",
  };

  return (
    <button
      disabled={isLoading || disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className={isLoading ? "invisible" : ""}>{children}</span>
      
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
    </button>
  );
};
