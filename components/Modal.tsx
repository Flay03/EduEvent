
import React, { useEffect, useRef } from 'react';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Swipe gesture for mobile dismiss
  const swipeHandlers = useSwipeGesture({
    onSwipeDown: onClose
  });

  // 1. Gerenciamento de Foco e Scroll do Body
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      
      setTimeout(() => {
          if (modalRef.current) {
              modalRef.current.focus();
          }
      }, 50);
    } else {
        document.body.style.overflow = 'unset';
        if (previousActiveElement.current) {
            previousActiveElement.current.focus();
        }
    }

    return () => {
        document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 2. Listener para tecla ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto sm:overflow-y-visible" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Container to center on desktop, align bottom on mobile */}
      <div className="flex items-end justify-center min-h-screen sm:min-h-full sm:pt-4 sm:px-4 sm:pb-20 text-center sm:block sm:p-0">
        
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity animate-fade-in" 
          aria-hidden="true" 
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal Panel */}
        <div 
            ref={modalRef}
            tabIndex={-1}
            className="
              inline-block align-bottom bg-white dark:bg-darkcard 
              rounded-t-2xl sm:rounded-lg 
              text-left overflow-hidden shadow-xl 
              transform transition-all 
              w-full sm:my-8 sm:align-middle sm:max-w-lg 
              animate-slide-in outline-none
              absolute bottom-0 sm:relative
              max-h-[90vh] sm:max-h-none flex flex-col
            "
            {...swipeHandlers}
        >
          {/* Mobile Handle Bar for Swipe indication */}
          <div className="sm:hidden w-full flex justify-center pt-3 pb-1" onClick={onClose}>
             <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>

          <div className="bg-white dark:bg-darkcard px-4 pt-2 pb-4 sm:p-6 sm:pb-4 flex-1 overflow-y-auto">
            <div className="sm:flex sm:items-start">
              <div className="mt-2 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                  {title}
                </h3>
                <div className="mt-4 text-gray-600 dark:text-gray-300">
                  {children}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100 dark:border-gray-700">
            <button 
                type="button" 
                className="w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-3 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm sm:py-2 transition-colors active:scale-[0.98]"
                onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
