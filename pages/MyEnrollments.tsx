import React, { useState, useEffect } from 'react';
import { SchoolEvent, Enrollment } from '../types';
import { storageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonListItem } from '../components/Skeletons';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

export const MyEnrollments: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState<{enrollment: Enrollment, event: SchoolEvent, session: any}[]>([]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const enrollments = await storageService.getEnrollmentsForUser(user.uid);
        if (enrollments.length === 0) {
            setData([]);
            setLoading(false);
            return;
        }

        const eventIds = [...new Set(enrollments.map(enr => enr.eventId))];
        const events = await storageService.getEventsByIds(eventIds);
        const eventsMap = new Map(events.map(e => [e.id, e]));

        const joined = enrollments.map(enr => {
            const evt = eventsMap.get(enr.eventId);
            if (!evt) return null;
            const sess = evt.sessions.find(s => s.id === enr.sessionId);
            if (!sess) return null;
            return { enrollment: enr, event: evt, session: sess };
        }).filter(Boolean) as any[];

        setData(joined);
      } catch (error) {
        console.error("Failed to load enrollments data:", error);
        addToast('error', 'Falha ao carregar inscrições.');
        setData([]);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
      loadData();
  }, [user]);

  const confirmCancel = async () => {
      if (cancelId) {
          setProcessing(true);
          try {
            await storageService.cancelEnrollment(cancelId);
            addToast('success', 'Inscrição cancelada com sucesso.');
          } catch (e) {
            console.error(e);
            addToast('error', 'Erro ao cancelar inscrição.');
          } finally {
            setCancelId(null);
            setProcessing(false);
            loadData();
          }
      }
  };
  
  const today = new Date().toISOString().split('T')[0];

  return (
      <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minha Agenda</h1>
          
          {loading ? (
              <div className="bg-white dark:bg-darkcard shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonListItem key={i} />)}
                </ul>
              </div>
          ) : data.length === 0 ? (
              <EmptyState
                title="Agenda Vazia"
                description="Você ainda não se inscreveu em nenhum evento."
              />
          ) : (
              <div className="bg-white dark:bg-darkcard shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.map(({ enrollment, event, session }) => {
                          const isPast = session.date < today;
                          
                          return (
                              <li key={enrollment.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 gap-4 transition-colors">
                                  <div>
                                      <h3 className="text-lg font-medium text-primary dark:text-indigo-400">{event.name}</h3>
                                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                          📅 {formatDate(session.date)} &nbsp; ⏰ {session.startTime} - {session.endTime}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">📍 {event.location}</div>
                                      {isPast && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 mt-2">
                                              Evento Finalizado
                                          </span>
                                      )}
                                  </div>
                                  <div>
                                      <button 
                                        onClick={() => setCancelId(enrollment.id)}
                                        disabled={isPast}
                                        className={`w-full sm:w-auto text-sm px-3 py-2 rounded transition flex justify-center border
                                            ${isPast 
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed' 
                                                : 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                      >
                                          {isPast ? 'Concluído' : 'Cancelar Inscrição'}
                                      </button>
                                  </div>
                              </li>
                          );
                      })}
                  </ul>
              </div>
          )}

          <ConfirmDialog 
            isOpen={!!cancelId}
            onClose={() => setCancelId(null)}
            onConfirm={confirmCancel}
            title="Cancelar Inscrição"
            message="Tem certeza que deseja cancelar sua inscrição neste evento? A vaga será liberada para outro participante."
            confirmText="Sim, Cancelar"
            cancelText="Manter Inscrição"
            isProcessing={processing}
          />
      </div>
  );
};