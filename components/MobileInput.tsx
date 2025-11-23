import React, { InputHTMLAttributes } from 'react';

interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  as?: 'input' | 'select';
  children?: React.ReactNode;
}

export const MobileInput: React.FC<MobileInputProps> = ({ 
  label, 
  error, 
  helperText, 
  as = 'input',
  className = '',
  children,
  ...props 
}) => {
  const baseClasses = `
    appearance-none 
    block 
    w-full 
    px-4 
    py-3 
    text-base 
    rounded-lg 
    border 
    bg-white dark:bg-gray-800 
    text-gray-900 dark:text-white 
    placeholder-gray-400 
    focus:outline-none 
    focus:ring-2 
    focus:ring-offset-0
    transition-shadow 
    duration-200
  `;

  const stateClasses = error 
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-800 dark:focus:ring-red-900/30' 
    : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-indigo-100 dark:focus:ring-indigo-900/30';

  return (
    <div className="mb-4">
      <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
        {label}
      </label>
      
      <div className="relative">
        {as === 'select' ? (
          <select
            className={`${baseClasses} ${stateClasses} ${className} pr-10`} // Extra padding for arrow
            {...(props as any)}
          >
            {children}
          </select>
        ) : (
          <input
            className={`${baseClasses} ${stateClasses} ${className}`}
            {...props}
          />
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center animate-fade-in ml-1">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 ml-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};