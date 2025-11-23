import React, { useState, useEffect } from 'react';
import { SchoolEvent, Enrollment } from '../types';
import { storageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import { Modal } from '../components/Modal';

export const MyEnrollments: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<{enrollment: Enrollment, event: SchoolEvent, session: any}[]>([]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
      if (!user) return;
      const enrollments = await storageService.getEnrollmentsForUser(user.uid);
      // FIX: getEvents expects arguments and returns a paginated result.
      // We fetch a large number to simulate getting all events for this view.
      const eventsResult = await storageService.getEvents({ limit: 1000, filters: {} });
      
      // Join data
      const joined = enrollments.map(enr => {
          // FIX: Access the .data property of the paginated result.
          const evt = eventsResult.data.find(e => e.id === enr.eventId);
          if (!evt) return null;
          const sess = evt.sessions.find(s => s.id === enr.sessionId);
          if (!sess) return null;
          return { enrollment: enr, event: evt, session: sess };
      }).filter(Boolean) as any[];

      setData(joined);
  };

  useEffect(() => {
      loadData();
  }, [user]);

  const confirmCancel = async () => {
      if (cancelId) {
          setLoading(true);
          try {
            await storageService.cancelEnrollment(cancelId);
          } catch (e) {
            console.error(e);
          } finally {
            setCancelId(null);
            setLoading(false);
            loadData();
          }
      }
  };

  return (
      <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Minha Agenda</h1>
          
          {data.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                  Você ainda não se inscreveu em nenhum evento.
              </div>
          ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                      {data.map(({ enrollment, event, session }) => (
                          <li key={enrollment.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 gap-4">
                              <div>
                                  <h3 className="text-lg font-medium text-primary">{event.name}</h3>
                                  <div className="text-sm text-gray-700 mt-1">
                                      📅 {formatDate(session.date)} &nbsp; ⏰ {session.startTime} - {session.endTime}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">📍 {event.location}</div>
                              </div>
                              <div>
                                  <button 
                                    onClick={() => setCancelId(enrollment.id)}
                                    className="w-full sm:w-auto text-sm text-red-600 hover:text-red-800 border border-red-200 px-3 py-2 rounded hover:bg-red-50 transition flex justify-center"
                                  >
                                      Cancelar Inscrição
                                  </button>
                              </div>
                          </li>
                      ))}
                  </ul>
              </div>
          )}

          <Modal isOpen={!!cancelId} onClose={() => setCancelId(null)} title="Confirmar Cancelamento">
              <div className="space-y-4">
                  <p className="text-gray-700">
                      Tem certeza que deseja cancelar sua inscrição neste evento? A vaga será liberada para outro participante.
                  </p>
                  <div className="flex justify-end gap-3 mt-4">
                      <button 
                        onClick={() => setCancelId(null)}
                        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-800"
                      >
                          Manter Inscrição
                      </button>
                      <button 
                        onClick={confirmCancel}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-white font-bold"
                      >
                          {loading ? 'Processando...' : 'Sim, Cancelar'}
                      </button>
                  </div>
              </div>
          </Modal>
      </div>
  );
};
