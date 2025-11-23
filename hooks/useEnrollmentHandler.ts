
import { useState, useCallback } from 'react';
import { User, SchoolEvent } from '../types';
import { storageService } from '../services/storage';
import { useToast } from '../components/Toast';
import { getUserFriendlyError } from '../utils/errorMessages';

interface ConflictData {
  name: string;
  time: string;
}

/**
 * Custom hook to handle enrollment actions (create and cancel).
 */
export const useEnrollmentHandler = (user: User | null, onActionSuccess: () => void) => {
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToast();

  const clearState = useCallback(() => {
    setConflictData(null);
  }, []);

  const handleEnroll = useCallback(async (event: SchoolEvent, sessionId: string) => {
    if (!user) return;
    clearState();
    setIsProcessing(true);

    try {
      await storageService.createEnrollment(user.uid, event.id, sessionId);
      addToast('success', `Inscrição confirmada em ${event.name}!`);
      setTimeout(() => onActionSuccess(), 500); 
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.startsWith('CONFLICT|')) {
        const [_, name, start, end] = msg.split('|');
        setConflictData({ name, time: `${start} - ${end}` });
        addToast('warning', 'Conflito de horário detectado.');
      } else {
        const friendlyMsg = getUserFriendlyError(error);
        addToast('error', friendlyMsg);
      }
    } finally {
        setIsProcessing(false);
    }
  }, [user, onActionSuccess, clearState, addToast]);

  const handleCancel = useCallback(async (enrollmentId: string) => {
      if (!user) return;
      setIsProcessing(true);
      try {
          await storageService.cancelEnrollment(enrollmentId);
          addToast('success', 'Inscrição cancelada com sucesso.');
          setTimeout(() => onActionSuccess(), 500);
      } catch (error: any) {
          addToast('error', 'Erro ao cancelar inscrição.');
          console.error(error);
      } finally {
          setIsProcessing(false);
      }
  }, [user, onActionSuccess, addToast]);

  return {
    handleEnroll,
    handleCancel,
    isProcessing, // Unified loading state
    isEnrolling: isProcessing, // Alias for backward compatibility
    conflictData,
    clearState,
  };
};
