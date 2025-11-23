
import React from 'react';
import { Modal } from './Modal';
import { LoadingButton } from './LoadingButton';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isProcessing?: boolean;
  variant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isProcessing = false,
  variant = 'danger'
}) => {
  return (
    <Modal isOpen={isOpen} onClose={() => !isProcessing && onClose()} title={title}>
      <div className="space-y-4">
        <div className="text-gray-700">
          {message}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-800 text-sm font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <LoadingButton
            onClick={onConfirm}
            isLoading={isProcessing}
            variant={variant}
          >
            {confirmText}
          </LoadingButton>
        </div>
      </div>
    </Modal>
  );
};
